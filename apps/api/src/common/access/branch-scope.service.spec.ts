import { BranchScopeService } from './branch-scope.service';

describe('BranchScopeService', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn(),
    },
  };
  const service = new BranchScopeService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch_1' });
  });

  it('blocks operational users from another branch before querying ownership', async () => {
    await expect(
      service.resolve(
        {
          tenantId: 'tenant_1',
          branchId: 'branch_1',
          actorUserId: 'cashier_1',
          role: 'CASHIER',
          permissions: [],
          sessionId: 'session_1',
        },
        'branch_2',
      ),
    ).rejects.toThrow();
    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
  });

  it('validates requested branches for tenant-wide roles', async () => {
    await expect(
      service.resolve(
        {
          tenantId: 'tenant_1',
          branchId: null,
          actorUserId: 'owner_1',
          role: 'OWNER',
          permissions: [],
          sessionId: 'session_1',
        },
        'branch_2',
      ),
    ).resolves.toBe('branch_2');
    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 'branch_2', tenantId: 'tenant_1', deletedAt: null, isActive: true },
      select: { id: true },
    });
  });
});
