import type { UserRole } from '../../../generated/prisma';
import { assertBranchAccess, type BranchAccessContext } from './branch-access';

function ctx(role: UserRole, branchId: string | null): BranchAccessContext {
  return { role, branchId };
}

describe('assertBranchAccess', () => {
  it('defaults operational users to their own branch', () => {
    expect(assertBranchAccess(ctx('CASHIER', 'branch_1'))).toBe('branch_1');
    expect(assertBranchAccess(ctx('WAITER', 'branch_1'), null)).toBe('branch_1');
  });

  it('blocks operational users from another branch', () => {
    expect(() => assertBranchAccess(ctx('CASHIER', 'branch_1'), 'branch_2')).toThrow(
      'You do not have access to the requested branch.',
    );
    expect(() => assertBranchAccess(ctx('INVENTORY_MANAGER', 'branch_1'), 'branch_2')).toThrow(
      'You do not have access to the requested branch.',
    );
  });

  it.each<UserRole>(['OWNER', 'ADMIN', 'ACCOUNTANT'])(
    'allows %s to request a specific branch',
    (role) => {
      expect(assertBranchAccess(ctx(role, null), 'branch_2')).toBe('branch_2');
    },
  );

  it.each<UserRole>(['OWNER', 'ADMIN', 'ACCOUNTANT'])(
    'allows %s tenant-wide reads when no branch is requested',
    (role) => {
      expect(assertBranchAccess(ctx(role, null))).toBeUndefined();
    },
  );

  it('rejects branchless operational users instead of falling back to tenant-wide access', () => {
    expect(() => assertBranchAccess(ctx('WAITER', null))).toThrow(
      'You do not have access to the requested branch.',
    );
  });
});
