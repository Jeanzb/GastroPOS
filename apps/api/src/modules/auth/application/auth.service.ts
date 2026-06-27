import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApplicationException } from '../../../common/errors/application.exception';
import { AuditService } from '../../audit/audit.service';
import { UsersRepository } from '../../users/users.repository';
import type { LoginUserRecord } from '../../users/users.types';
import type { Env } from '../../../config/env.schema';
import {
  type AccessTokenPayload,
  type AuthenticatedUser,
  type AuthRequestMetadata,
  type AuthResponse,
  type TenantAuthScope,
} from '../auth.types';
import { AuthRepository } from '../infrastructure/auth.repository';
import { PasswordHashingService } from './password-hashing.service';
import { buildAccessProfile } from './access-profile';
import {
  createRefreshTokenSecret,
  formatRefreshToken,
  parseRefreshToken,
} from './refresh-token.util';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

type SessionUserRecord = Pick<
  LoginUserRecord,
  'id' | 'tenantId' | 'branchId' | 'email' | 'fullName' | 'role'
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly passwordHashing: PasswordHashingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly auditService: AuditService,
  ) {}

  async login(input: {
    email: string;
    password: string;
    tenantIdentifier?: string;
    tenantSlug?: string;
    metadata: AuthRequestMetadata;
  }): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const users = await this.usersRepository.findActiveLoginCandidates(
      email,
      input.tenantIdentifier,
      input.tenantSlug,
    );

    if (users.length === 0) {
      await this.passwordHashing.verifyAgainstDummy(input.password);
      await this.auditFailedLogin(email, input.tenantIdentifier ?? input.tenantSlug, input.metadata);
      throw invalidCredentials();
    }

    if (users.length > 1) {
      throw new ApplicationException(400, {
        code: 'TENANT_AMBIGUOUS',
        message: 'Restaurant identifier is ambiguous.',
      });
    }

    const user = users[0];
    const passwordMatches = await this.passwordHashing.verify(input.password, user.passwordHash);

    if (!passwordMatches) {
      await this.auditFailedLogin(email, input.tenantIdentifier ?? input.tenantSlug, input.metadata);
      throw invalidCredentials();
    }

    const authResponse = await this.issueSession(user, input.metadata);

    await this.auditService.tryRecord({
      tenantId: user.tenantId,
      branchId: user.branchId,
      actorUserId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      metadata: { result: 'success' },
      ...input.metadata,
    });

    return authResponse;
  }

  async refresh(input: {
    refreshToken: string;
    metadata: AuthRequestMetadata;
  }): Promise<AuthResponse> {
    const parsedToken = parseRefreshToken(input.refreshToken);
    if (!parsedToken) {
      throw invalidRefreshToken();
    }

    const storedToken = await this.authRepository.findRefreshTokenById(parsedToken.id);
    if (!storedToken || isPast(storedToken.expiresAt)) {
      throw invalidRefreshToken();
    }

    if (storedToken.revokedAt) {
      await this.authRepository.revokeSession(storedToken.session.id);
      await this.auditService.tryRecord({
        tenantId: storedToken.session.tenantId,
        branchId: storedToken.session.branchId,
        actorUserId: storedToken.session.user.id,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'Session',
        entityId: storedToken.session.id,
        metadata: { refreshTokenFamilyId: storedToken.familyId },
        ...input.metadata,
      });
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
    const refreshExpiresAt = this.expiresAtFromNow('JWT_REFRESH_TTL');
    const rotatedToken = await this.authRepository.rotateRefreshToken({
      currentRefreshTokenId: storedToken.id,
      sessionId: session.id,
      familyId: storedToken.familyId,
      tokenHash: refreshTokenHash,
      refreshTokenExpiresAt: refreshExpiresAt,
      sessionExpiresAt: refreshExpiresAt,
    });

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      authScope: session.authScope === 'POS' ? 'POS' : 'TENANT',
      ...buildAccessProfile(session.user.role),
      tenantId: session.user.tenantId,
      branchId: session.branchId,
      sessionId: session.id,
    };

    await this.auditService.tryRecord({
      tenantId: user.tenantId,
      branchId: user.branchId,
      actorUserId: user.id,
      action: 'REFRESH_TOKEN_ROTATED',
      entityType: 'Session',
      entityId: session.id,
      metadata: { refreshTokenFamilyId: storedToken.familyId },
      ...input.metadata,
    });

    return {
      user,
      tokens: {
        accessToken: await this.signAccessToken(user),
        refreshToken: formatRefreshToken(rotatedToken.refreshTokenId, refreshSecret),
      },
    };
  }

  async logout(user: AuthenticatedUser, metadata: AuthRequestMetadata): Promise<void> {
    await this.authRepository.revokeSession(user.sessionId);
    await this.auditService.tryRecord({
      tenantId: user.tenantId,
      branchId: user.branchId,
      actorUserId: user.id,
      action: 'LOGOUT',
      entityType: 'Session',
      entityId: user.sessionId,
      metadata: { result: 'success' },
      ...metadata,
    });
  }

  async staffLogin(input: {
    commerce: string;
    documentNumber: string;
    metadata: AuthRequestMetadata;
  }): Promise<AuthResponse> {
    const candidate = await this.authRepository.findActiveStaffByCommerceAndDocument(
      input.commerce,
      input.documentNumber,
    );

    if (!candidate) {
      await this.auditFailedStaffLogin(input.commerce, input.metadata);
      throw invalidStaffLogin();
    }

    if (candidate.pinLockedUntil && candidate.pinLockedUntil.getTime() > Date.now()) {
      await this.auditFailedStaffLogin(input.commerce, input.metadata);
      throw invalidStaffLogin();
    }

    await this.authRepository.resetPinAttempts(candidate.id);
    const authResponse = await this.issueSession(candidate, input.metadata, 'POS');
    await this.auditService.tryRecord({
      tenantId: candidate.tenantId,
      branchId: candidate.branchId,
      actorUserId: candidate.id,
      action: 'STAFF_LOGIN',
      entityType: 'User',
      entityId: candidate.id,
      metadata: { result: 'success' },
      ...input.metadata,
    });
    return authResponse;
  }

  private async issueSession(
    user: SessionUserRecord,
    metadata: AuthRequestMetadata,
    authScope: TenantAuthScope = 'TENANT',
  ): Promise<AuthResponse> {
    const refreshSecret = createRefreshTokenSecret();
    const refreshTokenHash = await this.passwordHashing.hash(refreshSecret);
    const refreshExpiresAt = this.expiresAtFromNow('JWT_REFRESH_TTL');
    const sessionToken = await this.authRepository.createSessionWithRefreshToken({
      tenantId: user.tenantId,
      branchId: user.branchId,
      userId: user.id,
      authScope,
      refreshTokenHash,
      refreshTokenFamilyId: randomUUID(),
      sessionExpiresAt: refreshExpiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      authScope,
      ...buildAccessProfile(user.role),
      tenantId: user.tenantId,
      branchId: user.branchId,
      sessionId: sessionToken.sessionId,
    };

    return {
      user: authenticatedUser,
      tokens: {
        accessToken: await this.signAccessToken(authenticatedUser),
        refreshToken: formatRefreshToken(sessionToken.refreshTokenId, refreshSecret),
      },
    };
  }

  private async signAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      authScope: user.authScope,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      sessionId: user.sessionId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.get('TENANT_JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      issuer: this.config.get('TENANT_JWT_ISSUER', { infer: true }),
      audience: this.config.get('JWT_AUDIENCE', { infer: true }),
    });
  }

  private expiresAtFromNow(configKey: 'JWT_REFRESH_TTL'): Date {
    const seconds = this.config.get(configKey, { infer: true });
    return new Date(Date.now() + seconds * 1000);
  }

  private async auditFailedLogin(
    email: string,
    tenantIdentifier: string | undefined,
    metadata: AuthRequestMetadata,
  ): Promise<void> {
    await this.auditService.tryRecord({
      action: 'FAILED_LOGIN',
      entityType: 'User',
      metadata: {
        email,
        tenantIdentifier,
        result: 'invalid_credentials',
      },
      ...metadata,
    });
  }

  private async auditFailedStaffLogin(
    commerce: string,
    metadata: AuthRequestMetadata,
  ): Promise<void> {
    await this.auditService.tryRecord({
      action: 'FAILED_STAFF_LOGIN',
      entityType: 'User',
      metadata: { commerce, result: 'invalid_document' },
      ...metadata,
    });
  }
}

function invalidCredentials(): ApplicationException {
  return new ApplicationException(401, {
    code: 'INVALID_CREDENTIALS',
    message: INVALID_CREDENTIALS_MESSAGE,
  });
}

function invalidStaffLogin(): ApplicationException {
  return new ApplicationException(401, {
    code: 'INVALID_STAFF_LOGIN',
    message: 'Invalid ID number for this branch.',
  });
}

function invalidRefreshToken(): ApplicationException {
  return new ApplicationException(401, {
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Invalid refresh token.',
  });
}

function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}
