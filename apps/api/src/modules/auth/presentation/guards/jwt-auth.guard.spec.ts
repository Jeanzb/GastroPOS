import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../../../generated/prisma';
import { JwtAuthGuard } from './jwt-auth.guard';

interface TestRequest {
  headers: Record<string, string>;
  user?: unknown;
}

describe('JwtAuthGuard', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        TENANT_JWT_ACCESS_SECRET: 'tenant-secret',
        TENANT_JWT_ISSUER: 'gastroai-tenant',
        JWT_AUDIENCE: 'gastroai',
      };
      return values[key];
    }),
  };
  const jwtService = { verifyAsync: jest.fn() };
  const authRepository = {
    findAuthenticatedUserBySession: jest.fn(),
    branchExistsForTenant: jest.fn(),
  };
  const tenantContext = { set: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts tenant tokens signed in the tenant boundary', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      email: 'owner@gastroai.local',
      authScope: 'TENANT',
      role: UserRole.OWNER,
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.findAuthenticatedUserBySession.mockResolvedValue({
      id: 'user_1',
      email: 'owner@gastroai.local',
      fullName: 'Owner',
      role: UserRole.OWNER,
      authScope: 'TENANT',
      permissions: [],
      availableRoles: [],
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.branchExistsForTenant.mockResolvedValue(true);

    const guard = new JwtAuthGuard(jwtService as never, config as never, authRepository as never, tenantContext as never);
    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
      secret: 'tenant-secret',
      issuer: 'gastroai-tenant',
      audience: 'gastroai',
    });
  });

  it('allows tenant-wide roles to operate a selected branch from the branch header', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      email: 'owner@gastroai.local',
      authScope: 'TENANT',
      role: UserRole.OWNER,
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.findAuthenticatedUserBySession.mockResolvedValue({
      id: 'user_1',
      email: 'owner@gastroai.local',
      fullName: 'Owner',
      role: UserRole.OWNER,
      authScope: 'TENANT',
      permissions: [],
      availableRoles: [],
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.branchExistsForTenant.mockResolvedValue(true);

    const request = {
      headers: {
        authorization: 'Bearer token',
        'x-gastroia-branch-id': 'branch_2',
      },
    };

    const guard = new JwtAuthGuard(jwtService as never, config as never, authRepository as never, tenantContext as never);
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(request).toMatchObject({ user: { branchId: 'branch_2' } });
    expect(tenantContext.set).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      branchId: 'branch_2',
      actorUserId: 'user_1',
    });
  });

  it('rejects operational roles trying to operate another branch from the branch header', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      email: 'cashier@gastroai.local',
      authScope: 'TENANT',
      role: UserRole.CASHIER,
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.findAuthenticatedUserBySession.mockResolvedValue({
      id: 'user_1',
      email: 'cashier@gastroai.local',
      fullName: 'Cashier',
      role: UserRole.CASHIER,
      authScope: 'TENANT',
      permissions: [],
      availableRoles: [],
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      sessionId: 'session_1',
    });
    authRepository.branchExistsForTenant.mockResolvedValue(true);

    const guard = new JwtAuthGuard(jwtService as never, config as never, authRepository as never, tenantContext as never);
    await expect(
      guard.canActivate(
        createContext({
          headers: {
            authorization: 'Bearer token',
            'x-gastroia-branch-id': 'branch_2',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects platform-shaped tokens on tenant endpoints', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'platform_1',
      authScope: 'PLATFORM',
      platformRole: 'PLATFORM_OWNER',
      sessionId: 'platform_session_1',
    });

    const guard = new JwtAuthGuard(jwtService as never, config as never, authRepository as never, tenantContext as never);
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createContext(
  request: TestRequest = { headers: { authorization: 'Bearer token' } },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
