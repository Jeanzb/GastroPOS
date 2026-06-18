import type { Customer } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { AuditService } from '../audit/audit.service';
import { CustomerService } from './customer.service';
import type { CustomerRepository } from './customer.repository';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  sessionId: 'session_1',
};

function customer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cus_1',
    tenantId: 'tenant_1',
    documentType: 'NIT',
    documentNumber: '900123456',
    name: 'Distribuidora La 80',
    email: null,
    phone: null,
    address: null,
    municipality: null,
    taxResponsibility: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('CustomerService', () => {
  let repo: {
    findMany: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findByDocument: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: CustomerService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByDocument: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new CustomerService(
      repo as unknown as CustomerRepository,
      audit as unknown as AuditService,
    );
  });

  it('rejects a duplicate customer document', async () => {
    repo.findByDocument.mockResolvedValue(customer());

    await expect(
      service.create(ctx, {
        documentType: 'NIT',
        documentNumber: '900123456',
        name: 'Otra',
      }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates a customer and writes an audit log', async () => {
    repo.findByDocument.mockResolvedValue(null);
    repo.create.mockResolvedValue(customer({ id: 'cus_2', documentNumber: '111' }));

    await service.create(ctx, {
      documentType: 'CC',
      documentNumber: '111',
      name: 'Cliente Uno',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ documentNumber: '111', createdById: 'user_1' }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_CREATED' }),
    );
  });

  it('returns 404 when the customer does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(ctx, 'missing')).rejects.toBeInstanceOf(
      ApplicationException,
    );
  });
});
