import { apiClient, type QueryParams } from '@/api';
import type {
  AdjustInventoryStockRequest,
  CreateInventoryItemRequest,
  InventoryItemDto,
  InventoryItemListParams,
  PaginatedResult,
  StockMovementDto,
  StockMovementListParams,
} from '@/types/inventory';

export class InventoryService {
  static getItems(params: InventoryItemListParams): Promise<PaginatedResult<InventoryItemDto>> {
    return apiClient.get<PaginatedResult<InventoryItemDto>>(
      '/inventory-items',
      params as QueryParams,
    );
  }

  static getMovements(
    params: StockMovementListParams,
  ): Promise<PaginatedResult<StockMovementDto>> {
    return apiClient.get<PaginatedResult<StockMovementDto>>(
      '/stock-movements',
      params as QueryParams,
    );
  }

  static createItem(payload: CreateInventoryItemRequest): Promise<InventoryItemDto> {
    return apiClient.post<InventoryItemDto>('/inventory-items', payload);
  }

  static adjustStock(id: string, payload: AdjustInventoryStockRequest): Promise<InventoryItemDto> {
    return apiClient.post<InventoryItemDto>(`/inventory-items/${id}/adjustments`, payload);
  }
}
