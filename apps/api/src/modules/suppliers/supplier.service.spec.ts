import type { Supplier } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { AuditService } from '../audit/audit.service';
import { SupplierService } from './supplier.service';
import type { SupplierRepository } from './supplier.repository';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'sup_1',
    tenantId: 'tenant_1',
    name: 'Carnes del Valle',
    documentNumber: null,
    email: null,
    phone: null,
    address: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('SupplierService', () => {
  let repo: {
    findMany: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findByName: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: SupplierService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new SupplierService(
      repo as unknown as SupplierRepository,
      audit as unknown as AuditService,
    );
  });

  it('rejects a duplicate supplier name', async () => {
    repo.findByName.mockResolvedValue(supplier());

    await expect(service.create(ctx, { name: 'Carnes del Valle' })).rejects.toBeInstanceOf(
      ApplicationException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates a supplier and writes an audit log', async () => {
    repo.findByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(supplier({ id: 'sup_2', name: 'Lacteos Andinos' }));

    await service.create(ctx, { name: 'Lacteos Andinos' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lacteos Andinos', createdById: 'user_1' }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUPPLIER_CREATED' }),
    );
  });

  it('returns 404 when the supplier does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(ctx, 'missing')).rejects.toBeInstanceOf(ApplicationException);
  });
});
