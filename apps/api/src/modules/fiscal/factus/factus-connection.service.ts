import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FactusConnectionStatus,
  FactusEnvironment,
  type BranchFiscalConfiguration,
  type FactusConnection,
} from '../../../../generated/prisma';
import type { Env } from '../../../config/env.schema';
import { ApiErrorCode } from '../../../common/errors/api-error-code';
import { ApplicationException } from '../../../common/errors/application.exception';
import type { UpsertBranchFiscalConfigurationDto } from '../dto/upsert-branch-fiscal-configuration.dto';
import type { UpsertFactusConnectionDto } from '../dto/upsert-factus-connection.dto';
import { FactusAdapter } from './factus.adapter';
import { FactusCredentialsCipher } from './factus-credentials.cipher';
import { FactusConnectionRepository } from './factus-connection.repository';
import { FactusProviderError, type FactusRuntime } from './factus.types';

export interface FactusConnectionDto {
  environment: 'SANDBOX' | 'PRODUCTION';
  baseUrl: string;
  status: FactusConnectionStatus;
  hasCredentials: boolean;
  lastVerifiedAt: string | null;
  lastLatencyMs: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
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

@Injectable()
export class FactusConnectionService {
  constructor(
    private readonly repository: FactusConnectionRepository,
    private readonly cipher: FactusCredentialsCipher,
    private readonly config: ConfigService<Env, true>,
    private readonly adapter: FactusAdapter,
  ) {}

  async getConnection(tenantId: string): Promise<FactusConnectionDto | null> {
    const connection = await this.repository.findByTenant(tenantId);
    return connection ? toConnectionDto(connection) : null;
  }

  async configure(
    tenantId: string,
    actorUserId: string,
    dto: UpsertFactusConnectionDto,
  ): Promise<FactusConnectionDto> {
    const environment = dto.environment as FactusEnvironment;
    const connection = await this.repository.upsert({
      tenantId,
      environment,
      baseUrl: normalizeFactusBaseUrl(dto.baseUrl, environment),
      encryptedCredentials: this.cipher.encrypt({
        clientId: dto.clientId.trim(),
        clientSecret: dto.clientSecret.trim(),
        username: dto.username.trim(),
        password: dto.password,
      }),
      actorUserId,
    });
    return toConnectionDto(connection);
  }

  async verify(tenantId: string): Promise<FactusConnectionDto> {
    const existing = await this.repository.findByTenant(tenantId);
    if (!existing) {
      throw new ApplicationException(409, {
        code: 'FACTUS_CONNECTION_NOT_CONFIGURED',
        message:
          'Configura las credenciales Factus del restaurante antes de verificar la conexion.',
      });
    }
    const startedAt = Date.now();
    try {
      const runtime = await this.getRuntime(tenantId);
      await this.adapter.testConnection(runtime);
      const updated = await this.repository.updateHealth({
        tenantId,
        status: FactusConnectionStatus.READY,
        latencyMs: elapsedMs(startedAt),
      });
      return toConnectionDto(updated);
    } catch (error) {
      const providerError = error instanceof FactusProviderError ? error : null;
      const updated = await this.repository.updateHealth({
        tenantId,
        status:
          providerError?.httpStatus === 401 || providerError?.httpStatus === 403
            ? FactusConnectionStatus.ERROR
            : FactusConnectionStatus.DEGRADED,
        latencyMs: elapsedMs(startedAt),
        errorCode: providerError?.httpStatus
          ? `FACTUS_HTTP_${providerError.httpStatus}`
          : 'FACTUS_CONNECTION_ERROR',
        errorMessage: sanitizeProviderMessage(
          providerError?.message ?? 'Connection verification failed.',
        ),
      });
      return toConnectionDto(updated);
    }
  }

  async getRuntime(tenantId: string): Promise<FactusRuntime> {
    const connection = await this.repository.findByTenant(tenantId);
    if (!connection) {
      throw new ApplicationException(409, {
        code: 'FACTUS_CONNECTION_NOT_CONFIGURED',
        message: 'Configura las credenciales Factus del restaurante antes de emitir documentos.',
      });
    }
    const credentials = this.cipher.decrypt(connection.encryptedCredentials);
    return {
      tenantId,
      environment: connection.environment,
      baseUrl: connection.baseUrl,
      ...credentials,
      timeoutMs: this.config.get('FACTUS_TIMEOUT_MS', { infer: true }),
    };
  }

  async getBranchConfiguration(
    tenantId: string,
    branchId: string,
  ): Promise<BranchFiscalConfigurationDto | null> {
    const config = await this.repository.findBranchConfiguration(tenantId, branchId);
    return config ? toBranchDto(config) : null;
  }

  async upsertBranchConfiguration(
    tenantId: string,
    branchId: string,
    actorUserId: string,
    dto: UpsertBranchFiscalConfigurationDto,
  ): Promise<BranchFiscalConfigurationDto> {
    if (!(await this.repository.isActiveBranch(tenantId, branchId))) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'La sede fiscal no existe o no esta activa.',
      });
    }
    const existing = await this.repository.findBranchConfiguration(tenantId, branchId);
    const data = toBranchData(dto, existing);
    if (data.isEnabled && !data.invoiceNumberingRangeId) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'Una sede habilitada para facturar requiere un rango de factura activo.',
      });
    }

    const saved = await this.repository.upsertBranchConfiguration({
      tenantId,
      branchId,
      actorUserId,
      data,
    });
    return toBranchDto(saved);
  }
}

export function normalizeFactusBaseUrl(
  value: string | undefined,
  environment: FactusEnvironment,
): string {
  const officialBaseUrl =
    environment === FactusEnvironment.PRODUCTION
      ? 'https://api.factus.com.co'
      : 'https://api-sandbox.factus.com.co';
  const candidate = (value?.trim() || officialBaseUrl).replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw invalidFactusBaseUrl(officialBaseUrl);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== officialBaseUrl ||
    parsed.pathname !== '/'
  ) {
    throw invalidFactusBaseUrl(officialBaseUrl);
  }
  return officialBaseUrl;
}

function invalidFactusBaseUrl(officialBaseUrl: string): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.VALIDATION_ERROR,
    message: `La URL de Factus debe ser ${officialBaseUrl} para el ambiente seleccionado.`,
  });
}

function toConnectionDto(connection: FactusConnection): FactusConnectionDto {
  return {
    environment: connection.environment,
    baseUrl: connection.baseUrl,
    status: connection.status,
    hasCredentials: Boolean(connection.encryptedCredentials),
    lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
    lastLatencyMs: connection.lastLatencyMs,
    lastErrorCode: connection.lastErrorCode,
    lastErrorMessage: connection.lastErrorMessage,
  };
}

function toBranchDto(config: BranchFiscalConfiguration): BranchFiscalConfigurationDto {
  return {
    branchId: config.branchId,
    establishmentName: config.establishmentName,
    establishmentCode: config.establishmentCode,
    establishmentAddress: config.establishmentAddress,
    establishmentMunicipality: config.establishmentMunicipality,
    establishmentPhone: config.establishmentPhone,
    invoiceNumberingRangeId: config.invoiceNumberingRangeId,
    creditNoteNumberingRangeId: config.creditNoteNumberingRangeId,
    supportNumberingRangeId: config.supportNumberingRangeId,
    adjustmentNumberingRangeId: config.adjustmentNumberingRangeId,
    isEnabled: config.isEnabled,
    updatedAt: config.updatedAt.toISOString(),
  };
}

function toBranchData(
  dto: UpsertBranchFiscalConfigurationDto,
  existing: BranchFiscalConfiguration | null,
) {
  return {
    establishmentName: normalizeOptional(
      dto.establishmentName === undefined ? existing?.establishmentName : dto.establishmentName,
    ),
    establishmentCode: normalizeOptional(
      dto.establishmentCode === undefined ? existing?.establishmentCode : dto.establishmentCode,
    ),
    establishmentAddress: normalizeOptional(
      dto.establishmentAddress === undefined
        ? existing?.establishmentAddress
        : dto.establishmentAddress,
    ),
    establishmentMunicipality: normalizeMunicipality(
      dto.establishmentMunicipality === undefined
        ? existing?.establishmentMunicipality
        : dto.establishmentMunicipality,
    ),
    establishmentPhone: normalizeOptional(
      dto.establishmentPhone === undefined ? existing?.establishmentPhone : dto.establishmentPhone,
    ),
    invoiceNumberingRangeId:
      dto.invoiceNumberingRangeId === undefined
        ? (existing?.invoiceNumberingRangeId ?? null)
        : dto.invoiceNumberingRangeId,
    creditNoteNumberingRangeId:
      dto.creditNoteNumberingRangeId === undefined
        ? (existing?.creditNoteNumberingRangeId ?? null)
        : dto.creditNoteNumberingRangeId,
    supportNumberingRangeId:
      dto.supportNumberingRangeId === undefined
        ? (existing?.supportNumberingRangeId ?? null)
        : dto.supportNumberingRangeId,
    adjustmentNumberingRangeId:
      dto.adjustmentNumberingRangeId === undefined
        ? (existing?.adjustmentNumberingRangeId ?? null)
        : dto.adjustmentNumberingRangeId,
    isEnabled: dto.isEnabled ?? existing?.isEnabled ?? false,
  };
}

function normalizeOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeMunicipality(value: string | null | undefined): string | null {
  const normalized = normalizeOptional(value);
  if (normalized && !/^\d{5}$/.test(normalized)) {
    throw new ApplicationException(400, {
      code: ApiErrorCode.BAD_REQUEST,
      message: 'El municipio de la sede debe usar un codigo DIVIPOLA de cinco digitos.',
    });
  }
  return normalized;
}

function sanitizeProviderMessage(value: string): string {
  return value.replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]').slice(0, 240);
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
