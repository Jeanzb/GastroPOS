import { UserRole, type Branch } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { PasswordHashingService } from '../auth/application/password-hashing.service';
import type { AuditService } from '../audit/audit.service';
import type { BranchScopeService } from '../../common/access/branch-scope.service';
import { EmployeeService } from './employee.service';
import type { EmployeeRepository } from './employee.repository';
import type { EmployeeWithBranch } from './employee.mapper';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'owner_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function branch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'branch_1',
    tenantId: 'tenant_1',
    name: 'Sede Centro',
    code: 'CE',
    city: null,
    address: null,
    phone: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'owner_1',
    updatedById: null,
    ...overrides,
  };
}

function employee(overrides: Partial<EmployeeWithBranch> = {}): EmployeeWithBranch {
  return {
    id: 'employee_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    email: 'mesero@gastroia.test',
    passwordHash: 'hashed',
    fullName: 'Diego Granados',
    documentNumber: null,
    role: UserRole.WAITER,
    isActive: true,
    lastLoginAt: null,
    pinHash: null,
    pinUpdatedAt: null,
    failedPinAttempts: 0,
    pinLockedUntil: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'owner_1',
    updatedById: null,
    branch: { id: 'branch_1', name: 'Sede Centro' },
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let repo: {
    findMany: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findBranchById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    findPinnedInBranch: jest.Mock;
    setPin: jest.Mock;
  };
  let passwordHashing: { hash: jest.Mock; verify: jest.Mock };
  let audit: { tryRecord: jest.Mock };
  let branchScope: { resolve: jest.Mock; assertResourceBranch: jest.Mock };
  let service: EmployeeService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBranchById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findPinnedInBranch: jest.fn(),
      setPin: jest.fn(),
    };
    passwordHashing = { hash: jest.fn(), verify: jest.fn() };
    audit = { tryRecord: jest.fn() };
    branchScope = {
      resolve: jest.fn((_ctx, branchId) => branchId ?? ctx.branchId),
      assertResourceBranch: jest.fn(),
    };
    service = new EmployeeService(
      repo as unknown as EmployeeRepository,
      passwordHashing as unknown as PasswordHashingService,
      audit as unknown as AuditService,
      branchScope as unknown as BranchScopeService,
    );
  });

  it('creates an employee with normalized email, hashed password and audit log', async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findBranchById.mockResolvedValue(branch());
    passwordHashing.hash.mockResolvedValue('hashed_password');
    repo.create.mockResolvedValue(employee({ email: 'mesero@gastroia.test' }));

    const result = await service.create(ctx, {
      email: ' MESERO@GASTROIA.TEST ',
      fullName: ' Diego Granados ',
      role: UserRole.WAITER,
      temporaryPassword: 'temporal123',
      branchId: 'branch_1',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        email: 'mesero@gastroia.test',
        fullName: 'Diego Granados',
        passwordHash: 'hashed_password',
        createdById: 'owner_1',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EMPLOYEE_CREATED' }),
    );
    expect(result.email).toBe('mesero@gastroia.test');
  });

  it('rejects a duplicate email within the same tenant', async () => {
    repo.findByEmail.mockResolvedValue(employee());

    await expect(
      service.create(ctx, {
        email: 'mesero@gastroia.test',
        fullName: 'Diego Granados',
        role: UserRole.WAITER,
        temporaryPassword: 'temporal123',
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(passwordHashing.hash).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('sets a hashed PIN when it is unique in the branch', async () => {
    repo.findById.mockResolvedValue(employee());
    repo.findPinnedInBranch.mockResolvedValue([{ id: 'other', pinHash: 'other_hash' }]);
    passwordHashing.verify.mockResolvedValue(false);
    passwordHashing.hash.mockResolvedValue('hashed_pin');
    repo.setPin.mockResolvedValue(employee());

    await service.setPin(ctx, 'employee_1', '4821');

    expect(passwordHashing.hash).toHaveBeenCalledWith('4821');
    expect(repo.setPin).toHaveBeenCalledWith('tenant_1', 'employee_1', 'hashed_pin', 'owner_1');
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EMPLOYEE_PIN_SET' }),
    );
  });

  it('rejects a PIN already used by another employee in the branch', async () => {
    repo.findById.mockResolvedValue(employee());
    repo.findPinnedInBranch.mockResolvedValue([{ id: 'other', pinHash: 'other_hash' }]);
    passwordHashing.verify.mockResolvedValue(true);

    await expect(service.setPin(ctx, 'employee_1', '4821')).rejects.toBeInstanceOf(
      ApplicationException,
    );
    expect(repo.setPin).not.toHaveBeenCalled();
  });

  it('rejects setting a PIN for an employee without a branch', async () => {
    repo.findById.mockResolvedValue(employee({ branchId: null, branch: null }));

    await expect(service.setPin(ctx, 'employee_1', '4821')).rejects.toBeInstanceOf(
      ApplicationException,
    );
    expect(repo.setPin).not.toHaveBeenCalled();
  });

  it('does not allow the actor to disable their own account', async () => {
    await expect(
      service.updateAccess(ctx, 'owner_1', { isActive: false }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it('soft deletes an employee and writes an audit log', async () => {
    repo.findById.mockResolvedValue(employee());
    repo.softDelete.mockResolvedValue(employee({ isActive: false, deletedAt: now }));

    await service.remove(ctx, 'employee_1');

    expect(repo.softDelete).toHaveBeenCalledWith('tenant_1', 'employee_1', 'owner_1');
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EMPLOYEE_DELETED' }),
    );
  });
});
