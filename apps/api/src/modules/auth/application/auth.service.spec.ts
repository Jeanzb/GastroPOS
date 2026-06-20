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

describe('AuthService PIN login', () => {
  function buildService(overrides: {
    candidates?: unknown[];
    verifyResult?: boolean;
  }) {
    const authRepository = {
      findActivePinCandidatesByBranch: jest.fn().mockResolvedValue(overrides.candidates ?? []),
      resetPinAttempts: jest.fn().mockResolvedValue(undefined),
      createSessionWithRefreshToken: jest
        .fn()
        .mockResolvedValue({ sessionId: 'session_1', refreshTokenId: 'rt_1' }),
    };
    const passwordHashing = {
      verify: jest.fn().mockResolvedValue(overrides.verifyResult ?? false),
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
    fullName: 'Diego Granados',
    role: 'WAITER' as const,
    pinHash: 'pin_hash',
    pinLockedUntil: null,
  };

  it('issues a session when the PIN matches an active employee of the branch', async () => {
    const { service, authRepository, auditService } = buildService({
      candidates: [candidate],
      verifyResult: true,
    });

    const result = await service.pinLogin({ branchId: 'branch_1', pin: '4821', metadata: {} });

    expect(result.user.id).toBe('user_1');
    expect(result.tokens.accessToken).toBe('access_token');
    expect(authRepository.resetPinAttempts).toHaveBeenCalledWith('user_1');
    expect(auditService.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PIN_LOGIN' }),
    );
  });

  it('rejects when no employee in the branch matches the PIN', async () => {
    const { service, authRepository } = buildService({ candidates: [], verifyResult: false });

    await expect(
      service.pinLogin({ branchId: 'other_branch', pin: '0000', metadata: {} }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(authRepository.createSessionWithRefreshToken).not.toHaveBeenCalled();
  });
});
