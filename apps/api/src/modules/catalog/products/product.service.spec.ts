import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Product } from '../../../../generated/prisma';
import { ApplicationException } from '../../../common/errors/application.exception';
import type { AuditService } from '../../audit/audit.service';
import type { ProductCategoryRepository } from '../categories/product-category.repository';
import type { CatalogActor } from '../catalog.types';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
import type { ProductRepository } from './product.repository';

const actor: CatalogActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
};

function product(overrides: Partial<Product> = {}): Product {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'prod_1',
    tenantId: 'tenant_1',
    categoryId: null,
    sku: null,
    name: 'Empanada',
    description: null,
    priceAmount: 3500,
    currency: 'COP',
    isActive: true,
    isSellable: true,
    isInventoried: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('ProductService', () => {
  let repo: {
    findMany: jest.Mock;
    count: jest.Mock;
    findById: jest.Mock;
    findBySku: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let categoryRepo: { findById: jest.Mock };
  let audit: { tryRecord: jest.Mock };
  let service: ProductService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categoryRepo = { findById: jest.fn() };
    audit = { tryRecord: jest.fn() };
    service = new ProductService(
      repo as unknown as ProductRepository,
      categoryRepo as unknown as ProductCategoryRepository,
      audit as unknown as AuditService,
    );
  });

  it('rejects creation with a category from another tenant', async () => {
    categoryRepo.findById.mockResolvedValue(null);

    await expect(
      service.create(actor, { name: 'X', priceAmount: 1000, categoryId: 'cat_x' }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate SKU', async () => {
    repo.findBySku.mockResolvedValue(product({ id: 'other' }));

    await expect(
      service.create(actor, { name: 'X', priceAmount: 1000, sku: 'EMP-001' }),
    ).rejects.toBeInstanceOf(ApplicationException);
  });

  it('creates scoped to the tenant and audits creation', async () => {
    repo.findBySku.mockResolvedValue(null);
    repo.create.mockResolvedValue(product());

    await service.create(actor, { name: 'Empanada', priceAmount: 3500 });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: 'user_1' }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CREATED' }),
    );
  });

  it('records a dedicated price-change audit when the price changes', async () => {
    repo.findById.mockResolvedValue(product({ priceAmount: 3500 }));
    repo.update.mockResolvedValue(product({ priceAmount: 4000 }));

    await service.update(actor, 'prod_1', { priceAmount: 4000 });

    const actions = audit.tryRecord.mock.calls.map((call) => call[0].action);
    expect(actions).toContain('PRODUCT_UPDATED');
    expect(actions).toContain('PRODUCT_PRICE_CHANGED');
  });
});

describe('CreateProductDto', () => {
  it('rejects a non-integer (float) price', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Empanada',
      priceAmount: 99.99,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'priceAmount')).toBe(true);
  });
});
