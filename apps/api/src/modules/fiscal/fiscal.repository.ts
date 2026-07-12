import { Injectable } from '@nestjs/common';
import {
  FiscalOutboxStatus,
  FiscalInvoiceEventType,
  FiscalInvoiceStatus,
  type FiscalOutboxEvent,
  type Invoice,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { FactusInvoiceRecord } from './factus/factus.mapper';
import type { FiscalInvoiceDetailRecord, FiscalProfileRecord } from './fiscal.mapper';

export interface UpsertFiscalProfileData {
  legalName: string;
  nit: string;
  taxRegime: string | null;
  fiscalResponsibilities: string[];
  municipality: string | null;
  address: string | null;
  invoiceResolutionNumber: string | null;
  invoiceResolutionPrefix: string | null;
  numberingRangeFrom: number | null;
  numberingRangeTo: number | null;
  numberingValidFrom: Date | null;
  numberingValidUntil: Date | null;
  numberingRangeId: number | null;
  creditNoteNumberingRangeId: number | null;
  isReady: boolean;
  actorUserId: string;
}

const FISCAL_INVOICE_INCLUDE = {
  fiscalProfile: true,
  customer: true,
  sale: {
    include: {
      payments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  },
  lines: {
    orderBy: { createdAt: 'asc' },
  },
  taxes: true,
} satisfies Prisma.InvoiceInclude;

const FISCAL_INVOICE_DETAIL_INCLUDE = {
  branch: { select: { name: true } },
  lines: { orderBy: { createdAt: 'asc' } },
  taxes: { orderBy: { createdAt: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  dianResponses: { orderBy: { createdAt: 'desc' }, take: 10 },
  creditNotes: {
    orderBy: { createdAt: 'desc' },
    include: { lines: { orderBy: { createdAt: 'asc' } } },
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class FiscalRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(tenantId: string): Promise<FiscalProfileRecord | null> {
    return this.prisma.fiscalProfile.findFirst({
      where: { tenantId },
    });
  }

  async upsertProfile(
    tenantId: string,
    data: UpsertFiscalProfileData,
  ): Promise<FiscalProfileRecord> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.fiscalProfile.upsert({
        where: { tenantId },
        update: {
          legalName: data.legalName,
          nit: data.nit,
          taxRegime: data.taxRegime,
          fiscalResponsibilities: data.fiscalResponsibilities,
          municipality: data.municipality,
          address: data.address,
          invoiceResolutionNumber: data.invoiceResolutionNumber,
          invoiceResolutionPrefix: data.invoiceResolutionPrefix,
          numberingRangeFrom: data.numberingRangeFrom,
          numberingRangeTo: data.numberingRangeTo,
          numberingValidFrom: data.numberingValidFrom,
          numberingValidUntil: data.numberingValidUntil,
          numberingRangeId: data.numberingRangeId,
          creditNoteNumberingRangeId: data.creditNoteNumberingRangeId,
          isReady: data.isReady,
          updatedById: data.actorUserId,
        },
        create: {
          tenantId,
          legalName: data.legalName,
          nit: data.nit,
          taxRegime: data.taxRegime,
          fiscalResponsibilities: data.fiscalResponsibilities,
          municipality: data.municipality,
          address: data.address,
          invoiceResolutionNumber: data.invoiceResolutionNumber,
          invoiceResolutionPrefix: data.invoiceResolutionPrefix,
          numberingRangeFrom: data.numberingRangeFrom,
          numberingRangeTo: data.numberingRangeTo,
          numberingValidFrom: data.numberingValidFrom,
          numberingValidUntil: data.numberingValidUntil,
          numberingRangeId: data.numberingRangeId,
          creditNoteNumberingRangeId: data.creditNoteNumberingRangeId,
          isReady: data.isReady,
          createdById: data.actorUserId,
        },
      });

      return tx.fiscalProfile.findFirstOrThrow({
        where: { id: profile.id, tenantId },
      });
    });
  }

  listInvoices(input: {
    tenantId: string;
    branchId: string;
    status?: FiscalInvoiceStatus;
    take: number;
    skip: number;
  }): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        status: input.status,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: input.take,
      skip: input.skip,
    });
  }

  findInvoiceForIssue(
    tenantId: string,
    branchId: string,
    invoiceId: string,
  ): Promise<FactusInvoiceRecord | null> {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, branchId, deletedAt: null },
      include: FISCAL_INVOICE_INCLUDE,
    }) as Promise<FactusInvoiceRecord | null>;
  }

  findInvoiceDetail(
    tenantId: string,
    branchId: string,
    invoiceId: string,
  ): Promise<FiscalInvoiceDetailRecord | null> {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, branchId, deletedAt: null },
      include: FISCAL_INVOICE_DETAIL_INCLUDE,
    }) as Promise<FiscalInvoiceDetailRecord | null>;
  }

  async markInvoiceReady(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    referenceCode: string;
    numberingRangeId: number;
    providerPayload: Prisma.InputJsonValue;
    actorUserId?: string | null;
  }): Promise<FactusInvoiceRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { id: true, saleId: true, status: true },
      });
      if (!invoice) {
        return null;
      }

      const blockedStatuses = new Set<FiscalInvoiceStatus>([
        FiscalInvoiceStatus.ACCEPTED,
        FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
        FiscalInvoiceStatus.PENDING_VALIDATION,
        FiscalInvoiceStatus.SENT_TO_PROVIDER,
        FiscalInvoiceStatus.SENT,
      ]);

      if (blockedStatuses.has(invoice.status)) {
        return tx.invoice.findFirst({
          where: { id: input.invoiceId, tenantId: input.tenantId, branchId: input.branchId },
          include: FISCAL_INVOICE_INCLUDE,
        }) as Promise<FactusInvoiceRecord>;
      }

      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.READY_TO_SEND,
          referenceCode: input.referenceCode,
          numberingRangeId: input.numberingRangeId,
          providerPayload: input.providerPayload,
          rejectionPayload: Prisma.JsonNull,
          lastErrorCode: null,
          nextRetryAt: null,
          updatedById: input.actorUserId ?? undefined,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.READY_TO_SEND,
          status: FiscalInvoiceStatus.READY_TO_SEND,
          message: 'Fiscal invoice payload frozen and ready for validation.',
          payload: input.providerPayload,
          createdById: input.actorUserId ?? undefined,
        },
      });

      await tx.fiscalOutboxEvent.upsert({
        where: {
          tenantId_documentType_idempotencyKey: {
            tenantId: input.tenantId,
            documentType: 'INVOICE',
            idempotencyKey: input.referenceCode,
          },
        },
        update: {
          payload: input.providerPayload,
          status: FiscalOutboxStatus.PENDING,
          availableAt: new Date(),
          lastError: null,
        },
        create: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          invoiceId: input.invoiceId,
          documentType: 'INVOICE',
          aggregateId: input.invoiceId,
          idempotencyKey: input.referenceCode,
          payload: input.providerPayload,
        },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: {
            fiscalDocumentId: input.invoiceId,
            fiscalStatus: FiscalInvoiceStatus.READY_TO_SEND,
          },
        });
      }

      return tx.invoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId, branchId: input.branchId },
        include: FISCAL_INVOICE_INCLUDE,
      }) as Promise<FactusInvoiceRecord>;
    });
  }

  async markPendingValidation(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    actorUserId?: string | null;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { saleId: true },
      });
      if (!invoice) {
        return;
      }
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.PENDING_VALIDATION,
          updatedById: input.actorUserId ?? undefined,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.PENDING_VALIDATION,
          status: FiscalInvoiceStatus.PENDING_VALIDATION,
          message: 'Fiscal invoice queued for validation.',
          createdById: input.actorUserId ?? undefined,
        },
      });

      await tx.fiscalOutboxEvent.updateMany({
        where: { tenantId: input.tenantId, invoiceId: input.invoiceId },
        data: { status: FiscalOutboxStatus.PENDING, lockedAt: null },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: { fiscalStatus: FiscalInvoiceStatus.PENDING_VALIDATION },
        });
      }
    });
  }

  async markSentToProvider(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    endpoint: string;
    httpStatus: number;
    requestPayload: Prisma.InputJsonValue;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { saleId: true, retryCount: true },
      });
      if (!invoice) {
        return;
      }
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.SENT_TO_PROVIDER,
          sentAt: new Date(),
          lastAttemptAt: new Date(),
          retryCount: { increment: 1 },
        },
      });

      await tx.dianResponse.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          attempt: invoice.retryCount + 1,
          endpoint: input.endpoint,
          httpStatus: input.httpStatus,
          requestPayload: input.requestPayload,
          responsePayload: input.responsePayload,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.SENT_TO_PROVIDER,
          status: FiscalInvoiceStatus.SENT_TO_PROVIDER,
          message: 'Fiscal invoice sent to the fiscal service.',
          payload: input.responsePayload,
          providerReference: input.endpoint,
        },
      });

      await tx.fiscalOutboxEvent.updateMany({
        where: { tenantId: input.tenantId, invoiceId: input.invoiceId },
        data: {
          status: FiscalOutboxStatus.PROCESSING,
          lockedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: { fiscalStatus: FiscalInvoiceStatus.SENT_TO_PROVIDER },
        });
      }
    });
  }

  async recordDianResponse(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    attempt: number;
    endpoint: string;
    method: string;
    httpStatus?: number | null;
    requestPayload?: Prisma.InputJsonValue;
    responsePayload?: Prisma.InputJsonValue;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
        branchId: input.branchId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!invoice) {
      return;
    }
    await this.prisma.dianResponse.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        attempt: input.attempt,
        endpoint: input.endpoint,
        method: input.method,
        httpStatus: input.httpStatus ?? null,
        requestPayload: input.requestPayload,
        responsePayload: input.responsePayload,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  async markAccepted(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    factusId: string | null;
    factusNumber: string | null;
    cufe: string | null;
    cude: string | null;
    qrUrl: string | null;
    publicUrl: string | null;
    validatedAt: Date | null;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { saleId: true },
      });
      if (!invoice) {
        return;
      }
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
          isValidated: true,
          factusId: input.factusId,
          factusNumber: input.factusNumber,
          externalReference: input.factusNumber,
          cufe: input.cufe,
          cude: input.cude,
          qrUrl: input.qrUrl,
          publicUrl: input.publicUrl,
          acceptedAt: new Date(),
          validatedAt: input.validatedAt ?? new Date(),
          rejectedAt: null,
          lastErrorCode: null,
          nextRetryAt: null,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.ACCEPTED_BY_DIAN,
          status: FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
          message: 'Fiscal invoice accepted by DIAN.',
          payload: input.responsePayload,
          providerReference: input.factusNumber,
        },
      });

      await tx.fiscalOutboxEvent.updateMany({
        where: { tenantId: input.tenantId, invoiceId: input.invoiceId },
        data: {
          status: FiscalOutboxStatus.COMPLETED,
          completedAt: new Date(),
          lastError: null,
        },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: { fiscalStatus: FiscalInvoiceStatus.ACCEPTED_BY_DIAN },
        });
      }
    });
  }

  async markRejected(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    errorCode: string;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { saleId: true },
      });
      if (!invoice) {
        return;
      }
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.REJECTED_BY_DIAN,
          isValidated: false,
          rejectionPayload: input.responsePayload,
          rejectedAt: new Date(),
          lastErrorCode: input.errorCode,
          nextRetryAt: null,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.REJECTED_BY_DIAN,
          status: FiscalInvoiceStatus.REJECTED_BY_DIAN,
          message: 'Fiscal invoice rejected by fiscal or DIAN validation.',
          payload: input.responsePayload,
        },
      });

      await tx.fiscalOutboxEvent.updateMany({
        where: { tenantId: input.tenantId, invoiceId: input.invoiceId },
        data: {
          status: FiscalOutboxStatus.COMPLETED,
          completedAt: new Date(),
          lastError: input.errorCode,
        },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: { fiscalStatus: FiscalInvoiceStatus.REJECTED_BY_DIAN },
        });
      }
    });
  }

  async markFailed(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    errorCode: string;
    message: string;
    responsePayload?: Prisma.InputJsonValue;
    nextRetryAt?: Date | null;
    retryable: boolean;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { saleId: true },
      });
      if (!invoice) {
        return;
      }
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: FiscalInvoiceStatus.FAILED,
          lastErrorCode: input.errorCode,
          rejectionPayload: input.responsePayload,
          nextRetryAt: input.nextRetryAt ?? null,
          lastAttemptAt: new Date(),
          retryCount: { increment: 1 },
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.FAILED,
          status: FiscalInvoiceStatus.FAILED,
          message: input.message,
          payload: input.responsePayload,
        },
      });

      await tx.fiscalOutboxEvent.updateMany({
        where: { tenantId: input.tenantId, invoiceId: input.invoiceId },
        data: {
          status: input.retryable ? FiscalOutboxStatus.FAILED : FiscalOutboxStatus.DEAD_LETTER,
          availableAt: input.nextRetryAt ?? new Date(),
          lastError: input.errorCode,
          attemptCount: { increment: 1 },
        },
      });

      if (invoice.saleId) {
        await tx.sale.updateMany({
          where: { id: invoice.saleId, tenantId: input.tenantId, branchId: input.branchId },
          data: { fiscalStatus: FiscalInvoiceStatus.FAILED },
        });
      }
    });
  }

  findDispatchableOutboxEvents(limit = 100): Promise<FiscalOutboxEvent[]> {
    return this.prisma.fiscalOutboxEvent.findMany({
      where: {
        status: { in: [FiscalOutboxStatus.PENDING, FiscalOutboxStatus.FAILED] },
        availableAt: { lte: new Date() },
        invoiceId: { not: null },
        branchId: { not: null },
      },
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  async updateArtifacts(input: {
    tenantId: string;
    branchId: string;
    invoiceId: string;
    pdfBase64?: string | null;
    pdfFileName?: string | null;
    xmlBase64?: string | null;
    xmlFileName?: string | null;
    attachedDocumentXmlBase64?: string | null;
    attachedDocumentXmlFileName?: string | null;
    payload: Prisma.InputJsonValue;
  }): Promise<Invoice> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existing) {
        throw new Error('Fiscal invoice was not found in the branch scope.');
      }
      const invoice = await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          pdfBase64: input.pdfBase64 ?? undefined,
          pdfFileName: input.pdfFileName ?? undefined,
          xmlBase64: input.xmlBase64 ?? undefined,
          xmlFileName: input.xmlFileName ?? undefined,
          attachedDocumentXmlBase64: input.attachedDocumentXmlBase64 ?? undefined,
          attachedDocumentXmlFileName: input.attachedDocumentXmlFileName ?? undefined,
        },
      });

      await tx.invoiceEvent.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          type: FiscalInvoiceEventType.ARTIFACTS_DOWNLOADED,
          status: invoice.status,
          message: 'Fiscal invoice artifacts downloaded.',
          payload: input.payload,
        },
      });

      return invoice;
    });
  }
}
