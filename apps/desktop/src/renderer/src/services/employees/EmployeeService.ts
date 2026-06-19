import { apiClient, type QueryParams } from '@/api';
import type {
  CreateEmployeePayload,
  EmployeeDto,
  EmployeeListParams,
  PaginatedResult,
  UpdateEmployeeAccessPayload,
  UpdateEmployeePayload,
} from '@/types/employees';

export class EmployeeService {
  static getEmployees(params: EmployeeListParams): Promise<PaginatedResult<EmployeeDto>> {
    return apiClient.get<PaginatedResult<EmployeeDto>>('/employees', params as QueryParams);
  }

  static createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDto> {
    return apiClient.post<EmployeeDto>('/employees', payload);
  }

  static updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<EmployeeDto> {
    return apiClient.patch<EmployeeDto>(`/employees/${id}`, payload);
  }

  static updateEmployeeAccess(
    id: string,
    payload: UpdateEmployeeAccessPayload,
  ): Promise<EmployeeDto> {
    return apiClient.patch<EmployeeDto>(`/employees/${id}/access`, payload);
  }

  static deleteEmployee(id: string): Promise<void> {
    return apiClient.delete<void>(`/employees/${id}`);
  }
}
