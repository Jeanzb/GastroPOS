import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  FiscalDocumentActionDto,
  FiscalDocumentDetailDto,
  FiscalDocumentListDto,
} from '@gastroai/contracts';
import type { Queue } from 'bullmq';
import { FiscalInvoiceStatus } from '../../../generated/prisma';
import type { Env } from '../../config/env.schema';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { AuditService } from '../audit/audit.service';
import type { ListFiscalDocumentsQueryDto } from './dto/list-fiscal-documents-query.dto';
import { FactusAdapter } from './factus/factus.adapter';
import { FactusConnectionService } from './factus/factus-connection.service';
import {
  buildFactusBillPayload,
  buildReferenceCode,
  extractFactusArtifact,
  parseFactusBillStatus,
} from './factus/factus.mapper';
import type { FactusBillPayload } from './factus/factus.types';
import { FactusProviderError } from './factus/factus.types';
import {
  DOWNLOAD_FISCAL_ARTIFACTS_JOB,
  FISCAL_QUEUE_NAME,
  ISSUE_FISCAL_DOCUMENT_JOB,
  SYNC_FACTUS_STATUS_JOB,
  type FiscalDocumentJobData,
} from './fiscal-jobs.constants';
import {
  toFiscalDocumentDetailDto,
  toFiscalDocumentDto,
  type FiscalProfileRecord,
} from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import type { FiscalActor } from './fiscal.types';
import {
  asJson,
  auditBase,
  getErrorMessage,
  invoiceNotFound,
  isAcceptedStatus,
  jobOptions,
  nextRetryDate,
  requireFiscalBranch,
} from './fiscal.utils';

@Injectable()
export class FiscalDocumentWorkflowService {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly auditService: AuditService,
    @InjectQueue(FISCAL_QUEUE_NAME)
    private readonly fiscalQueue: Queue<FiscalDocumentJobData>,
    private readonly factusAdapter: FactusAdapter,
    private readonly factusConnection: FactusConnectionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async listDocuments(
    actor: FiscalActor,
    query: ListFiscalDocumentsQueryDto,
  ): Promise<FiscalDocumentListDto> {
    const branchId = requireFiscalBranch(actor);
    const invoices = await this.repository.listInvoices({
      tenantId: actor.tenantId,
      branchId,
      status: query.status,
      take: query.take ?? 50,
      skip: query.skip ?? 0,
    });

    return { items: invoices.map(toFiscalDocumentDto) };
  }

  async getDocumentDetail(actor: FiscalActor, invoiceId: string): Promise<FiscalDocumentDetailDto> {
    const invoice = await this.repository.findInvoiceDetail(
      actor.tenantId,
      requireFiscalBranch(actor),
      invoiceId,
    );
    if (!invoice) {
      throw invoiceNotFound();
    }
    return toFiscalDocumentDetailDto(invoice);
  }

  async retryDocument(actor: FiscalActor, invoiceId: string): Promise<FiscalDocumentActionDto> {
    const document = await this.prepareAndQueueInvoice(actor, invoiceId, false);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'FISCAL_INVOICE_RETRY_REQUESTED',
      entityType: 'Invoice',
      entityId: invoiceId,
      after: asJson({ status: document.status, referenceCode: document.referenceCode }),
    });

    return {
      document,
      message: 'Documento fiscal encolado para envio.',
    };
  }

  async requestArtifactDownload(
    actor: FiscalActor,
    invoiceId: string,
  ): Promise<FiscalDocumentActionDto> {
    const branchId = requireFiscalBranch(actor);
    const invoice = await this.repository.findInvoiceForIssue(actor.tenantId, branchId, invoiceId);
    if (!invoice) {
      throw invoiceNotFound();
    }
    if (!invoice.factusNumber) {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'El numero fiscal es obligatorio antes de descargar evidencias.',
      });
    }

    await this.fiscalQueue.add(
      DOWNLOAD_FISCAL_ARTIFACTS_JOB,
      {
        tenantId: actor.tenantId,
        branchId,
        invoiceId,
        actorUserId: actor.actorUserId,
      },
      jobOptions(`${DOWNLOAD_FISCAL_ARTIFACTS_JOB}:${invoiceId}`),
    );

    return {
      document: toFiscalDocumentDto(invoice),
      message: 'Descarga de PDF/XML encolada.',
    };
  }

  async tryScheduleInvoiceIssue(actor: FiscalActor, invoiceId: string): Promise<void> {
    try {
      await this.prepareAndQueueInvoice(actor, invoiceId, true);
    } catch (error) {
      await this.auditService.tryRecord({
        ...auditBase(actor),
        action: 'FISCAL_INVOICE_AUTO_QUEUE_SKIPPED',
        entityType: 'Invoice',
        entityId: invoiceId,
        metadata: asJson({ message: getErrorMessage(error) }),
      });
    }
  }

  async processIssueJob(data: FiscalDocumentJobData): Promise<void> {
    if (!data.branchId) {
      return;
    }
    const invoice = await this.repository.findInvoiceForIssue(
      data.tenantId,
      data.branchId,
      data.invoiceId,
    );
    if (!invoice || isAcceptedStatus(invoice.status)) {
      return;
    }
    if (!invoice.fiscalProfile?.isReady) {
      await this.repository.markFailed({
        tenantId: data.tenantId,
        branchId: data.branchId,
        invoiceId: data.invoiceId,
        errorCode: 'FISCAL_PROFILE_NOT_READY',
        message: 'El perfil tributario no esta listo para emitir documentos.',
        retryable: false,
      });
      return;
    }

    const payload = invoice.providerPayload
      ? (invoice.providerPayload as unknown as FactusBillPayload)
      : buildFactusBillPayload(invoice);

    try {
      const runtime = await this.factusConnection.getRuntime(data.tenantId);
      const result = await this.factusAdapter.createAndValidateBill(runtime, payload);
      await this.repository.markSentToProvider({
        tenantId: data.tenantId,
        branchId: data.branchId,
        invoiceId: data.invoiceId,
        endpoint: result.endpoint,
        httpStatus: result.httpStatus,
        requestPayload: asJson(payload),
        responsePayload: asJson(result.payload),
      });

      const factusStatus = parseFactusBillStatus(result.payload);
      if (factusStatus.isAccepted) {
        await this.repository.markAccepted({
          tenantId: data.tenantId,
          branchId: data.branchId,
          invoiceId: data.invoiceId,
          factusId: factusStatus.factusId,
          factusNumber: factusStatus.number,
          cufe: factusStatus.cufe,
          cude: factusStatus.cude,
          qrUrl: factusStatus.qrUrl,
          publicUrl: factusStatus.publicUrl,
          validatedAt: factusStatus.validatedAt,
          responsePayload: asJson(result.payload),
        });

        await this.queueDownloadArtifacts(data, factusStatus.number);
        return;
      }

      if (factusStatus.isRejected) {
        await this.repository.markRejected({
          tenantId: data.tenantId,
          branchId: data.branchId,
          invoiceId: data.invoiceId,
          errorCode: 'FACTUS_REJECTED',
          responsePayload: asJson(result.payload),
        });
        return;
      }

      await this.fiscalQueue.add(SYNC_FACTUS_STATUS_JOB, data, {
        ...jobOptions(`${SYNC_FACTUS_STATUS_JOB}:${data.invoiceId}`),
        delay: 60_000,
      });
    } catch (error) {
      const providerAllowsRetry = !(error instanceof FactusProviderError) || error.isRetryable;
      const retryable = providerAllowsRetry && invoice.retryCount < 9;
      const nextRetryAt = retryable ? nextRetryDate(error, invoice.retryCount + 1) : null;
      await this.repository.markFailed({
        tenantId: data.tenantId,
        branchId: data.branchId,
        invoiceId: data.invoiceId,
        errorCode:
          error instanceof FactusProviderError
            ? `FACTUS_${error.httpStatus ?? 'NETWORK'}`
            : 'FACTUS_ERROR',
        message: getErrorMessage(error),
        responsePayload:
          error instanceof FactusProviderError && error.responsePayload !== undefined
            ? asJson(error.responsePayload)
            : undefined,
        nextRetryAt,
        retryable,
      });
      return;
    }
  }

  async processDownloadArtifactsJob(data: FiscalDocumentJobData): Promise<void> {
    if (!data.branchId) {
      return;
    }
    const invoice = await this.repository.findInvoiceForIssue(
      data.tenantId,
      data.branchId,
      data.invoiceId,
    );
    if (!invoice?.factusNumber) {
      return;
    }

    const runtime = await this.factusConnection.getRuntime(data.tenantId);
    const [pdf, xml, attachedXml] = await Promise.all([
      this.factusAdapter.downloadPdf(runtime, invoice.factusNumber),
      this.factusAdapter.downloadXml(runtime, invoice.factusNumber),
      this.factusAdapter.downloadAttachedDocumentXml(runtime, invoice.factusNumber),
    ]);
    const parsedPdf = extractFactusArtifact(pdf.payload, ['pdf_base_64_encoded', 'pdf_base64']);
    const parsedXml = extractFactusArtifact(xml.payload, ['xml_base_64_encoded', 'xml_base64']);
    const parsedAttachedXml = extractFactusArtifact(attachedXml.payload, [
      'xml_base_64_encoded',
      'attached_document_xml_base_64_encoded',
      'xml_base64',
    ]);

    await this.repository.updateArtifacts({
      tenantId: data.tenantId,
      branchId: data.branchId,
      invoiceId: data.invoiceId,
      pdfBase64: parsedPdf.base64,
      pdfFileName: parsedPdf.fileName,
      xmlBase64: parsedXml.base64,
      xmlFileName: parsedXml.fileName,
      attachedDocumentXmlBase64: parsedAttachedXml.base64,
      attachedDocumentXmlFileName: parsedAttachedXml.fileName,
      payload: asJson({
        pdf: pdf.payload,
        xml: xml.payload,
        attachedDocumentXml: attachedXml.payload,
      }),
    });
  }

  async processSyncStatusJob(data: FiscalDocumentJobData): Promise<void> {
    if (!data.branchId) {
      return;
    }
    const invoice = await this.repository.findInvoiceForIssue(
      data.tenantId,
      data.branchId,
      data.invoiceId,
    );
    if (!invoice?.factusNumber) {
      return;
    }

    const runtime = await this.factusConnection.getRuntime(data.tenantId);
    const result = await this.factusAdapter.getBill(runtime, invoice.factusNumber);
    const factusStatus = parseFactusBillStatus(result.payload);
    if (factusStatus.isAccepted) {
      await this.repository.markAccepted({
        tenantId: data.tenantId,
        branchId: data.branchId,
        invoiceId: data.invoiceId,
        factusId: factusStatus.factusId,
        factusNumber: factusStatus.number ?? invoice.factusNumber,
        cufe: factusStatus.cufe,
        cude: factusStatus.cude,
        qrUrl: factusStatus.qrUrl,
        publicUrl: factusStatus.publicUrl,
        validatedAt: factusStatus.validatedAt,
        responsePayload: asJson(result.payload),
      });
      await this.queueDownloadArtifacts(data, factusStatus.number ?? invoice.factusNumber);
    }
  }

  private async prepareAndQueueInvoice(actor: FiscalActor, invoiceId: string, automatic: boolean) {
    const branchId = requireFiscalBranch(actor);
    const invoice = await this.repository.findInvoiceForIssue(actor.tenantId, branchId, invoiceId);
    if (!invoice) {
      throw invoiceNotFound();
    }
    if (isAcceptedStatus(invoice.status)) {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'Accepted fiscal documents cannot be retried or modified.',
      });
    }
    const inFlightStatuses = new Set<FiscalInvoiceStatus>([
      FiscalInvoiceStatus.PENDING_VALIDATION,
      FiscalInvoiceStatus.SENT_TO_PROVIDER,
    ]);
    if (inFlightStatuses.has(invoice.status)) {
      return toFiscalDocumentDto(invoice);
    }

    const branchConfig = await this.factusConnection.getBranchConfiguration(
      actor.tenantId,
      branchId,
    );
    assertReadyForIssue(invoice.fiscalProfile, branchConfig, automatic);
    const payload = buildFactusBillPayload({
      ...invoice,
      numberingRangeId: invoice.numberingRangeId ?? branchConfig!.invoiceNumberingRangeId,
    });
    const numberingRangeId = payload.numbering_range_id;
    const referenceCode = payload.reference_code ?? buildReferenceCode(invoice);
    const ready = await this.repository.markInvoiceReady({
      tenantId: actor.tenantId,
      branchId,
      invoiceId,
      referenceCode,
      numberingRangeId,
      providerPayload: asJson(payload),
      actorUserId: actor.actorUserId,
    });
    if (!ready) {
      throw invoiceNotFound();
    }

    await this.repository.markPendingValidation({
      tenantId: actor.tenantId,
      branchId,
      invoiceId,
      actorUserId: actor.actorUserId,
    });

    if (this.config.get('FISCAL_QUEUE_ENABLED', { infer: true })) {
      await this.fiscalQueue.add(
        ISSUE_FISCAL_DOCUMENT_JOB,
        {
          tenantId: actor.tenantId,
          branchId,
          invoiceId,
          actorUserId: actor.actorUserId,
        },
        jobOptions(`${ISSUE_FISCAL_DOCUMENT_JOB}:${invoiceId}:${referenceCode}`),
      );
    }

    return toFiscalDocumentDto(ready);
  }

  private async queueDownloadArtifacts(
    data: FiscalDocumentJobData,
    factusNumber: string | null,
  ): Promise<void> {
    if (!factusNumber || !this.config.get('FISCAL_QUEUE_ENABLED', { infer: true })) {
      return;
    }
    await this.fiscalQueue.add(
      DOWNLOAD_FISCAL_ARTIFACTS_JOB,
      data,
      jobOptions(`${DOWNLOAD_FISCAL_ARTIFACTS_JOB}:${data.invoiceId}:${factusNumber}`),
    );
  }
}

function assertReadyForIssue(
  profile: FiscalProfileRecord | null,
  branchConfig: Awaited<ReturnType<FactusConnectionService['getBranchConfiguration']>>,
  automatic: boolean,
): void {
  if (!profile?.isReady) {
    throw new ApplicationException(409, {
      code: 'FISCAL_PROFILE_NOT_READY',
      message: automatic
        ? 'El perfil tributario no esta listo; se omitio la emision automatica.'
        : 'El perfil tributario no esta listo para emitir documentos.',
    });
  }
  if (!branchConfig?.isEnabled || !branchConfig.invoiceNumberingRangeId) {
    throw new ApplicationException(409, {
      code: 'FISCAL_NUMBERING_RANGE_REQUIRED',
      message: 'La sede activa requiere un rango de factura autorizado antes de emitir documentos.',
    });
  }
}
