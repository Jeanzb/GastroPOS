export type StockMovementType =
  | 'PURCHASE'
  | 'SALE_CONSUMPTION'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'WASTE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN';

export type SortDirection = 'asc' | 'desc';

export type StockMovementSortBy =
  | 'createdAt'
  | 'inventoryItemName'
  | 'type'
  | 'quantity'
  | 'stockAfter'
  | 'totalCost';

export interface InventoryItemDto {
  id: string;
  ingredientId: string;
  branchId: string;
  productId: string | null;
  categoryId: string;
  categoryName: string;
  categoryPrefix: string;
  baseUnitId: string;
  baseUnitCode: string;
  baseUnitName: string;
  name: string;
  sku: string;
  stockOnHand: number;
  minimumStock: number;
  averageCost: number;
  isActive: boolean;
  allowNegativeStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCategoryDto {
  id: string;
  code: string;
  name: string;
  skuPrefix: string;
  isActive: boolean;
}

export interface StockMovementDto {
  id: string;
  branchId: string;
  inventoryItemId: string;
  ingredientId: string;
  inventoryItemName: string;
  purchaseId: string | null;
  purchaseItemId: string | null;
  type: StockMovementType;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdById: string;
  createdAt: string;
}

export interface CreateInventoryItemRequest {
  branchId: string;
  categoryId: string;
  name: string;
  baseUnitCode: string;
  baseUnitName?: string;
  productId?: string | null;
  initialStock?: number;
  initialUnitCost?: number;
  minimumStock?: number;
  allowNegativeStock?: boolean;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  baseUnitCode?: string;
  baseUnitName?: string;
  minimumStock?: number;
  allowNegativeStock?: boolean;
  isActive?: boolean;
}

export type InventoryAdjustmentType = 'IN' | 'OUT';

export interface AdjustInventoryStockRequest {
  type: InventoryAdjustmentType;
  quantity: number;
  reason: string;
  unitCost?: number;
}

export interface InventoryItemListParams {
  page?: number;
  pageSize?: number;
  branchId?: string;
  search?: string;
  lowStockOnly?: boolean;
}

export interface StockMovementListParams {
  page?: number;
  pageSize?: number;
  branchId?: string;
  inventoryItemId?: string;
  type?: StockMovementType;
  sortBy?: StockMovementSortBy;
  sortDir?: SortDirection;
}
