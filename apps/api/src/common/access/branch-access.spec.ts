import { assertBranchAccess } from './branch-access';

describe('assertBranchAccess', () => {
  it('defaults to the caller own branch when none requested', () => {
    expect(assertBranchAccess({ branchId: 'b1', role: 'WAITER' })).toBe('b1');
  });

  it('allows requesting the caller own branch', () => {
    expect(assertBranchAccess({ branchId: 'b1', role: 'CASHIER' }, 'b1')).toBe('b1');
  });

  it('rejects another branch for operational roles', () => {
    expect(() => assertBranchAccess({ branchId: 'b1', role: 'CASHIER' }, 'b2')).toThrow();
    expect(() => assertBranchAccess({ branchId: 'b1', role: 'WAITER' }, 'b2')).toThrow();
    expect(() => assertBranchAccess({ branchId: 'b1', role: 'KITCHEN' }, 'b2')).toThrow();
  });

  it('allows cross-branch queries for OWNER, ADMIN and ACCOUNTANT', () => {
    expect(assertBranchAccess({ branchId: 'b1', role: 'OWNER' }, 'b2')).toBe('b2');
    expect(assertBranchAccess({ branchId: 'b1', role: 'ADMIN' }, 'b2')).toBe('b2');
    expect(assertBranchAccess({ branchId: 'b1', role: 'ACCOUNTANT' }, 'b2')).toBe('b2');
  });

  it('returns undefined (all branches) for tenant-wide cross-branch roles', () => {
    expect(assertBranchAccess({ branchId: null, role: 'OWNER' })).toBeUndefined();
    expect(assertBranchAccess({ branchId: null, role: 'ADMIN' })).toBeUndefined();
  });

  it('rejects an operational role without a branch and none requested', () => {
    expect(() => assertBranchAccess({ branchId: null, role: 'WAITER' })).toThrow();
  });
});
