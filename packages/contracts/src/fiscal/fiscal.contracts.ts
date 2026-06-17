export type FiscalProviderType = 'DIAN_DIRECT' | 'TECHNOLOGY_PROVIDER' | 'API_PROVIDER';

export type FiscalEnvironment = 'TEST' | 'PRODUCTION';

export type FiscalProviderStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'CONNECTION_TESTED' | 'ERROR';

export type FiscalInvoiceStatus =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface FiscalProviderConfigDto {
  id: string;
  providerType: FiscalProviderType;
  providerName: string | null;
  environment: FiscalEnvironment;
  status: FiscalProviderStatus;
  endpointUrl: string | null;
  softwareId: string | null;
  certificateAlias: string | null;
  accountId: string | null;
  apiKeyRef: string | null;
  lastConnectionTestAt: string | null;
  lastConnectionError: string | null;
  updatedAt: string;
}

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
  isReady: boolean;
  providerConfig: FiscalProviderConfigDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertFiscalProviderConfigPayload {
  providerType: FiscalProviderType;
  providerName?: string;
  environment?: FiscalEnvironment;
  endpointUrl?: string;
  softwareId?: string;
  certificateAlias?: string;
  accountId?: string;
  /** Reference to a secret stored outside the desktop app and API logs. */
  apiKeyRef?: string;
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
  providerConfig?: UpsertFiscalProviderConfigPayload;
}

export interface FiscalProviderConnectionTestDto {
  status: FiscalProviderStatus;
  checkedAt: string;
  message: string;
  profile: FiscalProfileDto;
}
