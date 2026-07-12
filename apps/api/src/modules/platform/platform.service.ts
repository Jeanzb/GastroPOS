import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import type {
  CreatePlatformBranchRequest,
  CreatePlatformTenantRequest,
  DeletePlatformTenantRequest,
  PlatformAuthResponse,
  PlatformHealthCheckDto,
  PlatformHealthDto,
  PlatformIntegrationLogDto,
  PlatformIntegrationSummaryDto,
  PlatformOverviewDto,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  PlatformFeatureDto,
  PlanDto,
  TenantFeatureOverrideDto,
  TenantStatus,
  UpdatePlatformTenantRequest,
} from '@gastroai/contracts';
import { TenantAccessCacheService } from '../../common/access/tenant-access-cache.service';
import { ApplicationException } from '../../common/errors/application.exception';
import { REDIS_CLIENT } from '../../common/redis';
import type { Env } from '../../config/env.schema';
import { AuditService } from '../audit/audit.service';
import { PasswordHashingService } from '../auth/application/password-hashing.service';
import {
  createRefreshTokenSecret,
  formatRefreshToken,
  parseRefreshToken,
} from '../auth/application/refresh-token.util';
import {
  toPlanDto,
  toPlatformFeatureDto,
  toPlatformTenantDetailDto,
  toPlatformTenantDto,
  toPlatformUserDto,
  toTenantFeatureOverrideDtos,
} from './platform.mapper';
import { PlatformRepository } from './platform.repository';
import { PlatformIntegrationService } from './platform-integration.service';
import type {
  AuthenticatedPlatformUser,
  PlatformAccessTokenPayload,
  PlatformAuthRequestMetadata,
} from './platform.types';

const INVALID_PLATFORM_CREDENTIALS = 'Invalid platform credentials.';

@Injectable()
export class PlatformService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly passwordHashing: PasswordHashingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly auditService: AuditService,
    private readonly tenantAccessCache: TenantAccessCacheService,
    private readonly integrations: PlatformIntegrationService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(input: {
    email: string;
    password: string;
    metadata: PlatformAuthRequestMetadata;
  }): Promise<PlatformAuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findPlatformUserByEmail(email);
    if (!user) {
      await this.passwordHashing.verifyAgainstDummy(input.password);
      await this.auditService.tryRecord({
        action: 'PLATFORM_FAILED_LOGIN',
        entityType: 'PlatformUser',
        metadata: { email, result: 'invalid_credentials' },
        ...input.metadata,
      });
      throw invalidPlatformCredentials();
    }

    const passwordMatches = await this.passwordHashing.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      await this.auditService.tryRecord({
        actorUserId: user.id,
        action: 'PLATFORM_FAILED_LOGIN',
        entityType: 'PlatformUser',
        entityId: user.id,
        metadata: { email, result: 'invalid_credentials' },
        ...input.metadata,
      });
      throw invalidPlatformCredentials();
    }

    const authResponse = await this.issueSession(
      { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      input.metadata,
    );
    await this.auditService.tryRecord({
      actorUserId: user.id,
      action: 'PLATFORM_LOGIN',
      entityType: 'PlatformUser',
      entityId: user.id,
      metadata: { result: 'success' },
      ...input.metadata,
    });
    return authResponse;
  }

  async refresh(input: {
    refreshToken: string;
    metadata: PlatformAuthRequestMetadata;
  }): Promise<PlatformAuthResponse> {
    const parsedToken = parseRefreshToken(input.refreshToken);
    if (!parsedToken) {
      throw invalidRefreshToken();
    }
    const storedToken = await this.repository.findPlatformRefreshTokenById(parsedToken.id);
    if (!storedToken || isPast(storedToken.expiresAt)) {
      throw invalidRefreshToken();
    }
    if (storedToken.revokedAt) {
      await this.repository.revokePlatformSession(storedToken.session.id);
      throw invalidRefreshToken();
    }
    const session = storedToken.session;
    if (!session.isActive || session.revokedAt || isPast(session.expiresAt)) {
      throw invalidRefreshToken();
    }
    const secretMatches = await this.passwordHashing.verify(
      parsedToken.secret,
      storedToken.tokenHash,
    );
    if (!secretMatches) {
      throw invalidRefreshToken();
    }

    const refreshSecret = createRefreshTokenSecret();
    const refreshTokenHash = await this.passwordHashing.hash(refreshSecret);
    const refreshExpiresAt = this.expiresAtFromNow();
    const rotatedToken = await this.repository.rotatePlatformRefreshToken({
      currentRefreshTokenId: storedToken.id,
      sessionId: session.id,
      familyId: storedToken.familyId,
      tokenHash: refreshTokenHash,
      refreshTokenExpiresAt: refreshExpiresAt,
      sessionExpiresAt: refreshExpiresAt,
    });
    const user: AuthenticatedPlatformUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      sessionId: session.id,
    };
    return {
      user: toPlatformUserDto(user),
      tokens: {
        accessToken: await this.signAccessToken(user),
        refreshToken: formatRefreshToken(rotatedToken.refreshTokenId, refreshSecret),
      },
    };
  }

  async logout(user: AuthenticatedPlatformUser): Promise<void> {
    await this.repository.revokePlatformSession(user.sessionId);
    await this.auditService.tryRecord({
      actorUserId: user.id,
      action: 'PLATFORM_LOGOUT',
      entityType: 'PlatformSession',
      entityId: user.sessionId,
      metadata: { result: 'success' },
    });
  }

  async getOverview(): Promise<PlatformOverviewDto> {
    const grouped = await this.repository.getOverview();
    const count = (status: TenantStatus) =>
      grouped.find((item) => item.status === status)?._count._all ?? 0;
    return {
      totalTenants: grouped.reduce((sum, item) => sum + item._count._all, 0),
      activeTenants: count('ACTIVE'),
      suspendedTenants: count('SUSPENDED'),
      trialTenants: count('TRIAL'),
      pastDueTenants: count('PAST_DUE'),
    };
  }

  async listTenants(): Promise<PlatformTenantDto[]> {
    return (await this.repository.listTenants()).map(toPlatformTenantDto);
  }

  async getTenant(id: string): Promise<PlatformTenantDetailDto> {
    const tenant = await this.repository.findTenantById(id);
    if (!tenant) {
      throw tenantNotFound();
    }
    return toPlatformTenantDetailDto(tenant);
  }

  async createTenant(
    actor: AuthenticatedPlatformUser,
    input: CreatePlatformTenantRequest,
  ): Promise<PlatformTenantDetailDto> {
    const passwordHash = await this.passwordHashing.hash(input.ownerTemporaryPassword);
    const slug = await this.generateInternalSlug(input.name);
    const tenant = await this.repository.createTenant({
      name: input.name.trim(),
      slug,
      ownerEmail: input.ownerEmail.trim().toLowerCase(),
      ownerFullName: input.ownerFullName.trim(),
      ownerPasswordHash: passwordHash,
      branchName: input.branchName.trim(),
      branchCode: input.branchCode.trim().toUpperCase(),
      branchCity: input.branchCity.trim(),
      branchAddress: normalizeOptional(input.branchAddress),
      branchPhone: normalizeOptional(input.branchPhone),
    });
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_CREATED',
      entityType: 'Tenant',
      entityId: tenant.id,
      metadata: { internalSlug: slug, plan: 'BASIC' },
    });
    return toPlatformTenantDetailDto(tenant);
  }

  async createBranch(
    actor: AuthenticatedPlatformUser,
    tenantId: string,
    input: CreatePlatformBranchRequest,
  ): Promise<PlatformTenantDetailDto> {
    await this.getTenant(tenantId);
    try {
      await this.repository.createBranch({
        tenantId,
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        city: input.city.trim(),
        address: normalizeOptional(input.address),
        phone: normalizeOptional(input.phone),
        actorUserId: actor.id,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApplicationException(409, {
          code: 'BRANCH_CODE_EXISTS',
          message: 'A branch with this code already exists for this restaurant.',
        });
      }
      throw error;
    }
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_BRANCH_CREATED',
      entityType: 'Branch',
      entityId: tenantId,
      metadata: { tenantId, branchCode: input.code.trim().toUpperCase() },
    });
    return this.getTenant(tenantId);
  }

  async updateTenantStatus(
    actor: AuthenticatedPlatformUser,
    id: string,
    status: TenantStatus,
    suspensionReason?: string | null,
  ): Promise<PlatformTenantDetailDto> {
    await this.getTenant(id);
    const tenant = await this.repository.updateTenantStatus(id, status, suspensionReason);
    await this.tenantAccessCache.setTenantStatus(id, status);
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_STATUS_CHANGED',
      entityType: 'Tenant',
      entityId: id,
      metadata: { status, suspensionReason: suspensionReason ?? null },
    });
    return toPlatformTenantDetailDto(tenant);
  }

  async updateTenantBasics(
    actor: AuthenticatedPlatformUser,
    id: string,
    input: UpdatePlatformTenantRequest,
  ): Promise<PlatformTenantDetailDto> {
    const before = await this.getTenant(id);
    const tenant = await this.repository.updateTenantName(id, input.name.trim());
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_UPDATED',
      entityType: 'Tenant',
      entityId: id,
      before: { name: before.name },
      after: { name: tenant.name },
    });
    return toPlatformTenantDetailDto(tenant);
  }

  async updateTenantPlan(
    actor: AuthenticatedPlatformUser,
    id: string,
    planCode: 'BASIC',
  ): Promise<PlatformTenantDetailDto> {
    await this.getTenant(id);
    const tenant = await this.repository.updateTenantPlan(id, planCode);
    await this.tenantAccessCache.invalidateTenantFeatures(id);
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_PLAN_CHANGED',
      entityType: 'Tenant',
      entityId: id,
      metadata: { planCode },
    });
    return toPlatformTenantDetailDto(tenant);
  }

  async deleteTenant(
    actor: AuthenticatedPlatformUser,
    id: string,
    input: DeletePlatformTenantRequest,
  ): Promise<void> {
    const tenant = await this.repository.findTenantById(id);
    if (!tenant) {
      throw tenantNotFound();
    }

    const expectedPhrase = tenantDeletePhrase(tenant.name);
    if (
      normalizeConfirmationPhrase(input.confirmationPhrase) !== expectedPhrase ||
      normalizeConfirmationPhrase(input.repeatedConfirmationPhrase) !== expectedPhrase
    ) {
      throw invalidTenantDeleteConfirmation(expectedPhrase);
    }

    await this.repository.archiveTenant(id);
    await this.tenantAccessCache.setTenantStatus(id, 'ARCHIVED');
    await this.tenantAccessCache.invalidateTenantFeatures(id);
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_DELETED',
      entityType: 'Tenant',
      entityId: id,
      before: { status: tenant.status, isActive: tenant.isActive, deletedAt: null },
      after: { status: 'ARCHIVED', isActive: false },
      metadata: { tenantName: tenant.name, confirmationPhrase: expectedPhrase },
    });
  }

  async listPlans(): Promise<PlanDto[]> {
    return (await this.repository.listPlans()).map(toPlanDto);
  }

  async listFeatures(): Promise<PlatformFeatureDto[]> {
    return (await this.repository.listFeatures()).map(toPlatformFeatureDto);
  }

  async listTenantFeatures(id: string): Promise<TenantFeatureOverrideDto[]> {
    const tenant = await this.repository.findTenantFeatures(id);
    if (!tenant) {
      throw tenantNotFound();
    }
    return toTenantFeatureOverrideDtos(tenant);
  }

  async getHealth(): Promise<PlatformHealthDto> {
    const checks: PlatformHealthCheckDto[] = [
      { name: 'api', status: 'operational', latencyMs: 0 },
      await this.checkPostgres(),
      await this.checkRedis(),
      await this.integrations.getFactusHealthCheck(),
    ];
    const hasDown = checks.some((check) => check.status === 'down');
    const hasDegraded = checks.some((check) => check.status === 'degraded');
    return {
      status: hasDown ? 'down' : hasDegraded ? 'degraded' : 'operational',
      checkedAt: new Date().toISOString(),
      checks,
    };
  }

  getIntegrationSummary(): Promise<PlatformIntegrationSummaryDto> {
    return this.integrations.getSummary();
  }

  listIntegrationLogs(take: number): Promise<PlatformIntegrationLogDto[]> {
    return this.integrations.listLogs(take);
  }

  async updateTenantFeatureOverride(
    actor: AuthenticatedPlatformUser,
    id: string,
    featureCode: string,
    input: { enabled: boolean; reason?: string | null },
  ): Promise<TenantFeatureOverrideDto[]> {
    const updated = await this.repository.upsertTenantFeatureOverride({
      tenantId: id,
      featureCode,
      enabled: input.enabled,
      reason: input.reason,
      actorUserId: actor.id,
    });
    if (!updated) {
      throw tenantFeatureNotFound();
    }
    await this.tenantAccessCache.invalidateTenantFeatures(id);
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_FEATURE_OVERRIDE_CHANGED',
      entityType: 'TenantFeatureOverride',
      entityId: id,
      metadata: { featureCode, enabled: input.enabled, reason: input.reason ?? null },
    });
    return this.listTenantFeatures(id);
  }

  async deleteTenantFeatureOverride(
    actor: AuthenticatedPlatformUser,
    id: string,
    featureCode: string,
  ): Promise<TenantFeatureOverrideDto[]> {
    await this.getTenant(id);
    await this.repository.deleteTenantFeatureOverride(id, featureCode);
    await this.tenantAccessCache.invalidateTenantFeatures(id);
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_FEATURE_OVERRIDE_REMOVED',
      entityType: 'TenantFeatureOverride',
      entityId: id,
      metadata: { featureCode },
    });
    return this.listTenantFeatures(id);
  }

  private async issueSession(
    user: Omit<AuthenticatedPlatformUser, 'sessionId'>,
    metadata: PlatformAuthRequestMetadata,
  ): Promise<PlatformAuthResponse> {
    const refreshSecret = createRefreshTokenSecret();
    const refreshTokenHash = await this.passwordHashing.hash(refreshSecret);
    const refreshExpiresAt = this.expiresAtFromNow();
    const sessionToken = await this.repository.createPlatformSession({
      platformUserId: user.id,
      tokenHash: refreshTokenHash,
      familyId: randomUUID(),
      sessionExpiresAt: refreshExpiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    const authenticatedUser = { ...user, sessionId: sessionToken.sessionId };
    return {
      user: toPlatformUserDto(authenticatedUser),
      tokens: {
        accessToken: await this.signAccessToken(authenticatedUser),
        refreshToken: formatRefreshToken(sessionToken.refreshTokenId, refreshSecret),
      },
    };
  }

  private async signAccessToken(user: AuthenticatedPlatformUser): Promise<string> {
    const payload: PlatformAccessTokenPayload = {
      sub: user.id,
      authScope: 'PLATFORM',
      platformRole: user.role,
      sessionId: user.sessionId,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get('PLATFORM_JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      issuer: this.config.get('PLATFORM_JWT_ISSUER', { infer: true }),
      audience: this.config.get('JWT_AUDIENCE', { infer: true }),
    });
  }

  private expiresAtFromNow(): Date {
    return new Date(Date.now() + this.config.get('JWT_REFRESH_TTL', { infer: true }) * 1000);
  }

  private async generateInternalSlug(name: string): Promise<string> {
    const base = slugify(name) || `tenant-${randomUUID().slice(0, 8)}`;
    if (!(await this.repository.slugExists(base))) {
      return base;
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `${base}-${randomUUID().slice(0, 6)}`;
      if (!(await this.repository.slugExists(candidate))) {
        return candidate;
      }
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async checkPostgres(): Promise<PlatformHealthCheckDto> {
    const startedAt = Date.now();
    try {
      await this.repository.pingDatabase();
      return { name: 'postgres', status: 'operational', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        name: 'postgres',
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message: errorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<PlatformHealthCheckDto> {
    const startedAt = Date.now();
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
      return { name: 'redis', status: 'operational', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        name: 'redis',
        status: 'degraded',
        latencyMs: Date.now() - startedAt,
        message: errorMessage(error),
      };
    }
  }
}

function invalidPlatformCredentials(): ApplicationException {
  return new ApplicationException(401, {
    code: 'INVALID_PLATFORM_CREDENTIALS',
    message: INVALID_PLATFORM_CREDENTIALS,
  });
}

function invalidRefreshToken(): ApplicationException {
  return new ApplicationException(401, {
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Invalid refresh token.',
  });
}

function tenantNotFound(): ApplicationException {
  return new ApplicationException(404, {
    code: 'TENANT_NOT_FOUND',
    message: 'Tenant was not found.',
  });
}

function tenantFeatureNotFound(): ApplicationException {
  return new ApplicationException(404, {
    code: 'TENANT_FEATURE_NOT_FOUND',
    message: 'Tenant or feature was not found.',
  });
}

function invalidTenantDeleteConfirmation(expectedPhrase: string): ApplicationException {
  return new ApplicationException(400, {
    code: 'TENANT_DELETE_CONFIRMATION_MISMATCH',
    message: 'Tenant delete confirmation does not match.',
    details: { expectedPhrase },
  });
}

function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}

function normalizeOptional(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function tenantDeletePhrase(tenantName: string): string {
  return `delete ${tenantName.trim().toLowerCase()} tenant`;
}

function normalizeConfirmationPhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
