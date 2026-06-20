import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { TenantStatusGuard } from './tenant-status.guard';
import type { TenantAccessCacheService } from '../../../../common/access/tenant-access-cache.service';
import type { AuthenticatedUser } from '../../auth.types';

describe('TenantStatusGuard', () => {
  const cache = { getTenantStatus: jest.fn() };
  const guard = new TenantStatusGuard(cache as unknown as TenantAccessCacheService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows active tenants from cache', async () => {
    cache.getTenantStatus.mockResolvedValue('ACTIVE');

    await expect(guard.canActivate(createContext(user()))).resolves.toBe(true);
    expect(cache.getTenantStatus).toHaveBeenCalledWith('tenant_1');
  });

  it('blocks suspended tenants from cache', async () => {
    cache.getTenantStatus.mockResolvedValue('SUSPENDED');

    await expect(guard.canActivate(createContext(user()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

function createContext(authenticatedUser: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: authenticatedUser }),
    }),
  } as unknown as ExecutionContext;
}

function user(): AuthenticatedUser {
  return {
    id: 'user_1',
    email: 'owner@gastroai.local',
    fullName: 'Owner',
    role: 'OWNER',
    authScope: 'TENANT',
    permissions: [],
    availableRoles: [],
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    sessionId: 'session_1',
  };
}
