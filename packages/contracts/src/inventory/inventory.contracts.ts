export type StockMovementType =
  | 'PURCHASE'
  | 'SALE_CONSUMPTION'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'WASTE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN';

export interface InventoryItemDto {
  id: string;
  branchId: string | null;
  productId: string | null;
  unitId: string | null;
  name: string;
  sku: string | null;
  stockOnHand: number;
  minimumStock: number;
  averageCost: number;
  isActive: boolean;
  allowNegativeStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  branchId: string | null;
  inventoryItemId: string;
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
}
