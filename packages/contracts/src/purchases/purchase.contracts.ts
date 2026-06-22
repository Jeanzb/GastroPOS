export type PurchaseStatus = 'DRAFT' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItemDto {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  createdAt: string;
}

export interface PurchaseDto {
  id: string;
  branchId: string | null;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  currency: string;
  reference: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItemDto[];
}

export interface PurchaseListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PurchaseStatus;
  supplierId?: string;
  /** Month to show, "YYYY-MM". Defaults to the current month in the tenant timezone. */
  period?: string;
}

/** Monthly rollup used by the Compras history selector. Records are never deleted. */
export interface PurchasePeriodSummaryDto {
  period: string;
  total: number;
  count: number;
}

export interface PurchasePeriodsResponse {
  currentPeriod: string;
  periods: PurchasePeriodSummaryDto[];
}

export interface CreatePurchaseItemPayload {
  productId?: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchasePayload {
  supplierId: string;
  branchId?: string;
  currency?: string;
  reference?: string;
  notes?: string;
  taxTotal?: number;
  items: CreatePurchaseItemPayload[];
}
