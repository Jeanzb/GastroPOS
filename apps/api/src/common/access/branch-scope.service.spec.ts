import type { PrismaService } from '../../database/prisma.service';
import type { TenantRequestContext } from '../../modules/auth/auth.types';
import { BranchScopeService } from './branch-scope.service';

const cashierCtx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'CASHIER',
  permissions: [],
  sessionId: 'session_1',
};

const ownerCtx: TenantRequestContext = {
  ...cashierCtx,
  branchId: null,
  role: 'OWNER',
};

describe('BranchScopeService', () => {
  let prisma: { branch: { findFirst: jest.Mock } };
  let service: BranchScopeService;

  beforeEach(() => {
    prisma = {
      branch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'branch_1' }),
      },
    };
    service = new BranchScopeService(prisma as unknown as PrismaService);
  });

  it('resolves the actor branch for operational users when no branch is requested', async () => {
    await expect(service.require(cashierCtx)).resolves.toBe('branch_1');

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 'branch_1', tenantId: 'tenant_1', deletedAt: null, isActive: true },
      select: { id: true },
    });
  });

  it('blocks an operational user from operating another branch before querying the DB', async () => {
    await expect(service.require(cashierCtx, 'branch_2')).rejects.toMatchObject({ status: 403 });

    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
  });

  it('hides branches from another tenant behind a not found response for global tenant roles', async () => {
    prisma.branch.findFirst.mockResolvedValueOnce(null);

    await expect(service.require(ownerCtx, 'branch_other_tenant')).rejects.toMatchObject({
      status: 404,
    });
  });
});
