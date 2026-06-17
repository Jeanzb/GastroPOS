import { apiClient } from '@/api';
import type {
  FiscalProfileDto,
  FiscalProviderConnectionTestDto,
  UpsertFiscalProfilePayload,
} from '@/types/fiscal';

export class FiscalService {
  static getProfile(): Promise<FiscalProfileDto | null> {
    return apiClient.get<FiscalProfileDto | null>('/fiscal/profile');
  }

  static upsertProfile(payload: UpsertFiscalProfilePayload): Promise<FiscalProfileDto> {
    return apiClient.request<FiscalProfileDto>('/fiscal/profile', {
      method: 'PUT',
      body: payload,
    });
  }

  static testProviderConnection(): Promise<FiscalProviderConnectionTestDto> {
    return apiClient.post<FiscalProviderConnectionTestDto>('/fiscal/provider/test-connection');
  }
}
