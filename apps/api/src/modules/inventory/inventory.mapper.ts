import type { InventoryCategoryDto, InventoryItemDto, StockMovementDto } from '@gastroai/contracts';
import type {
  InventoryBalance,
  InventoryCategory,
  InventoryIngredient,
  Product,
  StockMovement,
  UnitOfMeasure,
} from '../../../generated/prisma';

export type InventoryBalanceWithIngredient = InventoryBalance & {
  ingredient: InventoryIngredient & {
    baseUnit: Pick<UnitOfMeasure, 'id' | 'code' | 'name'>;
    category: Pick<InventoryCategory, 'id' | 'name' | 'skuPrefix'>;
    product: Pick<Product, 'id' | 'sku' | 'name'> | null;
  };
};

export type StockMovementWithInventory = StockMovement & {
  ingredient: Pick<InventoryIngredient, 'id' | 'name'>;
};

export function toInventoryItemDto(item: InventoryBalanceWithIngredient): InventoryItemDto {
  return {
    id: item.id,
    ingredientId: item.ingredientId,
    branchId: item.branchId,
    productId: item.ingredient.productId,
    productSku: item.ingredient.product?.sku ?? null,
    productName: item.ingredient.product?.name ?? null,
    categoryId: item.ingredient.category.id,
    categoryName: item.ingredient.category.name,
    categoryPrefix: item.ingredient.category.skuPrefix,
    baseUnitId: item.ingredient.baseUnitId,
    baseUnitCode: item.ingredient.baseUnit.code,
    baseUnitName: item.ingredient.baseUnit.name,
    name: item.ingredient.name,
    sku: item.ingredient.sku,
    stockOnHand: item.stockOnHand,
    minimumStock: item.minimumStock,
    averageCost: item.averageCost,
    isActive: item.ingredient.isActive,
    allowNegativeStock: item.allowNegativeStock,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toInventoryCategoryDto(category: InventoryCategory): InventoryCategoryDto {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    skuPrefix: category.skuPrefix,
    isActive: category.isActive,
  };
}

export function toStockMovementDto(movement: StockMovementWithInventory): StockMovementDto {
  return {
    id: movement.id,
    branchId: movement.branchId,
    inventoryItemId: movement.inventoryBalanceId,
    ingredientId: movement.ingredientId,
    inventoryItemName: movement.ingredient.name,
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
