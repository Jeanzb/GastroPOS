import { apiClient } from '@/api';
import type {
  CreateDiningTableRequest,
  CreateDiningZoneRequest,
  DiningTableDto,
  DiningZoneDto,
  KitchenCommandDto,
  OpenTableAccountRequest,
  ReceiptDto,
  TableAccountDto,
  AddTableAccountItemRequest,
  ChargeTableAccountRequest,
  UpdateTableAccountItemRequest,
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

  static getCurrentAccount(tableId: string): Promise<TableAccountDto | null> {
    return apiClient.get<TableAccountDto | null>(`/dining-tables/${tableId}/account`);
  }

  static openAccount(
    tableId: string,
    payload: OpenTableAccountRequest,
  ): Promise<TableAccountDto> {
    return apiClient.post<TableAccountDto>(`/dining-tables/${tableId}/account`, payload);
  }

  static addAccountItem(
    saleId: string,
    payload: AddTableAccountItemRequest,
  ): Promise<TableAccountDto> {
    return apiClient.post<TableAccountDto>(`/table-accounts/${saleId}/items`, payload);
  }

  static updateAccountItem(
    saleId: string,
    itemId: string,
    payload: UpdateTableAccountItemRequest,
  ): Promise<TableAccountDto> {
    return apiClient.patch<TableAccountDto>(`/table-accounts/${saleId}/items/${itemId}`, payload);
  }

  static removeAccountItem(saleId: string, itemId: string): Promise<TableAccountDto> {
    return apiClient.delete<TableAccountDto>(`/table-accounts/${saleId}/items/${itemId}`);
  }

  static getCommand(saleId: string): Promise<KitchenCommandDto> {
    return apiClient.get<KitchenCommandDto>(`/table-accounts/${saleId}/command`);
  }

  static getReceipt(saleId: string): Promise<ReceiptDto> {
    return apiClient.get<ReceiptDto>(`/table-accounts/${saleId}/receipt`);
  }

  static chargeAccount(
    saleId: string,
    payload: ChargeTableAccountRequest,
  ): Promise<ReceiptDto> {
    return apiClient.post<ReceiptDto>(`/table-accounts/${saleId}/charge`, payload);
  }
}
