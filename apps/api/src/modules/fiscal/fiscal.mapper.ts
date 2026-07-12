import type {
  CreditNoteCorrectionConceptCode,
  FiscalCreditNoteDto,
  FiscalCreditNoteLineDto,
  FiscalDianResponseDto,
  FiscalDocumentDetailDto,
  FiscalDocumentDto,
  FiscalDocumentEventDto,
  FiscalDocumentLineDto,
  FiscalDocumentTaxDto,
  FiscalProfileDto,
} from '@gastroai/contracts';
import type {
  CreditNote,
  CreditNoteLine,
  DianResponse,
  FiscalProfile,
  Invoice,
  InvoiceEvent,
  InvoiceLine,
  InvoiceTax,
} from '../../../generated/prisma';

export type FiscalProfileRecord = FiscalProfile;

export type FiscalInvoiceDetailRecord = Invoice & {
  branch: { name: string } | null;
  lines: InvoiceLine[];
  taxes: InvoiceTax[];
  events: InvoiceEvent[];
  dianResponses: DianResponse[];
  creditNotes: Array<CreditNote & { lines: CreditNoteLine[] }>;
};

export function toFiscalProfileDto(profile: FiscalProfileRecord): FiscalProfileDto {
  return {
    id: profile.id,
    legalName: profile.legalName,
    nit: profile.nit,
    taxRegime: profile.taxRegime,
    fiscalResponsibilities: profile.fiscalResponsibilities,
    municipality: profile.municipality,
    address: profile.address,
    invoiceResolutionNumber: profile.invoiceResolutionNumber,
    invoiceResolutionPrefix: profile.invoiceResolutionPrefix,
    numberingRangeFrom: profile.numberingRangeFrom,
    numberingRangeTo: profile.numberingRangeTo,
    numberingValidFrom: toIsoOrNull(profile.numberingValidFrom),
    numberingValidUntil: toIsoOrNull(profile.numberingValidUntil),
    numberingRangeId: profile.numberingRangeId,
    creditNoteNumberingRangeId: profile.creditNoteNumberingRangeId,
    isReady: profile.isReady,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toFiscalDocumentDto(invoice: Invoice): FiscalDocumentDto {
  return {
    id: invoice.id,
    saleId: invoice.saleId,
    branchId: invoice.branchId,
    status: invoice.status,
    documentType: invoice.documentType,
    referenceCode: invoice.referenceCode,
    prefix: invoice.prefix,
    number: invoice.number,
    factusNumber: invoice.factusNumber,
    cufe: invoice.cufe,
    cude: invoice.cude,
    qrUrl: invoice.qrUrl,
    publicUrl: invoice.publicUrl,
    customerName: invoice.customerName,
    customerDocumentNumber: invoice.customerDocumentNumber,
    subtotalAmount: invoice.subtotalAmount,
    taxAmount: invoice.taxAmount,
    discountAmount: invoice.discountAmount,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    isValidated: invoice.isValidated,
    retryCount: invoice.retryCount,
    lastErrorCode: invoice.lastErrorCode,
    sentAt: toIsoOrNull(invoice.sentAt),
    acceptedAt: toIsoOrNull(invoice.acceptedAt),
    validatedAt: toIsoOrNull(invoice.validatedAt),
    rejectedAt: toIsoOrNull(invoice.rejectedAt),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    hasPdf: Boolean(invoice.pdfBase64 || invoice.pdfUrl),
    hasXml: Boolean(invoice.xmlBase64 || invoice.xmlUrl),
    hasAttachedDocumentXml: Boolean(invoice.attachedDocumentXmlBase64),
  };
}

export function toFiscalDocumentDetailDto(
  invoice: FiscalInvoiceDetailRecord,
): FiscalDocumentDetailDto {
  return {
    ...toFiscalDocumentDto(invoice),
    branchName: invoice.branch?.name ?? null,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    customerMunicipality: invoice.customerMunicipality,
    lines: invoice.lines.map((line) =>
      toFiscalDocumentLineDto(line, creditedQuantityForLine(invoice.creditNotes, line.id)),
    ),
    taxes: invoice.taxes.map(toFiscalDocumentTaxDto),
    events: invoice.events.map(toFiscalDocumentEventDto),
    responses: invoice.dianResponses.map(toFiscalDianResponseDto),
    creditNotes: invoice.creditNotes.map(toFiscalCreditNoteDto),
  };
}

export function toFiscalCreditNoteDto(
  creditNote: CreditNote & { lines: CreditNoteLine[] },
): FiscalCreditNoteDto {
  return {
    id: creditNote.id,
    originalInvoiceId: creditNote.originalInvoiceId,
    referenceCode: creditNote.referenceCode,
    correctionConceptCode: creditNote.correctionConceptCode as CreditNoteCorrectionConceptCode,
    customizationId: creditNote.customizationId,
    observation: creditNote.observation,
    numberingRangeId: creditNote.numberingRangeId,
    subtotalAmount: creditNote.subtotalAmount,
    taxAmount: creditNote.taxAmount,
    discountAmount: creditNote.discountAmount,
    tipAmount: creditNote.tipAmount,
    amount: creditNote.amount,
    currency: creditNote.currency,
    status: creditNote.status,
    factusNumber: creditNote.factusNumber,
    factusId: creditNote.factusId,
    cude: creditNote.cude,
    qrUrl: creditNote.qrUrl,
    publicUrl: creditNote.publicUrl,
    isValidated: creditNote.isValidated,
    retryCount: creditNote.retryCount,
    lastErrorCode: creditNote.lastErrorCode,
    sentAt: toIsoOrNull(creditNote.sentAt),
    acceptedAt: toIsoOrNull(creditNote.acceptedAt),
    validatedAt: toIsoOrNull(creditNote.validatedAt),
    rejectedAt: toIsoOrNull(creditNote.rejectedAt),
    hasPdf: Boolean(creditNote.pdfBase64),
    hasXml: Boolean(creditNote.xmlBase64),
    hasAttachedDocumentXml: Boolean(creditNote.attachedDocumentXmlBase64),
    lines: creditNote.lines.map(toFiscalCreditNoteLineDto),
    createdAt: creditNote.createdAt.toISOString(),
    updatedAt: creditNote.updatedAt.toISOString(),
  };
}

function toFiscalDocumentLineDto(
  line: InvoiceLine,
  creditedQuantity: number,
): FiscalDocumentLineDto {
  return {
    id: line.id,
    codeReference: line.codeReference,
    description: line.description,
    quantity: line.quantity,
    unitPriceAmount: line.unitPriceAmount,
    grossUnitPriceAmount: line.grossUnitPriceAmount,
    discountAmount: line.discountAmount,
    taxableAmount: line.taxableAmount,
    taxAmount: line.taxAmount,
    totalAmount: line.totalAmount,
    currency: line.currency,
    unitMeasureCode: line.unitMeasureCode,
    standardCode: line.standardCode,
    factusTaxCode: line.factusTaxCode,
    taxRateBasisPoints: line.taxRateBasisPoints,
    isTaxExcluded: line.isTaxExcluded,
    creditedQuantity,
    remainingCreditQuantity: Math.max(line.quantity - creditedQuantity, 0),
  };
}

function toFiscalCreditNoteLineDto(line: CreditNoteLine): FiscalCreditNoteLineDto {
  return {
    id: line.id,
    originalInvoiceLineId: line.originalInvoiceLineId,
    codeReference: line.codeReference,
    description: line.description,
    quantity: line.quantity,
    unitPriceAmount: line.unitPriceAmount,
    grossUnitPriceAmount: line.grossUnitPriceAmount,
    discountAmount: line.discountAmount,
    taxableAmount: line.taxableAmount,
    taxAmount: line.taxAmount,
    totalAmount: line.totalAmount,
    currency: line.currency,
    unitMeasureCode: line.unitMeasureCode,
    standardCode: line.standardCode,
    factusTaxCode: line.factusTaxCode,
    taxRateBasisPoints: line.taxRateBasisPoints,
    isTaxExcluded: line.isTaxExcluded,
  };
}

function creditedQuantityForLine(
  creditNotes: Array<CreditNote & { lines: CreditNoteLine[] }>,
  invoiceLineId: string,
): number {
  return creditNotes
    .filter((creditNote) => consumesOriginalInvoiceAmount(creditNote.status))
    .flatMap((creditNote) => creditNote.lines)
    .filter((line) => line.originalInvoiceLineId === invoiceLineId)
    .reduce((total, line) => total + line.quantity, 0);
}

function consumesOriginalInvoiceAmount(status: CreditNote['status']): boolean {
  return ![
    'REJECTED',
    'REJECTED_BY_DIAN',
    'FAILED',
    'CANCELLED',
    'CANCELLED_BEFORE_ISSUE',
  ].includes(status);
}

function toFiscalDocumentTaxDto(tax: InvoiceTax): FiscalDocumentTaxDto {
  return {
    id: tax.id,
    taxName: tax.taxName,
    factusTaxCode: tax.factusTaxCode,
    taxRateBasisPoints: tax.taxRateBasisPoints,
    taxableAmount: tax.taxableAmount,
    taxAmount: tax.taxAmount,
    isTaxExcluded: tax.isTaxExcluded,
  };
}

function toFiscalDocumentEventDto(event: InvoiceEvent): FiscalDocumentEventDto {
  return {
    id: event.id,
    type: event.type,
    status: event.status,
    message: event.message,
    providerReference: event.providerReference,
    createdAt: event.createdAt.toISOString(),
  };
}

function toFiscalDianResponseDto(response: DianResponse): FiscalDianResponseDto {
  return {
    id: response.id,
    attempt: response.attempt,
    endpoint: response.endpoint,
    method: response.method,
    httpStatus: response.httpStatus,
    providerTraceId: response.providerTraceId,
    errorCode: response.errorCode,
    errorMessage: response.errorMessage,
    createdAt: response.createdAt.toISOString(),
  };
}

function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
