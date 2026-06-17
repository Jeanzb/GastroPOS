import { Injectable } from '@nestjs/common';
import type { FiscalProfileDto, FiscalProviderConnectionTestDto } from '@gastroai/contracts';
import {
  FiscalProviderStatus,
  FiscalProviderType,
  type FiscalProviderConfig,
  type Prisma,
} from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { AuditService } from '../audit/audit.service';
import type { UpsertFiscalProfileDto } from './dto/upsert-fiscal-profile.dto';
import { toFiscalProfileDto, type FiscalProfileWithProvider } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import type { UpsertFiscalProfileData, UpsertFiscalProviderConfigData } from './fiscal.repository';
import type { FiscalActor } from './fiscal.types';

@Injectable()
export class FiscalService {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(actor: FiscalActor): Promise<FiscalProfileDto | null> {
    const profile = await this.repository.findProfile(actor.tenantId);
    return profile ? toFiscalProfileDto(profile) : null;
  }

  async upsertProfile(actor: FiscalActor, dto: UpsertFiscalProfileDto): Promise<FiscalProfileDto> {
    assertValidNumberingRange(dto);
    assertValidNumberingDates(dto);

    const existing = await this.repository.findProfile(actor.tenantId);
    const before = existing ? toFiscalProfileDto(existing) : null;
    const data = toProfileData(actor, dto, existing);

    const saved = await this.repository.upsertProfile(actor.tenantId, data);
    const after = toFiscalProfileDto(saved);

    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: existing ? 'FISCAL_PROFILE_UPDATED' : 'FISCAL_PROFILE_CREATED',
      entityType: 'FiscalProfile',
      entityId: saved.id,
      before: before ? asJson(before) : undefined,
      after: asJson(after),
    });

    return after;
  }

  async testProviderConnection(actor: FiscalActor): Promise<FiscalProviderConnectionTestDto> {
    const profile = await this.repository.findProfile(actor.tenantId);
    if (!profile?.providerConfig) {
      throw new ApplicationException(400, {
        code: 'FISCAL_PROVIDER_NOT_CONFIGURED',
        message: 'Fiscal provider configuration is required before testing.',
      });
    }

    const checkedAt = new Date();
    const result = validateProviderReadiness(profile.providerConfig);
    const isReady =
      result.status === FiscalProviderStatus.CONNECTION_TESTED &&
      hasRequiredFiscalProfileData(profile);

    const updated = await this.repository.updateProviderConnectionResult({
      tenantId: actor.tenantId,
      providerConfigId: profile.providerConfig.id,
      status: result.status,
      error: result.error,
      isReady,
      actorUserId: actor.actorUserId,
      checkedAt,
    });

    if (!updated) {
      throw notFound();
    }

    const profileDto = toFiscalProfileDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'FISCAL_PROVIDER_CONNECTION_TESTED',
      entityType: 'FiscalProviderConfig',
      entityId: profile.providerConfig.id,
      metadata: asJson({
        status: result.status,
        environment: profile.providerConfig.environment,
        providerType: profile.providerConfig.providerType,
      }),
    });

    return {
      status: result.status,
      checkedAt: checkedAt.toISOString(),
      message: result.message,
      profile: profileDto,
    };
  }
}

function toProfileData(
  actor: FiscalActor,
  dto: UpsertFiscalProfileDto,
  existing: FiscalProfileWithProvider | null,
): UpsertFiscalProfileData {
  const providerConfig = dto.providerConfig ? toProviderConfigData(dto.providerConfig) : undefined;

  return {
    legalName: dto.legalName.trim(),
    nit: dto.nit.trim(),
    taxRegime: normalizeOptional(dto.taxRegime),
    fiscalResponsibilities: normalizeResponsibilities(dto.fiscalResponsibilities),
    municipality: normalizeOptional(dto.municipality),
    address: normalizeOptional(dto.address),
    invoiceResolutionNumber: normalizeOptional(dto.invoiceResolutionNumber),
    invoiceResolutionPrefix: normalizeOptional(dto.invoiceResolutionPrefix),
    numberingRangeFrom: dto.numberingRangeFrom ?? null,
    numberingRangeTo: dto.numberingRangeTo ?? null,
    numberingValidFrom: toDateOrNull(dto.numberingValidFrom),
    numberingValidUntil: toDateOrNull(dto.numberingValidUntil),
    isReady: existing?.isReady ?? false,
    actorUserId: actor.actorUserId,
    providerConfig,
  };
}

function toProviderConfigData(
  dto: NonNullable<UpsertFiscalProfileDto['providerConfig']>,
): UpsertFiscalProviderConfigData {
  return {
    providerType: dto.providerType,
    providerName: normalizeOptional(dto.providerName),
    environment: dto.environment ?? 'TEST',
    endpointUrl: normalizeOptional(dto.endpointUrl),
    softwareId: normalizeOptional(dto.softwareId),
    certificateAlias: normalizeOptional(dto.certificateAlias),
    accountId: normalizeOptional(dto.accountId),
    apiKeyRef: normalizeOptional(dto.apiKeyRef),
  };
}

function validateProviderReadiness(config: FiscalProviderConfig): {
  status: FiscalProviderStatus;
  error: string | null;
  message: string;
} {
  const missing = requiredProviderFields(config).filter((field) => !hasText(config[field]));

  if (missing.length > 0) {
    const error = `Missing provider configuration fields: ${missing.join(', ')}`;
    return {
      status: FiscalProviderStatus.ERROR,
      error,
      message:
        'La configuracion fiscal todavia no tiene los datos tecnicos minimos para probar integracion.',
    };
  }

  return {
    status: FiscalProviderStatus.CONNECTION_TESTED,
    error: null,
    message:
      'Configuracion tecnica validada localmente. Falta ejecutar habilitacion/certificacion real con DIAN o proveedor autorizado.',
  };
}

type RequiredProviderField =
  | 'providerName'
  | 'endpointUrl'
  | 'softwareId'
  | 'certificateAlias'
  | 'accountId'
  | 'apiKeyRef';

function requiredProviderFields(config: FiscalProviderConfig): RequiredProviderField[] {
  if (config.providerType === FiscalProviderType.DIAN_DIRECT) {
    return ['endpointUrl', 'softwareId', 'certificateAlias'];
  }

  if (config.providerType === FiscalProviderType.TECHNOLOGY_PROVIDER) {
    return ['providerName', 'endpointUrl', 'accountId'];
  }

  return ['providerName', 'endpointUrl', 'apiKeyRef'];
}

function hasRequiredFiscalProfileData(profile: FiscalProfileWithProvider): boolean {
  return Boolean(
    hasText(profile.legalName) &&
    hasText(profile.nit) &&
    hasText(profile.invoiceResolutionNumber) &&
    hasText(profile.invoiceResolutionPrefix) &&
    profile.numberingRangeFrom &&
    profile.numberingRangeTo,
  );
}

function assertValidNumberingRange(dto: UpsertFiscalProfileDto): void {
  if (
    dto.numberingRangeFrom !== undefined &&
    dto.numberingRangeTo !== undefined &&
    dto.numberingRangeFrom > dto.numberingRangeTo
  ) {
    throw new ApplicationException(400, {
      code: 'INVALID_NUMBERING_RANGE',
      message: 'Invoice numbering range start must be lower than or equal to end.',
    });
  }
}

function assertValidNumberingDates(dto: UpsertFiscalProfileDto): void {
  const from = toDateOrNull(dto.numberingValidFrom);
  const until = toDateOrNull(dto.numberingValidUntil);
  if (from && until && from.getTime() > until.getTime()) {
    throw new ApplicationException(400, {
      code: 'INVALID_NUMBERING_DATES',
      message: 'Invoice resolution start date must be before the end date.',
    });
  }
}

function normalizeResponsibilities(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function normalizeOptional(value: string | undefined): string | null {
  return value?.trim() || null;
}

function toDateOrNull(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function auditBase(actor: FiscalActor) {
  return {
    tenantId: actor.tenantId,
    branchId: actor.branchId,
    actorUserId: actor.actorUserId,
    requestId: actor.requestId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  };
}

function notFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Fiscal provider configuration was not found.',
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
