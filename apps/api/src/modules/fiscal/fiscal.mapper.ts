import type { FiscalProfileDto, FiscalProviderConfigDto } from '@gastroai/contracts';
import type { FiscalProfile, FiscalProviderConfig } from '../../../generated/prisma';

export type FiscalProfileWithProvider = FiscalProfile & {
  providerConfig: FiscalProviderConfig | null;
};

export function toFiscalProfileDto(profile: FiscalProfileWithProvider): FiscalProfileDto {
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
    isReady: profile.isReady,
    providerConfig: profile.providerConfig
      ? toFiscalProviderConfigDto(profile.providerConfig)
      : null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function toFiscalProviderConfigDto(config: FiscalProviderConfig): FiscalProviderConfigDto {
  return {
    id: config.id,
    providerType: config.providerType,
    providerName: config.providerName,
    environment: config.environment,
    status: config.status,
    endpointUrl: config.endpointUrl,
    softwareId: config.softwareId,
    certificateAlias: config.certificateAlias,
    accountId: config.accountId,
    apiKeyRef: config.apiKeyRef,
    lastConnectionTestAt: toIsoOrNull(config.lastConnectionTestAt),
    lastConnectionError: config.lastConnectionError,
    updatedAt: config.updatedAt.toISOString(),
  };
}

function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
