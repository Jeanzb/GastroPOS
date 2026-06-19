import { StockMovementType, type InventoryItem } from '../../../generated/prisma';
import type { TenantRequestContext } from '../auth/auth.types';
import { InventoryService } from './inventory.service';
import type { InventoryRepository } from './inventory.repository';
import type { StockMovementWithItem } from './inventory.mapper';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inventory_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    productId: 'product_1',
    unitId: null,
    name: 'Carne molida',
    sku: null,
    stockOnHand: 4,
    minimumStock: 2,
    averageCost: 10000,
    isActive: true,
    allowNegativeStock: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

function stockMovement(
  overrides: Partial<StockMovementWithItem> = {},
): StockMovementWithItem {
  return {
    id: 'movement_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    inventoryItemId: 'inventory_1',
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
    inventoryItem: { id: 'inventory_1', name: 'Carne molida' },
    ...overrides,
  };
}

describe('InventoryService', () => {
  let repo: {
    findItems: jest.Mock;
    countItems: jest.Mock;
    findMovements: jest.Mock;
    countMovements: jest.Mock;
  };
  let service: InventoryService;

  beforeEach(() => {
    repo = {
      findItems: jest.fn(),
      countItems: jest.fn(),
      findMovements: jest.fn(),
      countMovements: jest.fn(),
    };
    service = new InventoryService(repo as unknown as InventoryRepository);
  });

  it('lists inventory items as DTOs', async () => {
    repo.findItems.mockResolvedValue([inventoryItem()]);
    repo.countItems.mockResolvedValue(1);

    const result = await service.listItems(ctx, { page: 1, pageSize: 10 });

    expect(repo.findItems).toHaveBeenCalledWith(
      { branchId: 'branch_1', search: undefined, lowStockOnly: undefined },
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'inventory_1',
        name: 'Carne molida',
        stockOnHand: 4,
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('lists stock movements with inventory item names', async () => {
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
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        inventoryItemName: 'Carne molida',
        type: StockMovementType.PURCHASE,
      }),
    );
  });
});
