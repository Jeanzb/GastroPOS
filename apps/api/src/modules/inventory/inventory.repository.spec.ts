import type { PrismaService } from '../../database/prisma.service';
import { InventoryRepository } from './inventory.repository';

const now = new Date('2026-01-01T00:00:00.000Z');

describe('InventoryRepository', () => {
  it('generates SKUs from tenant and prefix sequences inside the create transaction', async () => {
    let lastSku = '';
    let balanceIndex = 0;

    const tx = {
      branch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'branch_1' }),
      },
      inventoryCategory: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'category_car', skuPrefix: 'CAR' })
          .mockResolvedValueOnce({ id: 'category_car', skuPrefix: 'CAR' })
          .mockResolvedValueOnce({ id: 'category_beb', skuPrefix: 'BEB' }),
      },
      unitOfMeasure: {
        upsert: jest.fn().mockResolvedValue({ id: 'unit_1' }),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ number: 1 }])
        .mockResolvedValueOnce([{ number: 2 }])
        .mockResolvedValueOnce([{ number: 1 }]),
      inventoryIngredient: {
        create: jest.fn().mockImplementation(({ data }) => {
          lastSku = data.sku;
          return Promise.resolve({ id: `ingredient_${lastSku}`, sku: data.sku });
        }),
      },
      inventoryBalance: {
        create: jest.fn().mockImplementation(() => {
          balanceIndex += 1;
          return Promise.resolve({ id: `balance_${balanceIndex}` });
        }),
        findFirst: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: `balance_${balanceIndex}`,
            tenantId: 'tenant_1',
            branchId: 'branch_1',
            ingredientId: `ingredient_${lastSku}`,
            stockOnHand: 0,
            minimumStock: 0,
            averageCost: 0,
            allowNegativeStock: false,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            createdById: 'user_1',
            updatedById: null,
            ingredient: {
              id: `ingredient_${lastSku}`,
              tenantId: 'tenant_1',
              productId: null,
              baseUnitId: 'unit_1',
              categoryId: lastSku.startsWith('BEB') ? 'category_beb' : 'category_car',
              sku: lastSku,
              name: 'Insumo',
              isActive: true,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              createdById: 'user_1',
              updatedById: null,
              baseUnit: { id: 'unit_1', code: 'UND', name: 'Unidad' },
              category: {
                id: lastSku.startsWith('BEB') ? 'category_beb' : 'category_car',
                name: lastSku.startsWith('BEB') ? 'Bebidas' : 'Carnes',
                skuPrefix: lastSku.slice(0, 3),
              },
            },
          }),
        ),
      },
      stockMovement: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const repository = new InventoryRepository(prisma as unknown as PrismaService);

    const first = await repository.createItem(createData({ categoryId: 'category_car' }));
    const second = await repository.createItem(createData({ categoryId: 'category_car' }));
    const third = await repository.createItem(createData({ categoryId: 'category_beb' }));

    expect(first).toMatchObject({ status: 'CREATED', item: { ingredient: { sku: 'CAR-0001' } } });
    expect(second).toMatchObject({ status: 'CREATED', item: { ingredient: { sku: 'CAR-0002' } } });
    expect(third).toMatchObject({ status: 'CREATED', item: { ingredient: { sku: 'BEB-0001' } } });
    expect(tx.inventoryIngredient.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ sku: 'CAR-0001' }) }),
    );
    expect(tx.inventoryIngredient.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ sku: 'CAR-0002' }) }),
    );
    expect(tx.inventoryIngredient.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ data: expect.objectContaining({ sku: 'BEB-0001' }) }),
    );
  });
});

function createData(overrides: { categoryId: string }) {
  return {
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    productId: null,
    categoryId: overrides.categoryId,
    name: 'Insumo',
    baseUnitCode: 'UND',
    baseUnitName: 'Unidad',
    initialStock: 0,
    initialUnitCost: null,
    minimumStock: 0,
    allowNegativeStock: false,
    createdById: 'user_1',
  };
}
