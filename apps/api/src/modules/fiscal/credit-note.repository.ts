import { Injectable } from '@nestjs/common';
import {
  CreditNoteEventType,
  FiscalInvoiceEventType,
  FiscalInvoiceStatus,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { FactusCreditNoteRecord, FactusInvoiceRecord } from './factus/factus.mapper';
import type {
  CreditNoteDraftData,
  CreditNoteRecord,
  CreditNoteSourceInvoiceRecord,
} from './credit-note.types';

const CREDIT_NOTE_LINES_INCLUDE = {
  lines: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CreditNoteInclude;

const CREDIT_NOTE_SOURCE_INCLUDE = {
  fiscalProfile: true,
  customer: true,
  sale: { include: { payments: { orderBy: { createdAt: 'asc' } } } },
  lines: { orderBy: { createdAt: 'asc' } },
  taxes: true,
  creditNotes: {
    orderBy: { createdAt: 'asc' },
    include: { lines: { orderBy: { createdAt: 'asc' } } },
  },
} satisfies Prisma.InvoiceInclude;

const CREDIT_NOTE_ISSUE_INCLUDE = {
  lines: { orderBy: { createdAt: 'asc' } },
  originalInvoice: {
    include: {
      fiscalProfile: true,
      customer: true,
      sale: { include: { payments: { orderBy: { createdAt: 'asc' } } } },
      lines: { orderBy: { createdAt: 'asc' } },
      taxes: true,
    },
  },
} satisfies Prisma.CreditNoteInclude;

export interface CreateCreditNoteDraftInput {
  tenantId: string;
  branchId: string;
  invoiceId: string;
  referenceCode: string;
  actorUserId: string | null;
  createDraft: (source: CreditNoteSourceInvoiceRecord) => CreditNoteDraftData;
}

@Injectable()
export class CreditNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(
    input: CreateCreditNoteDraftInput,
  ): Promise<{ creditNote: CreditNoteRecord; wasCreated: boolean } | null> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.creditNote.findUnique({
          where: {
            tenantId_referenceCode: {
              tenantId: input.tenantId,
              referenceCode: input.referenceCode,
            },
          },
          include: CREDIT_NOTE_LINES_INCLUDE,
        });
        if (existing) {
          return { creditNote: existing, wasCreated: false } as const;
        }

        const locked = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            SELECT "id"
            FROM "invoices"
            WHERE "id" = ${input.invoiceId}
              AND "tenantId" = ${input.tenantId}
              AND "branchId" = ${input.branchId}
              AND "deletedAt" IS NULL
            FOR UPDATE
          `,
        );
        if (locked.length === 0) {
          return null;
        }

        const idempotentRecord = await tx.creditNote.findUnique({
          where: {
            tenantId_referenceCode: {
              tenantId: input.tenantId,
              referenceCode: input.referenceCode,
            },
          },
          include: CREDIT_NOTE_LINES_INCLUDE,
        });
        if (idempotentRecord) {
          return { creditNote: idempotentRecord, wasCreated: false } as const;
        }

        const source = await tx.invoice.findFirst({
          where: {
            id: input.invoiceId,
            tenantId: input.tenantId,
            branchId: input.branchId,
            deletedAt: null,
          },
          include: CREDIT_NOTE_SOURCE_INCLUDE,
        });
        if (!source) {
          return null;
        }

        const draft = input.createDraft(source as CreditNoteSourceInvoiceRecord);
        const creditNote = await tx.creditNote.create({
          data: {
            tenantId: input.tenantId,
            branchId: source.branchId,
            originalInvoiceId: source.id,
            referenceCode: draft.referenceCode,
            correctionConceptCode: draft.correctionConceptCode,
            customizationId: draft.customizationId,
            observation: draft.observation,
            numberingRangeId: draft.numberingRangeId,
            subtotalAmount: draft.subtotalAmount,
            taxAmount: draft.taxAmount,
            discountAmount: draft.discountAmount,
            tipAmount: draft.tipAmount,
            amount: draft.amount,
            currency: draft.currency,
            status: FiscalInvoiceStatus.DRAFT,
            createdById: input.actorUserId,
            lines: {
              create: draft.lines.map((line) => ({
                tenantId: input.tenantId,
                ...line,
              })),
            },
            events: {
              create: {
                tenantId: input.tenantId,
                type: CreditNoteEventType.CREATED,
                status: FiscalInvoiceStatus.DRAFT,
                message: 'Credit note draft created from accepted fiscal invoice.',
                createdById: input.actorUserId,
              },
            },
          },
          include: CREDIT_NOTE_LINES_INCLUDE,
        });

        return { creditNote, wasCreated: true } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  findCreditNoteForIssue(
    tenantId: string,
    branchId: string,
    creditNoteId: string,
  ): Promise<FactusCreditNoteRecord | null> {
    return this.prisma.creditNote.findFirst({
      where: { id: creditNoteId, tenantId, branchId },
      include: CREDIT_NOTE_ISSUE_INCLUDE,
    }) as Promise<FactusCreditNoteRecord | null>;
  }

  async markPendingValidation(input: {
    tenantId: string;
    branchId: string;
    creditNoteId: string;
    actorUserId: string | null;
  }): Promise<CreditNoteRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.creditNote.updateMany({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
          status: { in: [FiscalInvoiceStatus.DRAFT, FiscalInvoiceStatus.FAILED] },
        },
        data: {
          status: FiscalInvoiceStatus.PENDING_VALIDATION,
          nextRetryAt: null,
          updatedById: input.actorUserId,
        },
      });
      if (result.count === 0) {
        const existing = await tx.creditNote.findFirst({
          where: {
            id: input.creditNoteId,
            tenantId: input.tenantId,
            branchId: input.branchId,
          },
          include: CREDIT_NOTE_LINES_INCLUDE,
        });
        return existing;
      }

      await tx.creditNoteEvent.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          type: CreditNoteEventType.PENDING_VALIDATION,
          status: FiscalInvoiceStatus.PENDING_VALIDATION,
          message: 'Credit note queued for fiscal validation.',
          createdById: input.actorUserId,
        },
      });

      return tx.creditNote.findFirst({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
        include: CREDIT_NOTE_LINES_INCLUDE,
      });
    });
  }

  async markSentToProvider(input: {
    tenantId: string;
    branchId: string;
    creditNoteId: string;
    endpoint: string;
    httpStatus: number;
    requestPayload: Prisma.InputJsonValue;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.findFirst({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
        select: { retryCount: true },
      });
      if (!creditNote) {
        return;
      }
      await tx.creditNote.update({
        where: { id: input.creditNoteId },
        data: {
          status: FiscalInvoiceStatus.SENT_TO_PROVIDER,
          sentAt: new Date(),
          lastAttemptAt: new Date(),
          retryCount: { increment: 1 },
        },
      });
      await tx.creditNoteResponse.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          attempt: creditNote.retryCount + 1,
          endpoint: input.endpoint,
          httpStatus: input.httpStatus,
          requestPayload: input.requestPayload,
          responsePayload: input.responsePayload,
        },
      });
      await tx.creditNoteEvent.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          type: CreditNoteEventType.SENT_TO_PROVIDER,
          status: FiscalInvoiceStatus.SENT_TO_PROVIDER,
          message: 'Credit note sent to the fiscal service.',
          payload: input.responsePayload,
          providerReference: input.endpoint,
        },
      });
    });
  }

  async markAccepted(input: {
    tenantId: string;
    branchId: string;
    creditNoteId: string;
    factusId: string | null;
    factusNumber: string | null;
    cude: string | null;
    qrUrl: string | null;
    publicUrl: string | null;
    validatedAt: Date | null;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.findFirst({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
        select: { originalInvoiceId: true },
      });
      if (!creditNote) {
        return;
      }
      await tx.creditNote.update({
        where: { id: input.creditNoteId },
        data: {
          status: FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
          factusId: input.factusId,
          factusNumber: input.factusNumber,
          cude: input.cude,
          qrUrl: input.qrUrl,
          publicUrl: input.publicUrl,
          isValidated: true,
          acceptedAt: new Date(),
          validatedAt: input.validatedAt ?? new Date(),
          rejectedAt: null,
          lastErrorCode: null,
          nextRetryAt: null,
        },
      });
      await tx.creditNoteEvent.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          type: CreditNoteEventType.ACCEPTED_BY_DIAN,
          status: FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
          message: 'Credit note accepted by DIAN.',
          payload: input.responsePayload,
          providerReference: input.factusNumber,
        },
      });

      await updateOriginalInvoiceCorrectionStatus(
        tx,
        input.tenantId,
        input.branchId,
        creditNote.originalInvoiceId,
      );
    });
  }

  async markRejected(input: {
    tenantId: string;
    branchId: string;
    creditNoteId: string;
    errorCode: string;
    responsePayload: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.creditNote.updateMany({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
        data: {
          status: FiscalInvoiceStatus.REJECTED_BY_DIAN,
          isValidated: false,
          rejectionPayload: input.responsePayload,
          rejectedAt: new Date(),
          lastErrorCode: input.errorCode,
          nextRetryAt: null,
        },
      });
      if (result.count === 0) {
        return;
      }
      await tx.creditNoteEvent.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          type: CreditNoteEventType.REJECTED_BY_DIAN,
          status: FiscalInvoiceStatus.REJECTED_BY_DIAN,
          message: 'Credit note rejected by fiscal or DIAN validation.',
          payload: input.responsePayload,
        },
      });
    });
  }

  async markFailed(input: {
    tenantId: string;
    branchId: string;
    creditNoteId: string;
    errorCode: string;
    message: string;
    responsePayload?: Prisma.InputJsonValue;
    nextRetryAt?: Date | null;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.creditNote.updateMany({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
        data: {
          status: FiscalInvoiceStatus.FAILED,
          lastErrorCode: input.errorCode,
          rejectionPayload: input.responsePayload,
          nextRetryAt: input.nextRetryAt ?? null,
          lastAttemptAt: new Date(),
          retryCount: { increment: 1 },
        },
      });
      if (result.count === 0) {
        return;
      }
      await tx.creditNoteEvent.create({
        data: {
          tenantId: input.tenantId,
          creditNoteId: input.creditNoteId,
          type: CreditNoteEventType.FAILED,
          status: FiscalInvoiceStatus.FAILED,
          message: input.message,
          payload: input.responsePayload,
        },
      });
    });
  }
}

async function updateOriginalInvoiceCorrectionStatus(
  tx: Prisma.TransactionClient,
  tenantId: string,
  branchId: string,
  invoiceId: string,
): Promise<void> {
  const [invoice, acceptedNotes] = await Promise.all([
    tx.invoice.findFirst({
      where: { id: invoiceId, tenantId, branchId },
      select: { totalAmount: true, saleId: true },
    }),
    tx.creditNote.findMany({
      where: {
        tenantId,
        branchId,
        originalInvoiceId: invoiceId,
        status: { in: [FiscalInvoiceStatus.ACCEPTED, FiscalInvoiceStatus.ACCEPTED_BY_DIAN] },
      },
      select: { amount: true, correctionConceptCode: true },
    }),
  ]);
  if (!invoice) {
    return;
  }

  const correctedAmount = acceptedNotes.reduce((total, creditNote) => total + creditNote.amount, 0);
  const isRefund = acceptedNotes.some(
    (creditNote) =>
      creditNote.correctionConceptCode === '1' || creditNote.correctionConceptCode === '2',
  );
  const status =
    isRefund && correctedAmount >= invoice.totalAmount
      ? FiscalInvoiceStatus.FULLY_REFUNDED
      : isRefund
        ? FiscalInvoiceStatus.PARTIALLY_REFUNDED
        : FiscalInvoiceStatus.CORRECTED_WITH_CREDIT_NOTE;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });
  await tx.invoiceEvent.create({
    data: {
      tenantId,
      invoiceId,
      type: FiscalInvoiceEventType.PROVIDER_SYNCED,
      status,
      message: 'Original invoice status updated after accepted credit note.',
    },
  });
  if (invoice.saleId) {
    await tx.sale.updateMany({
      where: { id: invoice.saleId, tenantId, branchId },
      data: { fiscalStatus: status },
    });
  }
}
