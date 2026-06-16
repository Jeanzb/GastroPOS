import type { ProductCategory } from '../../../../generated/prisma';
import { ApplicationException } from '../../../common/errors/application.exception';
import type { AuditService } from '../../audit/audit.service';
import type { CatalogActor } from '../catalog.types';
import { ProductCategoryService } from './product-category.service';
import type { ProductCategoryRepository } from './product-category.repository';

const actor: CatalogActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
};

function category(overrides: Partial<ProductCategory> = {}): ProductCategory {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cat_1',
    tenantId: 'tenant_1',
    name: 'Entradas',
    sortOrder: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('ProductCategoryService', () => {
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
  let service: ProductCategoryService;

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
    service = new ProductCategoryService(
      repo as unknown as ProductCategoryRepository,
      audit as unknown as AuditService,
    );
  });

  it('rejects a duplicate category name', async () => {
    repo.findByName.mockResolvedValue(category());

    await expect(service.create(actor, { name: 'Entradas' })).rejects.toBeInstanceOf(
      ApplicationException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates scoped to the tenant and writes an audit log', async () => {
    repo.findByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(category({ id: 'cat_2', name: 'Bebidas' }));

    const result = await service.create(actor, { name: 'Bebidas' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        createdById: 'user_1',
        name: 'Bebidas',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CATEGORY_CREATED' }),
    );
    expect(result.name).toBe('Bebidas');
  });

  it('returns 404 when reading a category from another tenant', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(actor, 'cat_x')).rejects.toBeInstanceOf(
      ApplicationException,
    );
  });
});
