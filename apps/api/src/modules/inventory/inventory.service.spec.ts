import { StockMovementType } from '../../../generated/prisma';
import type { AuditService } from '../audit/audit.service';
import type { TenantRequestContext } from '../auth/auth.types';
import type { InventoryBalanceWithIngredient, StockMovementWithInventory } from './inventory.mapper';
import type { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function inventoryBalance(
  overrides: Partial<InventoryBalanceWithIngredient> = {},
): InventoryBalanceWithIngredient {
  return {
    id: 'inventory_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    ingredientId: 'ingredient_1',
    stockOnHand: 4,
    minimumStock: 2,
    averageCost: 10000,
    allowNegativeStock: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ingredient: {
      id: 'ingredient_1',
      tenantId: 'tenant_1',
      productId: 'product_1',
      baseUnitId: 'unit_1',
      categoryId: 'inventory_category_1',
      name: 'Carne molida',
      sku: 'CAR-0001',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdById: 'user_1',
      updatedById: null,
      baseUnit: { id: 'unit_1', code: 'KG', name: 'Kilogramo' },
      category: { id: 'inventory_category_1', name: 'Carnes', skuPrefix: 'CAR' },
    },
    ...overrides,
  };
}

function stockMovement(
  overrides: Partial<StockMovementWithInventory> = {},
): StockMovementWithInventory {
  return {
    id: 'movement_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    inventoryBalanceId: 'inventory_1',
    ingredientId: 'ingredient_1',
    purchaseId: 'purchase_1',
    purchaseItemId: 'purchase_item_1',
    type: StockMovementType.PURCHASE,
    quantity: 4,
    unitCost: 10000,
    totalCost: 40000,
    stockBefore: 0,
    stockAfter: 4,
    reason: 'Purchase FC-100 received',
    createdById: 'user_1',
    createdAt: now,
    ingredient: { id: 'ingredient_1', name: 'Carne molida' },
    ...overrides,
  };
}

describe('InventoryService', () => {
  let repo: {
    findItems: jest.Mock;
    countItems: jest.Mock;
    findMovements: jest.Mock;
    countMovements: jest.Mock;
    findItemById: jest.Mock;
    createItem: jest.Mock;
    updateItem: jest.Mock;
    adjustStock: jest.Mock;
    listCategories: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: InventoryService;

  beforeEach(() => {
    repo = {
      findItems: jest.fn(),
      countItems: jest.fn(),
      findMovements: jest.fn(),
      countMovements: jest.fn(),
      findItemById: jest.fn(),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      adjustStock: jest.fn(),
      listCategories: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new InventoryService(
      repo as unknown as InventoryRepository,
      audit as unknown as AuditService,
    );
  });

  it('lists inventory balances as item DTOs', async () => {
    repo.findItems.mockResolvedValue([inventoryBalance()]);
    repo.countItems.mockResolvedValue(1);

    const result = await service.listItems(ctx, { page: 1, pageSize: 10 });

    expect(repo.findItems).toHaveBeenCalledWith(
      { branchId: 'branch_1', search: undefined, lowStockOnly: undefined },
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'inventory_1',
        ingredientId: 'ingredient_1',
        name: 'Carne molida',
        sku: 'CAR-0001',
        categoryId: 'inventory_category_1',
        categoryName: 'Carnes',
        categoryPrefix: 'CAR',
        baseUnitCode: 'KG',
        stockOnHand: 4,
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('lists stock movements with ingredient names', async () => {
    repo.findMovements.mockResolvedValue([stockMovement()]);
    repo.countMovements.mockResolvedValue(1);

    const result = await service.listMovements(ctx, {
      page: 1,
      pageSize: 10,
      type: StockMovementType.PURCHASE,
    });

    expect(repo.findMovements).toHaveBeenCalledWith(
      {
        branchId: 'branch_1',
        inventoryItemId: undefined,
        type: StockMovementType.PURCHASE,
      },
      expect.objectContaining({ skip: 0, take: 10 }),
      { sortBy: 'createdAt', sortDir: 'desc' },
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        inventoryItemId: 'inventory_1',
        ingredientId: 'ingredient_1',
        inventoryItemName: 'Carne molida',
        type: StockMovementType.PURCHASE,
      }),
    );
  });

  it('lists inventory categories', async () => {
    repo.listCategories.mockResolvedValue([
      {
        id: 'inventory_category_1',
        tenantId: 'tenant_1',
        code: 'CARNES',
        name: 'Carnes',
        skuPrefix: 'CAR',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdById: null,
        updatedById: null,
      },
    ]);

    const result = await service.listCategories(ctx);

    expect(repo.listCategories).toHaveBeenCalledWith('tenant_1');
    expect(result[0]).toEqual(
      expect.objectContaining({ code: 'CARNES', name: 'Carnes', skuPrefix: 'CAR' }),
    );
  });

  it('creates an inventory item with generated SKU and writes audit', async () => {
    repo.createItem.mockResolvedValue({ status: 'CREATED', item: inventoryBalance() });

    const result = await service.createItem(ctx, {
      branchId: 'branch_1',
      categoryId: 'inventory_category_1',
      name: ' Carne molida ',
      baseUnitCode: ' kg ',
      baseUnitName: 'Kilogramo',
      initialStock: 4,
      initialUnitCost: 10000,
      minimumStock: 2,
    });

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        categoryId: 'inventory_category_1',
        baseUnitCode: 'KG',
      }),
    );
    expect(result.id).toBe('inventory_1');
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVENTORY_ITEM_CREATED' }),
    );
  });

  it('rejects duplicate generated SKU on create', async () => {
    repo.createItem.mockResolvedValue({ status: 'DUPLICATE_SKU' });

    await expect(
      service.createItem(ctx, {
        branchId: 'branch_1',
        categoryId: 'inventory_category_1',
        name: 'Carne molida',
        baseUnitCode: 'KG',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects category from another tenant on create', async () => {
    repo.createItem.mockResolvedValue({ status: 'INVALID_CATEGORY' });

    await expect(
      service.createItem(ctx, {
        branchId: 'branch_1',
        categoryId: 'inventory_category_other',
        name: 'Carne molida',
        baseUnitCode: 'KG',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('adjusts stock and audits the movement', async () => {
    repo.findItemById.mockResolvedValue(inventoryBalance());
    repo.adjustStock.mockResolvedValue({
      status: 'ADJUSTED',
      item: inventoryBalance({ stockOnHand: 7 }),
    });

    const result = await service.adjustStock(ctx, 'inventory_1', {
      type: 'IN',
      quantity: 3,
      unitCost: 11000,
      reason: 'Conteo fisico',
    });

    expect(repo.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inventory_1',
        movementType: 'ADJUSTMENT_IN',
        quantity: 3,
      }),
    );
    expect(result.stockOnHand).toBe(7);
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVENTORY_STOCK_ADJUSTED' }),
    );
  });

  it('blocks stock adjustments that would leave negative stock', async () => {
    repo.findItemById.mockResolvedValue(inventoryBalance());
    repo.adjustStock.mockResolvedValue({ status: 'INSUFFICIENT_STOCK' });

    await expect(
      service.adjustStock(ctx, 'inventory_1', {
        type: 'OUT',
        quantity: 10,
        reason: 'Merma',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
