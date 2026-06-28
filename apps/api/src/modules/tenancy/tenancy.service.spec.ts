import { TenancyService } from './tenancy.service';
import type { TenancyRepository } from './tenancy.repository';
import type { TenantRequestContext } from '../auth/auth.types';

describe('TenancyService', () => {
  const repository = {
    listBranches: jest.fn(),
  } as unknown as jest.Mocked<Pick<TenancyRepository, 'listBranches'>>;

  const service = new TenancyService(repository as unknown as TenancyRepository);

  beforeEach(() => {
    repository.listBranches.mockReset();
    repository.listBranches.mockResolvedValue([]);
  });

  it('lets tenant-wide roles list all tenant branches', async () => {
    await service.listBranches(ctx({ role: 'ADMIN', branchId: 'branch_1' }));

    expect(repository.listBranches).toHaveBeenCalledWith('tenant_1', undefined);
  });

  it('limits operational roles to their assigned branch', async () => {
    await service.listBranches(ctx({ role: 'CASHIER', branchId: 'branch_1' }));

    expect(repository.listBranches).toHaveBeenCalledWith('tenant_1', 'branch_1');
  });

  it('does not fall back to all branches for operational users without branch', async () => {
    await expect(
      service.listBranches(ctx({ role: 'WAITER', branchId: null })),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    });

    expect(repository.listBranches).not.toHaveBeenCalled();
  });
});

function ctx(input: {
  role: TenantRequestContext['role'];
  branchId: string | null;
}): TenantRequestContext {
  return {
    tenantId: 'tenant_1',
    branchId: input.branchId,
    actorUserId: 'user_1',
    role: input.role,
    authScope: 'TENANT',
    permissions: [],
    sessionId: 'session_1',
  };
}
