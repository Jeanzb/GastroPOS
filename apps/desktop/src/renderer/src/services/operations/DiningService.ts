import { apiClient } from '@/api';
import type {
  CreateDiningTableRequest,
  CreateDiningZoneRequest,
  DiningTableDto,
  DiningZoneDto,
  UpdateDiningTableRequest,
  UpdateDiningTableStatusRequest,
  UpdateDiningZoneRequest,
} from '@/types/dining';

export class DiningService {
  static getZones(): Promise<DiningZoneDto[]> {
    return apiClient.get<DiningZoneDto[]>('/dining-zones');
  }

  static createZone(payload: CreateDiningZoneRequest): Promise<DiningZoneDto> {
    return apiClient.post<DiningZoneDto>('/dining-zones', payload);
  }

  static updateZone(id: string, payload: UpdateDiningZoneRequest): Promise<DiningZoneDto> {
    return apiClient.patch<DiningZoneDto>(`/dining-zones/${id}`, payload);
  }

  static createTable(zoneId: string, payload: CreateDiningTableRequest): Promise<DiningTableDto> {
    return apiClient.post<DiningTableDto>(`/dining-zones/${zoneId}/tables`, payload);
  }

  static updateTable(id: string, payload: UpdateDiningTableRequest): Promise<DiningTableDto> {
    return apiClient.patch<DiningTableDto>(`/dining-tables/${id}`, payload);
  }

  static updateTableStatus(
    id: string,
    payload: UpdateDiningTableStatusRequest,
  ): Promise<DiningTableDto> {
    return apiClient.patch<DiningTableDto>(`/dining-tables/${id}/status`, payload);
  }

  static deleteZone(id: string): Promise<void> {
    return apiClient.delete<void>(`/dining-zones/${id}`);
  }

  static deleteTable(id: string): Promise<void> {
    return apiClient.delete<void>(`/dining-tables/${id}`);
  }
}
