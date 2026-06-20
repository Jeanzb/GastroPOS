import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { FeatureGuard } from './feature.guard';
import type { TenantAccessCacheService } from '../../../../common/access/tenant-access-cache.service';
import type { AuthenticatedUser } from '../../auth.types';

describe('FeatureGuard', () => {
  const reflector = new Reflector();
  const cache = { getTenantFeatures: jest.fn() };
  const guard = new FeatureGuard(reflector, cache as unknown as TenantAccessCacheService);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('inventory.enabled');
  });

  it('allows enabled cached features', async () => {
    cache.getTenantFeatures.mockResolvedValue({ 'inventory.enabled': true });

    await expect(guard.canActivate(createContext(user()))).resolves.toBe(true);
  });

  it('blocks disabled cached features', async () => {
    cache.getTenantFeatures.mockResolvedValue({ 'inventory.enabled': false });

    await expect(guard.canActivate(createContext(user()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

function createContext(authenticatedUser: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
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
