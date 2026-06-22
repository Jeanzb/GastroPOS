import { apiClient, type QueryParams } from '@/api';
import type {
  CreatePurchasePayload,
  PaginatedResult,
  PurchaseDto,
  PurchaseListParams,
  PurchasePeriodsResponse,
} from '@/types/purchases';

export class PurchaseService {
  static getPurchases(params: PurchaseListParams): Promise<PaginatedResult<PurchaseDto>> {
    return apiClient.get<PaginatedResult<PurchaseDto>>('/purchases', params as QueryParams);
  }

  static getPeriods(branchId?: string): Promise<PurchasePeriodsResponse> {
    return apiClient.get<PurchasePeriodsResponse>(
      '/purchases/periods',
      branchId ? { branchId } : undefined,
    );
  }

  static createPurchase(payload: CreatePurchasePayload): Promise<PurchaseDto> {
    return apiClient.post<PurchaseDto>('/purchases', payload);
  }

  static receivePurchase(id: string): Promise<PurchaseDto> {
    return apiClient.patch<PurchaseDto>(`/purchases/${id}/receive`);
  }

  static cancelPurchase(id: string): Promise<PurchaseDto> {
    return apiClient.patch<PurchaseDto>(`/purchases/${id}/cancel`);
  }
}
