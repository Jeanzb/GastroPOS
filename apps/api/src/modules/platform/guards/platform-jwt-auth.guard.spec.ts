import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PlatformJwtAuthGuard } from './platform-jwt-auth.guard';

describe('PlatformJwtAuthGuard', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        PLATFORM_JWT_ACCESS_SECRET: 'platform-secret',
        PLATFORM_JWT_ISSUER: 'gastroai-platform',
        JWT_AUDIENCE: 'gastroai',
      };
      return values[key];
    }),
  };
  const jwtService = { verifyAsync: jest.fn() };
  const repository = { findAuthenticatedPlatformUserBySession: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts platform tokens signed in the platform boundary', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'platform_1',
      authScope: 'PLATFORM',
      platformRole: 'PLATFORM_OWNER',
      sessionId: 'platform_session_1',
    });
    repository.findAuthenticatedPlatformUserBySession.mockResolvedValue({
      id: 'platform_1',
      email: 'platform@gastroai.local',
      fullName: 'Platform Owner',
      role: 'PLATFORM_OWNER',
      sessionId: 'platform_session_1',
    });

    const guard = new PlatformJwtAuthGuard(jwtService as never, config as never, repository as never);
    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
      secret: 'platform-secret',
      issuer: 'gastroai-platform',
      audience: 'gastroai',
    });
  });

  it('rejects tenant-shaped tokens on platform endpoints', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      email: 'owner@gastroai.local',
      authScope: 'TENANT',
      role: 'OWNER',
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });

    const guard = new PlatformJwtAuthGuard(jwtService as never, config as never, repository as never);
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createContext(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
    }),
  } as unknown as ExecutionContext;
}
