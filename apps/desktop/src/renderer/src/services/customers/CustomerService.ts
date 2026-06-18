import { apiClient, type QueryParams } from '@/api';
import type {
  CreateCustomerPayload,
  CustomerDto,
  CustomerListParams,
  PaginatedResult,
  UpdateCustomerPayload,
} from '@/types/customers';

export class CustomerService {
  static getCustomers(
    params: CustomerListParams,
  ): Promise<PaginatedResult<CustomerDto>> {
    return apiClient.get<PaginatedResult<CustomerDto>>(
      '/customers',
      params as QueryParams,
    );
  }

  static createCustomer(payload: CreateCustomerPayload): Promise<CustomerDto> {
    return apiClient.post<CustomerDto>('/customers', payload);
  }

  static updateCustomer(
    id: string,
    payload: UpdateCustomerPayload,
  ): Promise<CustomerDto> {
    return apiClient.patch<CustomerDto>(`/customers/${id}`, payload);
  }

  static deleteCustomer(id: string): Promise<void> {
    return apiClient.delete<void>(`/customers/${id}`);
  }
}
