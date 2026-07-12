import { createHash } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FiscalCreditNoteActionDto } from '@gastroai/contracts';
import type { Queue } from 'bullmq';
import { FiscalInvoiceStatus } from '../../../generated/prisma';
import type { Env } from '../../config/env.schema';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { AuditService } from '../audit/audit.service';
import { buildCreditNoteDraft } from './credit-note.policy';
import { CreditNoteRepository } from './credit-note.repository';
import type { CreditNoteRecord } from './credit-note.types';
import type { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { FactusAdapter } from './factus/factus.adapter';
import { FactusConnectionService } from './factus/factus-connection.service';
import { buildFactusCreditNotePayload, parseFactusBillStatus } from './factus/factus.mapper';
import { FactusProviderError } from './factus/factus.types';
import { toFiscalCreditNoteDto } from './fiscal.mapper';
import {
  FISCAL_QUEUE_NAME,
  ISSUE_CREDIT_NOTE_JOB,
  type CreditNoteJobData,
} from './fiscal-jobs.constants';
import type { FiscalActor } from './fiscal.types';
import {
  asJson,
  auditBase,
  getErrorMessage,
  jobOptions,
  nextRetryDate,
  requireFiscalBranch,
} from './fiscal.utils';

@Injectable()
export class CreditNoteWorkflowService {
  constructor(
    private readonly repository: CreditNoteRepository,
    private readonly auditService: AuditService,
    @InjectQueue(FISCAL_QUEUE_NAME)
    private readonly fiscalQueue: Queue<CreditNoteJobData>,
    private readonly factusAdapter: FactusAdapter,
    private readonly factusConnection: FactusConnectionService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async createCreditNote(
    actor: FiscalActor,
    invoiceId: string,
    dto: CreateCreditNoteDto,
  ): Promise<FiscalCreditNoteActionDto> {
    const referenceCode = buildCreditNoteReference(actor.tenantId, invoiceId, dto.idempotencyKey);
    const branchId = requireFiscalBranch(actor);
    const branchConfig = await this.factusConnection.getBranchConfiguration(actor.tenantId, branchId);
    if (!branchConfig?.isEnabled || !branchConfig.creditNoteNumberingRangeId) {
      throw new ApplicationException(409, {
        code: 'CREDIT_NOTE_NUMBERING_RANGE_REQUIRED',
        message: 'La sede activa requiere un rango autorizado de notas credito.',
      });
    }
    const result = await this.repository.createDraft({
      tenantId: actor.tenantId,
      branchId,
      invoiceId,
      referenceCode,
      actorUserId: actor.actorUserId,
      createDraft: (source) =>
        buildCreditNoteDraft({
          source,
          dto,
          referenceCode,
          numberingRangeId: branchConfig.creditNoteNumberingRangeId ?? undefined,
        }),
    });
    if (!result) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Fiscal document was not found.',
      });
    }

    let creditNote = result.creditNote;
    if (result.wasCreated) {
      await this.auditService.tryRecord({
        ...auditBase(actor),
        action: 'FISCAL_CREDIT_NOTE_CREATED',
        entityType: 'CreditNote',
        entityId: creditNote.id,
        after: asJson({
          originalInvoiceId: invoiceId,
          referenceCode: creditNote.referenceCode,
          correctionConceptCode: creditNote.correctionConceptCode,
          amount: creditNote.amount,
        }),
      });
      creditNote = await this.queueCreditNote(actor, creditNote);
    }

    return {
      creditNote: toFiscalCreditNoteDto(creditNote),
      message: result.wasCreated
        ? 'Nota credito encolada para validacion fiscal.'
        : 'La nota credito ya existe para esta solicitud y conserva su referencia fiscal.',
    };
  }

  async processIssueJob(data: CreditNoteJobData): Promise<void> {
    if (!data.branchId) {
      return;
    }
    const creditNote = await this.repository.findCreditNoteForIssue(
      data.tenantId,
      data.branchId,
      data.creditNoteId,
    );
    if (!creditNote || isFinalCreditNoteStatus(creditNote.status)) {
      return;
    }
    if (!creditNote.originalInvoice.fiscalProfile?.isReady) {
      await this.repository.markFailed({
        tenantId: data.tenantId,
        branchId: data.branchId,
        creditNoteId: data.creditNoteId,
        errorCode: 'FISCAL_PROFILE_NOT_READY',
        message: 'El perfil tributario no esta listo para emitir notas credito.',
      });
      return;
    }

    const payload = buildFactusCreditNotePayload(creditNote);
    try {
      const runtime = await this.factusConnection.getRuntime(data.tenantId);
      const result = await this.factusAdapter.createAndValidateCreditNote(runtime, payload);
      await this.repository.markSentToProvider({
        tenantId: data.tenantId,
        branchId: data.branchId,
        creditNoteId: data.creditNoteId,
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
          creditNoteId: data.creditNoteId,
          factusId: factusStatus.factusId,
          factusNumber: factusStatus.number,
          cude: factusStatus.cude ?? factusStatus.cufe,
          qrUrl: factusStatus.qrUrl,
          publicUrl: factusStatus.publicUrl,
          validatedAt: factusStatus.validatedAt,
          responsePayload: asJson(result.payload),
        });
        return;
      }
      if (factusStatus.isRejected) {
        await this.repository.markRejected({
          tenantId: data.tenantId,
          branchId: data.branchId,
          creditNoteId: data.creditNoteId,
          errorCode: 'FACTUS_REJECTED',
          responsePayload: asJson(result.payload),
        });
      }
    } catch (error) {
      const nextRetryAt = nextRetryDate(error);
      await this.repository.markFailed({
        tenantId: data.tenantId,
        branchId: data.branchId,
        creditNoteId: data.creditNoteId,
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
      });
      if (error instanceof FactusProviderError && !error.isRetryable) {
        return;
      }
      throw error;
    }
  }

  private async queueCreditNote(
    actor: FiscalActor,
    creditNote: CreditNoteRecord,
  ): Promise<CreditNoteRecord> {
    if (
      creditNote.status !== FiscalInvoiceStatus.DRAFT &&
      creditNote.status !== FiscalInvoiceStatus.FAILED
    ) {
      return creditNote;
    }
    const pending = await this.repository.markPendingValidation({
      tenantId: actor.tenantId,
      branchId: requireFiscalBranch(actor),
      creditNoteId: creditNote.id,
      actorUserId: actor.actorUserId,
    });
    if (!pending) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Credit note was not found.',
      });
    }
    if (this.config.get('FISCAL_QUEUE_ENABLED', { infer: true })) {
      await this.fiscalQueue.add(
        ISSUE_CREDIT_NOTE_JOB,
        {
          tenantId: actor.tenantId,
          branchId: requireFiscalBranch(actor),
          creditNoteId: pending.id,
          actorUserId: actor.actorUserId,
        },
        jobOptions(`${ISSUE_CREDIT_NOTE_JOB}:${pending.id}:${pending.referenceCode}`),
      );
    }
    return pending;
  }
}

function buildCreditNoteReference(
  tenantId: string,
  invoiceId: string,
  idempotencyKey: string,
): string {
  const fingerprint = createHash('sha256')
    .update(`${tenantId}:${invoiceId}:${idempotencyKey.trim()}`)
    .digest('hex')
    .slice(0, 24);
  return `credit:${tenantId}:${invoiceId}:${fingerprint}`;
}

function isFinalCreditNoteStatus(status: FiscalInvoiceStatus): boolean {
  const terminalStatuses: FiscalInvoiceStatus[] = [
    FiscalInvoiceStatus.ACCEPTED,
    FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
    FiscalInvoiceStatus.REJECTED,
    FiscalInvoiceStatus.REJECTED_BY_DIAN,
    FiscalInvoiceStatus.CANCELLED,
    FiscalInvoiceStatus.CANCELLED_BEFORE_ISSUE,
  ];
  return terminalStatuses.includes(status);
}
