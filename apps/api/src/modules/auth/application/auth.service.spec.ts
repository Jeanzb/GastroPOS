import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../config/env.schema';
import { ApplicationException } from '../../../common/errors/application.exception';
import type { AuditService } from '../../audit/audit.service';
import type { UsersRepository } from '../../users/users.repository';
import type { AuthRepository } from '../infrastructure/auth.repository';
import { AuthService } from './auth.service';
import type { PasswordHashingService } from './password-hashing.service';
import { formatRefreshToken } from './refresh-token.util';

function buildRevokedTokenRecord() {
  return {
    id: 'rt_1',
    tokenHash: 'hash',
    familyId: 'fam_1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: new Date(Date.now() - 1_000),
    session: {
      id: 'session_1',
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user_1',
        tenantId: 'tenant_1',
        email: 'owner@gastroai.local',
        fullName: 'Owner',
        role: 'OWNER' as const,
      },
    },
  };
}

describe('AuthService refresh-token reuse detection', () => {
  it('revokes the session and audits when a rotated token is replayed', async () => {
    const authRepository = {
      findRefreshTokenById: jest.fn().mockResolvedValue(buildRevokedTokenRecord()),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };
    const auditService = { tryRecord: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      {} as unknown as UsersRepository,
      authRepository as unknown as AuthRepository,
      {} as unknown as PasswordHashingService,
      {} as unknown as JwtService,
      {} as unknown as ConfigService<Env, true>,
      auditService as unknown as AuditService,
    );

    await expect(
      service.refresh({
        refreshToken: formatRefreshToken('rt_1', 'secret'),
        metadata: {},
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(authRepository.revokeSession).toHaveBeenCalledWith('session_1');
    expect(auditService.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REFRESH_TOKEN_REUSE_DETECTED' }),
    );
  });
});

describe('AuthService staff login', () => {
  function buildService(overrides: { candidate?: unknown }) {
    const authRepository = {
      findActiveStaffByCommerceAndDocument: jest.fn().mockResolvedValue(overrides.candidate ?? null),
      resetPinAttempts: jest.fn().mockResolvedValue(undefined),
      createSessionWithRefreshToken: jest
        .fn()
        .mockResolvedValue({ sessionId: 'session_1', refreshTokenId: 'rt_1' }),
    };
    const passwordHashing = {
      verify: jest.fn().mockResolvedValue(false),
      verifyAgainstDummy: jest.fn().mockResolvedValue(undefined),
      hash: jest.fn().mockResolvedValue('refresh_hash'),
    };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('access_token') };
    const config = { get: jest.fn().mockReturnValue(900) };
    const auditService = { tryRecord: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      {} as unknown as UsersRepository,
      authRepository as unknown as AuthRepository,
      passwordHashing as unknown as PasswordHashingService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService<Env, true>,
      auditService as unknown as AuditService,
    );

    return { service, authRepository, passwordHashing, auditService };
  }

  const candidate = {
    id: 'user_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    email: 'mesero@gastroai.local',
    fullName: 'Diego Gomez',
    role: 'WAITER' as const,
    pinLockedUntil: null,
  };

  it('issues a session when the cédula matches an active employee of the commerce', async () => {
    const { service, authRepository, auditService } = buildService({ candidate });

    const result = await service.staffLogin({
      commerce: 'GastroAI Demo',
      documentNumber: '1098765432',
      metadata: {},
    });

    expect(result.user.id).toBe('user_1');
    expect(result.tokens.accessToken).toBe('access_token');
    expect(authRepository.resetPinAttempts).toHaveBeenCalledWith('user_1');
    expect(auditService.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STAFF_LOGIN' }),
    );
  });

  it('rejects when no employee in the commerce matches the cédula', async () => {
    const { service, authRepository } = buildService({ candidate: null });

    await expect(
      service.staffLogin({ commerce: 'Unknown', documentNumber: '0000', metadata: {} }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(authRepository.createSessionWithRefreshToken).not.toHaveBeenCalled();
  });
});
