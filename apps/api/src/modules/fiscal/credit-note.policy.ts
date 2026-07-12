import {
  FiscalInvoiceStatus,
  type CreditNote,
  type CreditNoteLine,
  type InvoiceLine,
} from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import type { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import type {
  CreditNoteDraftData,
  CreditNoteDraftLineData,
  CreditNoteSourceInvoiceRecord,
} from './credit-note.types';

export function buildCreditNoteDraft(input: {
  source: CreditNoteSourceInvoiceRecord;
  dto: CreateCreditNoteDto;
  referenceCode: string;
  numberingRangeId?: number;
}): CreditNoteDraftData {
  const { source, dto, referenceCode } = input;
  assertCreditNoteCanBeCreated(source, input.numberingRangeId);

  const requestedLines = uniqueRequestedLines(dto);
  const lines = requestedLines.map(({ invoiceLineId, quantity }) => {
    const sourceLine = source.lines.find((line) => line.id === invoiceLineId);
    if (!sourceLine) {
      throw conflict(
        'CREDIT_NOTE_LINE_NOT_FOUND',
        'A requested correction line is not part of the invoice.',
      );
    }
    return buildCreditNoteLine(sourceLine, source.creditNotes, quantity);
  });

  if (dto.correctionConceptCode === '2') {
    assertFullCancellation(source, lines);
  }

  const subtotalAmount = lines.reduce((total, line) => total + line.subtotalAmount, 0);
  const taxAmount = lines.reduce((total, line) => total + line.taxAmount, 0);
  const discountAmount = lines.reduce((total, line) => total + line.discountAmount, 0);
  const lineAmount = lines.reduce((total, line) => total + line.totalAmount, 0);
  const tipAmount = dto.correctionConceptCode === '2' ? remainingTipAmount(source) : 0;
  const amount = lineAmount + tipAmount;

  if (amount <= 0) {
    throw conflict(
      'CREDIT_NOTE_AMOUNT_INVALID',
      'The credit note total must be greater than zero.',
    );
  }

  return {
    referenceCode,
    correctionConceptCode: dto.correctionConceptCode,
    customizationId: '20',
    observation: dto.observation?.trim() || null,
    numberingRangeId: input.numberingRangeId ?? source.fiscalProfile!.creditNoteNumberingRangeId!,
    subtotalAmount,
    taxAmount,
    discountAmount,
    tipAmount,
    amount,
    currency: source.currency,
    lines,
  };
}

function assertCreditNoteCanBeCreated(
  source: CreditNoteSourceInvoiceRecord,
  numberingRangeId?: number,
): void {
  const allowedStatuses = new Set<FiscalInvoiceStatus>([
    FiscalInvoiceStatus.ACCEPTED,
    FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
    FiscalInvoiceStatus.CORRECTED_WITH_CREDIT_NOTE,
    FiscalInvoiceStatus.PARTIALLY_REFUNDED,
  ]);
  if (!allowedStatuses.has(source.status) || !source.isValidated) {
    throw conflict(
      'CREDIT_NOTE_ORIGINAL_NOT_ACCEPTED',
      'Only a DIAN-accepted fiscal invoice can be corrected with a credit note.',
    );
  }
  if (source.status === FiscalInvoiceStatus.FULLY_REFUNDED) {
    throw conflict(
      'CREDIT_NOTE_FULLY_CORRECTED',
      'The original invoice has already been fully corrected.',
    );
  }
  if (!source.factusNumber && !source.factusId) {
    throw conflict(
      'CREDIT_NOTE_FACTUS_REFERENCE_REQUIRED',
      'The accepted invoice does not have the required fiscal reference.',
    );
  }
  if (!source.fiscalProfile?.isReady) {
    throw conflict(
      'FISCAL_PROFILE_NOT_READY',
      'El perfil tributario no esta listo para emitir una nota credito.',
    );
  }
  if (!numberingRangeId && !source.fiscalProfile.creditNoteNumberingRangeId) {
    throw conflict(
      'CREDIT_NOTE_NUMBERING_RANGE_REQUIRED',
      'Se requiere un rango autorizado para notas credito antes de corregir.',
    );
  }
}

function uniqueRequestedLines(dto: CreateCreditNoteDto): CreateCreditNoteDto['lines'] {
  const seen = new Set<string>();
  for (const line of dto.lines) {
    if (seen.has(line.invoiceLineId)) {
      throw conflict(
        'CREDIT_NOTE_DUPLICATE_LINE',
        'Each invoice line can appear only once in a credit note.',
      );
    }
    seen.add(line.invoiceLineId);
  }
  return dto.lines;
}

function buildCreditNoteLine(
  sourceLine: InvoiceLine,
  creditNotes: Array<CreditNote & { lines: CreditNoteLine[] }>,
  requestedQuantity: number,
): CreditNoteDraftLineData {
  const previouslyReserved = creditNotes
    .filter(reservesCorrection)
    .flatMap((creditNote) => creditNote.lines)
    .filter((line) => line.originalInvoiceLineId === sourceLine.id);
  const reservedQuantity = previouslyReserved.reduce((total, line) => total + line.quantity, 0);
  const remainingQuantity = sourceLine.quantity - reservedQuantity;
  if (requestedQuantity > remainingQuantity) {
    throw conflict(
      'CREDIT_NOTE_QUANTITY_EXCEEDED',
      `The requested quantity exceeds the ${remainingQuantity} units still correctable for ${sourceLine.description}.`,
    );
  }

  const remaining = {
    discountAmount: sourceLine.discountAmount - sum(previouslyReserved, 'discountAmount'),
    taxableAmount: sourceLine.taxableAmount - sum(previouslyReserved, 'taxableAmount'),
    subtotalAmount: sourceLine.subtotalAmount - sum(previouslyReserved, 'subtotalAmount'),
    taxAmount: sourceLine.taxAmount - sum(previouslyReserved, 'taxAmount'),
    totalAmount: sourceLine.totalAmount - sum(previouslyReserved, 'totalAmount'),
  };
  const factusDiscountCents = remainingFactusDiscountCents(sourceLine, previouslyReserved);

  return {
    originalInvoiceLineId: sourceLine.id,
    codeReference: sourceLine.codeReference,
    description: sourceLine.description,
    quantity: requestedQuantity,
    unitPriceAmount: sourceLine.unitPriceAmount,
    grossUnitPriceAmount: sourceLine.grossUnitPriceAmount,
    factusPrice: sourceLine.factusPrice,
    discountAmount: allocateRemaining(
      remaining.discountAmount,
      requestedQuantity,
      remainingQuantity,
    ),
    factusDiscountAmount: toOptionalMoney(
      allocateRemaining(factusDiscountCents, requestedQuantity, remainingQuantity),
    ),
    taxableAmount: allocateRemaining(remaining.taxableAmount, requestedQuantity, remainingQuantity),
    subtotalAmount: allocateRemaining(
      remaining.subtotalAmount,
      requestedQuantity,
      remainingQuantity,
    ),
    taxAmount: allocateRemaining(remaining.taxAmount, requestedQuantity, remainingQuantity),
    totalAmount: allocateRemaining(remaining.totalAmount, requestedQuantity, remainingQuantity),
    currency: sourceLine.currency,
    unitMeasureCode: sourceLine.unitMeasureCode,
    standardCode: sourceLine.standardCode,
    factusTaxCode: sourceLine.factusTaxCode,
    taxRateBasisPoints: sourceLine.taxRateBasisPoints,
    isTaxExcluded: sourceLine.isTaxExcluded,
  };
}

function assertFullCancellation(
  source: CreditNoteSourceInvoiceRecord,
  newLines: CreditNoteDraftLineData[],
): void {
  if (source.creditNotes.some(reservesCorrection)) {
    throw conflict(
      'CREDIT_NOTE_FULL_CANCELLATION_NOT_AVAILABLE',
      'A full cancellation is not available after another credit note has reserved or corrected the invoice.',
    );
  }
  const newQuantities = new Map(
    newLines.map((line) => [line.originalInvoiceLineId, line.quantity]),
  );
  for (const sourceLine of source.lines) {
    const reservedQuantity = source.creditNotes
      .filter(reservesCorrection)
      .flatMap((creditNote) => creditNote.lines)
      .filter((line) => line.originalInvoiceLineId === sourceLine.id)
      .reduce((total, line) => total + line.quantity, 0);
    const expected = sourceLine.quantity - reservedQuantity;
    if ((newQuantities.get(sourceLine.id) ?? 0) !== expected) {
      throw conflict(
        'CREDIT_NOTE_FULL_CANCELLATION_REQUIRED',
        'An invoice cancellation must include every remaining invoice line and quantity.',
      );
    }
  }
}

function remainingTipAmount(source: CreditNoteSourceInvoiceRecord): number {
  const originalTip = source.sale?.tipAmount ?? 0;
  const reservedTip = source.creditNotes
    .filter(reservesCorrection)
    .reduce((total, creditNote) => total + creditNote.tipAmount, 0);
  return Math.max(originalTip - reservedTip, 0);
}

function reservesCorrection(creditNote: CreditNote): boolean {
  if (
    creditNote.status === FiscalInvoiceStatus.REJECTED ||
    creditNote.status === FiscalInvoiceStatus.REJECTED_BY_DIAN ||
    creditNote.status === FiscalInvoiceStatus.CANCELLED ||
    creditNote.status === FiscalInvoiceStatus.CANCELLED_BEFORE_ISSUE
  ) {
    return false;
  }
  return creditNote.status !== FiscalInvoiceStatus.FAILED || Boolean(creditNote.nextRetryAt);
}

function sum(
  lines: CreditNoteLine[],
  key: keyof Pick<
    CreditNoteLine,
    'discountAmount' | 'taxableAmount' | 'subtotalAmount' | 'taxAmount' | 'totalAmount'
  >,
): number {
  return lines.reduce((total, line) => total + line[key], 0);
}

function remainingFactusDiscountCents(
  sourceLine: InvoiceLine,
  previousLines: CreditNoteLine[],
): number {
  const sourceCents = toMoneyCents(sourceLine.factusDiscountAmount);
  const reservedCents = previousLines.reduce(
    (total, line) => total + toMoneyCents(line.factusDiscountAmount),
    0,
  );
  return Math.max(sourceCents - reservedCents, 0);
}

function allocateRemaining(
  amount: number,
  requestedQuantity: number,
  remainingQuantity: number,
): number {
  if (requestedQuantity === remainingQuantity) {
    return amount;
  }
  return Math.round((amount * requestedQuantity) / remainingQuantity);
}

function toMoneyCents(value: string | null): number {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return 0;
  }
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function toOptionalMoney(cents: number): string | null {
  return cents > 0 ? (cents / 100).toFixed(2) : null;
}

function conflict(code: string, message: string): ApplicationException {
  return new ApplicationException(409, { code, message });
}

export function isCreditNoteCorrectionReserved(creditNote: CreditNote): boolean {
  return reservesCorrection(creditNote);
}
