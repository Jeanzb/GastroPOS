import { apiClient, type QueryParams } from '@/api';
import type {
  CreateSupplierPayload,
  PaginatedResult,
  SupplierDto,
  SupplierListParams,
  UpdateSupplierPayload,
} from '@/types/suppliers';

export class SupplierService {
  static getSuppliers(params: SupplierListParams): Promise<PaginatedResult<SupplierDto>> {
    return apiClient.get<PaginatedResult<SupplierDto>>('/suppliers', params as QueryParams);
  }

  static createSupplier(payload: CreateSupplierPayload): Promise<SupplierDto> {
    return apiClient.post<SupplierDto>('/suppliers', payload);
  }

  static updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<SupplierDto> {
    return apiClient.patch<SupplierDto>(`/suppliers/${id}`, payload);
  }
}
