import type { InventoryItemDto, StockMovementDto } from '@gastroai/contracts';
import type { InventoryItem, StockMovement } from '../../../generated/prisma';

export type StockMovementWithItem = StockMovement & {
  inventoryItem: Pick<InventoryItem, 'id' | 'name'>;
};

export function toInventoryItemDto(item: InventoryItem): InventoryItemDto {
  return {
    id: item.id,
    branchId: item.branchId,
    productId: item.productId,
    unitId: item.unitId,
    name: item.name,
    sku: item.sku,
    stockOnHand: item.stockOnHand,
    minimumStock: item.minimumStock,
    averageCost: item.averageCost,
    isActive: item.isActive,
    allowNegativeStock: item.allowNegativeStock,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toStockMovementDto(movement: StockMovementWithItem): StockMovementDto {
  return {
    id: movement.id,
    branchId: movement.branchId,
    inventoryItemId: movement.inventoryItemId,
    inventoryItemName: movement.inventoryItem.name,
    purchaseId: movement.purchaseId,
    purchaseItemId: movement.purchaseItemId,
    type: movement.type,
    quantity: movement.quantity,
    unitCost: movement.unitCost,
    totalCost: movement.totalCost,
    stockBefore: movement.stockBefore,
    stockAfter: movement.stockAfter,
    reason: movement.reason,
    createdById: movement.createdById,
    createdAt: movement.createdAt.toISOString(),
  };
}
