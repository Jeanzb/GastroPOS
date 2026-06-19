import { PurchaseStatus, type Supplier } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { AuditService } from '../audit/audit.service';
import { PurchaseService } from './purchase.service';
import type { PurchaseRepository } from './purchase.repository';
import type { PurchaseWithDetails } from './purchase.mapper';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 'supplier_1',
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

function purchase(overrides: Partial<PurchaseWithDetails> = {}): PurchaseWithDetails {
  return {
    id: 'purchase_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    supplierId: 'supplier_1',
    status: PurchaseStatus.DRAFT,
    currency: 'COP',
    reference: 'FC-100',
    notes: null,
    subtotal: 20000,
    taxTotal: 1900,
    total: 21900,
    receivedAt: null,
    createdById: 'user_1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    supplier: { id: 'supplier_1', name: 'Carnes del Valle' },
    items: [
      {
        id: 'item_1',
        tenantId: 'tenant_1',
        purchaseId: 'purchase_1',
        productId: 'product_1',
        nameSnapshot: 'Carne molida',
        quantity: 2,
        unitCost: 10000,
        lineTotal: 20000,
        createdAt: now,
      },
    ],
    ...overrides,
  };
}

describe('PurchaseService', () => {
  let repo: {
    findMany: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findSupplierById: jest.Mock;
    countProductsByIds: jest.Mock;
    create: jest.Mock;
    receive: jest.Mock;
    cancel: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: PurchaseService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findSupplierById: jest.fn(),
      countProductsByIds: jest.fn(),
      create: jest.fn(),
      receive: jest.fn(),
      cancel: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new PurchaseService(
      repo as unknown as PurchaseRepository,
      audit as unknown as AuditService,
    );
  });

  it('rejects a purchase when the supplier does not exist', async () => {
    repo.findSupplierById.mockResolvedValue(null);

    await expect(
      service.create(ctx, {
        supplierId: 'missing',
        items: [{ name: 'Carne molida', quantity: 2, unitCost: 10000 }],
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('calculates totals server-side and writes an audit log', async () => {
    repo.findSupplierById.mockResolvedValue(supplier());
    repo.countProductsByIds.mockResolvedValue(1);
    repo.create.mockResolvedValue(purchase());

    const result = await service.create(ctx, {
      supplierId: 'supplier_1',
      taxTotal: 1900,
      items: [{ productId: 'product_1', name: ' Carne molida ', quantity: 2, unitCost: 10000 }],
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        subtotal: 20000,
        taxTotal: 1900,
        total: 21900,
        items: [expect.objectContaining({ nameSnapshot: 'Carne molida', lineTotal: 20000 })],
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PURCHASE_CREATED' }),
    );
    expect(result.total).toBe(21900);
  });

  it('does not receive a purchase that is no longer in draft', async () => {
    repo.findById.mockResolvedValue(purchase({ status: PurchaseStatus.RECEIVED }));

    await expect(service.receive(ctx, 'purchase_1')).rejects.toBeInstanceOf(
      ApplicationException,
    );

    expect(repo.receive).not.toHaveBeenCalled();
  });

  it('receives a draft purchase and audits generated stock movements', async () => {
    const draft = purchase();
    const received = purchase({
      status: PurchaseStatus.RECEIVED,
      receivedAt: now,
    });
    repo.findById.mockResolvedValue(draft);
    repo.receive.mockResolvedValue({
      purchase: received,
      received: true,
      stockMovementCount: 1,
    });

    const result = await service.receive(ctx, 'purchase_1');

    expect(repo.receive).toHaveBeenCalledWith({
      id: 'purchase_1',
      tenantId: 'tenant_1',
      actorUserId: 'user_1',
    });
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PURCHASE_RECEIVED',
        metadata: { stockMovementCount: 1 },
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STOCK_MOVEMENTS_CREATED',
        metadata: { reason: 'PURCHASE_RECEIVED', stockMovementCount: 1 },
      }),
    );
    expect(result.status).toBe(PurchaseStatus.RECEIVED);
  });
});
