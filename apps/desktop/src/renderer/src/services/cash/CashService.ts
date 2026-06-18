import { apiClient, ApiError } from '@/api';
import type {
  CashMovementDto,
  CashSessionDto,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  RegisterCashMovementPayload,
} from '@/types/cash';

export class CashService {
  static async getActiveSession(): Promise<CashSessionDto | null> {
    try {
      return await apiClient.get<CashSessionDto>('/cash-sessions/active');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static openSession(payload: OpenCashSessionPayload): Promise<CashSessionDto> {
    return apiClient.post<CashSessionDto>('/cash-sessions', payload);
  }

  static getMovements(sessionId: string): Promise<CashMovementDto[]> {
    return apiClient.get<CashMovementDto[]>(`/cash-sessions/${sessionId}/movements`);
  }

  static registerMovement(
    sessionId: string,
    payload: RegisterCashMovementPayload,
  ): Promise<CashMovementDto> {
    return apiClient.post<CashMovementDto>(`/cash-sessions/${sessionId}/movements`, payload);
  }

  static closeSession(
    sessionId: string,
    payload: CloseCashSessionPayload,
  ): Promise<CashSessionDto> {
    return apiClient.post<CashSessionDto>(`/cash-sessions/${sessionId}/close`, payload);
  }
}
