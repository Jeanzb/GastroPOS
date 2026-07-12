export interface FactusPaymentDetail {
  payment_form: string;
  payment_method_code: string;
  reference_code?: string;
  amount: string;
  due_date?: string;
}

export interface FactusRuntime {
  tenantId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  timeoutMs: number;
}

export interface FactusProviderCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface FactusCustomerPayload {
  identification_document_code: string;
  identification: string;
  dv?: string;
  legal_organization_code?: string;
  tribute_code?: string;
  company?: string;
  trade_name?: string;
  names?: string;
  address?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  municipality_code?: string;
}

export interface FactusTaxPayload {
  code: string;
  rate: string;
  is_excluded?: boolean;
}

export interface FactusItemPayload {
  code_reference: string;
  name: string;
  quantity: string;
  discount_amount?: string;
  discount_rate?: string;
  price: string;
  unit_measure_code: string;
  standard_code: string;
  taxes: FactusTaxPayload[];
}

export interface FactusAllowanceChargePayload {
  concept_type: string;
  is_surcharge: boolean;
  reason: string;
  base_amount: string;
  amount: string;
}

export interface FactusBillPayload {
  reference_code: string;
  document: '01';
  numbering_range_id: number;
  operation_type: '10';
  send_email: boolean;
  payment_details: FactusPaymentDetail[];
  cash_rounding_amount?: string;
  customer: FactusCustomerPayload;
  items: FactusItemPayload[];
  allowance_charges?: FactusAllowanceChargePayload[];
}

export interface FactusCreditNotePayload {
  reference_code: string;
  correction_concept_code: string;
  customization_id: '20';
  bill_id?: number;
  bill_number?: string;
  numbering_range_id: number;
  observation?: string;
  payment_details: FactusPaymentDetail[];
  cash_rounding_amount?: string;
  customer?: FactusCustomerPayload;
  items: FactusItemPayload[];
  allowance_charges?: FactusAllowanceChargePayload[];
}

export interface FactusSupportDocumentPayload {
  reference_code: string;
  numbering_range_id: number;
  document: '05';
  operation_type: '10';
  payment_details: FactusPaymentDetail[];
  provider: FactusCustomerPayload;
  items: FactusItemPayload[];
  cash_rounding_amount?: string;
  observation?: string;
}

export interface FactusAdjustmentNotePayload {
  reference_code: string;
  numbering_range_id: number;
  support_document_number: string;
  correction_concept_code: string;
  customization_id: string;
  payment_details: FactusPaymentDetail[];
  provider: FactusCustomerPayload;
  items: FactusItemPayload[];
  cash_rounding_amount?: string;
  observation?: string;
}

export interface FactusRadianEventPayload {
  identification_document_code: string;
  identification: string;
  dv?: string;
  first_name: string;
  last_name: string;
  job_title: string;
  organization_department: string;
}

export interface FactusHttpResult {
  endpoint: string;
  httpStatus: number;
  payload: unknown;
  retryAfterSeconds?: number;
}

export interface FactusBillStatus {
  isAccepted: boolean;
  isRejected: boolean;
  isValidated: boolean;
  status: string | null;
  factusId: string | null;
  number: string | null;
  cufe: string | null;
  cude: string | null;
  qrUrl: string | null;
  publicUrl: string | null;
  validatedAt: Date | null;
  errors: unknown;
}

export interface FactusArtifactResult {
  fileName: string | null;
  base64: string | null;
  payload: unknown;
}

export class FactusProviderError extends Error {
  readonly httpStatus?: number;
  readonly endpoint?: string;
  readonly responsePayload?: unknown;
  readonly retryAfterSeconds?: number;
  readonly isRetryable: boolean;

  constructor(input: {
    message: string;
    httpStatus?: number;
    endpoint?: string;
    responsePayload?: unknown;
    retryAfterSeconds?: number;
    isRetryable?: boolean;
  }) {
    super(input.message);
    this.name = 'FactusProviderError';
    this.httpStatus = input.httpStatus;
    this.endpoint = input.endpoint;
    this.responsePayload = input.responsePayload;
    this.retryAfterSeconds = input.retryAfterSeconds;
    this.isRetryable = input.isRetryable ?? isRetryableStatus(input.httpStatus);
  }
}

function isRetryableStatus(status: number | undefined): boolean {
  return status === undefined || status === 408 || status === 429 || status >= 500;
}
