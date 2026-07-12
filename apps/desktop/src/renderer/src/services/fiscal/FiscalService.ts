import { apiClient } from '@/api';
import type {
  CreateFiscalCreditNotePayload,
  FiscalCreditNoteActionDto,
  FiscalDocumentActionDto,
  FiscalDocumentDetailDto,
  FiscalDocumentListDto,
  FiscalNumberingRangeListDto,
  FiscalProfileDto,
  FactusConnectionDto,
  UpsertFactusConnectionPayload,
  BranchFiscalConfigurationDto,
  UpsertBranchFiscalConfigurationPayload,
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

  static getConnection(): Promise<FactusConnectionDto | null> {
    return apiClient.get<FactusConnectionDto | null>('/fiscal/connection');
  }

  static configureConnection(payload: UpsertFactusConnectionPayload): Promise<FactusConnectionDto> {
    return apiClient.request<FactusConnectionDto>('/fiscal/connection', { method: 'PUT', body: payload });
  }

  static verifyConnection(): Promise<FactusConnectionDto> {
    return apiClient.post<FactusConnectionDto>('/fiscal/connection/verify');
  }

  static getBranchConfiguration(): Promise<BranchFiscalConfigurationDto | null> {
    return apiClient.get<BranchFiscalConfigurationDto | null>('/fiscal/branch-configuration');
  }

  static upsertBranchConfiguration(
    payload: UpsertBranchFiscalConfigurationPayload,
  ): Promise<BranchFiscalConfigurationDto> {
    return apiClient.request<BranchFiscalConfigurationDto>('/fiscal/branch-configuration', {
      method: 'PUT',
      body: payload,
    });
  }

  static listDocuments(): Promise<FiscalDocumentListDto> {
    return apiClient.get<FiscalDocumentListDto>('/fiscal/documents');
  }

  static getDocumentDetail(id: string): Promise<FiscalDocumentDetailDto> {
    return apiClient.get<FiscalDocumentDetailDto>(`/fiscal/documents/${id}`);
  }

  static listNumberingRanges(): Promise<FiscalNumberingRangeListDto> {
    return apiClient.get<FiscalNumberingRangeListDto>('/fiscal/numbering-ranges');
  }

  static createCreditNote(
    id: string,
    payload: CreateFiscalCreditNotePayload,
  ): Promise<FiscalCreditNoteActionDto> {
    return apiClient.post<FiscalCreditNoteActionDto>(`/fiscal/documents/${id}/credit-notes`, payload);
  }

  static retryDocument(id: string): Promise<FiscalDocumentActionDto> {
    return apiClient.post<FiscalDocumentActionDto>(`/fiscal/documents/${id}/retry`);
  }

  static downloadArtifacts(id: string): Promise<FiscalDocumentActionDto> {
    return apiClient.post<FiscalDocumentActionDto>(
      `/fiscal/documents/${id}/download-artifacts`,
    );
  }
}
