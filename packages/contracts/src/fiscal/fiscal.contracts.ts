export type FiscalInvoiceStatus =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'PENDING_VALIDATION'
  | 'SENT_TO_PROVIDER'
  | 'SENT'
  | 'ACCEPTED_BY_DIAN'
  | 'ACCEPTED'
  | 'REJECTED_BY_DIAN'
  | 'REJECTED'
  | 'CANCELLED_BEFORE_ISSUE'
  | 'CANCELLED'
  | 'CORRECTED_WITH_CREDIT_NOTE'
  | 'PARTIALLY_REFUNDED'
  | 'FULLY_REFUNDED'
  | 'FAILED';

export interface FiscalProfileDto {
  id: string;
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
  numberingValidFrom: string | null;
  numberingValidUntil: string | null;
  numberingRangeId: number | null;
  creditNoteNumberingRangeId: number | null;
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertFiscalProfilePayload {
  legalName: string;
  nit: string;
  taxRegime?: string;
  fiscalResponsibilities?: string[];
  municipality?: string;
  address?: string;
  invoiceResolutionNumber?: string;
  invoiceResolutionPrefix?: string;
  numberingRangeFrom?: number;
  numberingRangeTo?: number;
  numberingValidFrom?: string;
  numberingValidUntil?: string;
  numberingRangeId?: number;
  creditNoteNumberingRangeId?: number;
}

export interface FiscalDocumentDto {
  id: string;
  saleId: string | null;
  branchId: string | null;
  status: FiscalInvoiceStatus;
  documentType: string;
  referenceCode: string | null;
  prefix: string | null;
  number: number | null;
  factusNumber: string | null;
  cufe: string | null;
  cude: string | null;
  qrUrl: string | null;
  publicUrl: string | null;
  customerName: string;
  customerDocumentNumber: string | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  isValidated: boolean;
  retryCount: number;
  lastErrorCode: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  validatedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasPdf: boolean;
  hasXml: boolean;
  hasAttachedDocumentXml: boolean;
}

export interface FiscalDocumentListDto {
  items: FiscalDocumentDto[];
}

export interface FiscalDocumentLineDto {
  id: string;
  codeReference: string | null;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  grossUnitPriceAmount: number | null;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
  creditedQuantity: number;
  remainingCreditQuantity: number;
}

export interface FiscalDocumentTaxDto {
  id: string;
  taxName: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  taxableAmount: number;
  taxAmount: number;
  isTaxExcluded: boolean;
}

export interface FiscalDocumentEventDto {
  id: string;
  type: string;
  status: FiscalInvoiceStatus | null;
  message: string | null;
  providerReference: string | null;
  createdAt: string;
}

export interface FiscalDianResponseDto {
  id: string;
  attempt: number;
  endpoint: string;
  method: string;
  httpStatus: number | null;
  providerTraceId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface FiscalDocumentDetailDto extends FiscalDocumentDto {
  branchName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerMunicipality: string | null;
  lines: FiscalDocumentLineDto[];
  taxes: FiscalDocumentTaxDto[];
  events: FiscalDocumentEventDto[];
  responses: FiscalDianResponseDto[];
  creditNotes: FiscalCreditNoteDto[];
}

export type CreditNoteCorrectionConceptCode = '1' | '2' | '3' | '4' | '5' | '6';

export interface CreateFiscalCreditNoteLinePayload {
  invoiceLineId: string;
  quantity: number;
}

export interface CreateFiscalCreditNotePayload {
  idempotencyKey: string;
  correctionConceptCode: CreditNoteCorrectionConceptCode;
  observation?: string;
  lines: CreateFiscalCreditNoteLinePayload[];
}

export interface FiscalCreditNoteLineDto {
  id: string;
  originalInvoiceLineId: string | null;
  codeReference: string | null;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  grossUnitPriceAmount: number | null;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
}

export interface FiscalCreditNoteDto {
  id: string;
  originalInvoiceId: string;
  referenceCode: string;
  correctionConceptCode: CreditNoteCorrectionConceptCode;
  customizationId: string | null;
  observation: string | null;
  numberingRangeId: number | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  amount: number;
  currency: string;
  status: FiscalInvoiceStatus;
  factusNumber: string | null;
  factusId: string | null;
  cude: string | null;
  qrUrl: string | null;
  publicUrl: string | null;
  isValidated: boolean;
  retryCount: number;
  lastErrorCode: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  validatedAt: string | null;
  rejectedAt: string | null;
  hasPdf: boolean;
  hasXml: boolean;
  hasAttachedDocumentXml: boolean;
  lines: FiscalCreditNoteLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface FiscalCreditNoteActionDto {
  creditNote: FiscalCreditNoteDto;
  message: string;
}

export interface FiscalNumberingRangeDto {
  id: number;
  document: string | null;
  prefix: string | null;
  resolutionNumber: string | null;
  rangeFrom: number | null;
  rangeTo: number | null;
  current: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean | null;
}

export interface FiscalNumberingRangeListDto {
  items: FiscalNumberingRangeDto[];
  fetchedAt: string;
}

export interface FiscalDocumentActionDto {
  document: FiscalDocumentDto;
  message: string;
}

export type FactusEnvironment = 'SANDBOX' | 'PRODUCTION';
export type FactusConnectionStatus = 'NOT_CONFIGURED' | 'PENDING_VERIFICATION' | 'READY' | 'DEGRADED' | 'ERROR';

export interface FactusConnectionDto {
  environment: FactusEnvironment;
  baseUrl: string;
  status: FactusConnectionStatus;
  hasCredentials: boolean;
  lastVerifiedAt: string | null;
  lastLatencyMs: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface UpsertFactusConnectionPayload {
  environment: FactusEnvironment;
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface BranchFiscalConfigurationDto {
  branchId: string;
  establishmentName: string | null;
  establishmentCode: string | null;
  establishmentAddress: string | null;
  establishmentMunicipality: string | null;
  establishmentPhone: string | null;
  invoiceNumberingRangeId: number | null;
  creditNoteNumberingRangeId: number | null;
  supportNumberingRangeId: number | null;
  adjustmentNumberingRangeId: number | null;
  isEnabled: boolean;
  updatedAt: string;
}

export interface UpsertBranchFiscalConfigurationPayload {
  establishmentName?: string;
  establishmentCode?: string;
  establishmentAddress?: string;
  establishmentMunicipality?: string;
  establishmentPhone?: string;
  invoiceNumberingRangeId?: number;
  creditNoteNumberingRangeId?: number;
  supportNumberingRangeId?: number;
  adjustmentNumberingRangeId?: number;
  isEnabled?: boolean;
}
