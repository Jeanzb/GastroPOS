import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  CreatePlatformTenantRequest,
  PlatformAuthResponse,
  PlatformOverviewDto,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  PlatformFeatureDto,
  PlanDto,
  TenantFeatureOverrideDto,
  TenantStatus,
} from '@gastroai/contracts';
import { TenantAccessCacheService } from '../../common/access/tenant-access-cache.service';
import { ApplicationException } from '../../common/errors/application.exception';
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
    const tenant = await this.repository.createTenant({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      ownerEmail: input.ownerEmail.trim().toLowerCase(),
      ownerFullName: input.ownerFullName.trim(),
      ownerPasswordHash: passwordHash,
      branchName: input.branchName.trim(),
      branchCode: input.branchCode.trim().toUpperCase(),
    });
    await this.auditService.tryRecord({
      actorUserId: actor.id,
      action: 'PLATFORM_TENANT_CREATED',
      entityType: 'Tenant',
      entityId: tenant.id,
      metadata: { slug: tenant.slug, plan: 'BASIC' },
    });
    return toPlatformTenantDetailDto(tenant);
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

function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}
