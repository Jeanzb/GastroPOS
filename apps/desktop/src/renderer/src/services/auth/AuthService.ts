import { apiClient } from '@/api';
import type { CurrentUser, LoginRequest, LoginResponse, PinLoginRequest } from '@/types/auth';

export class AuthService {
  static login(payload: LoginRequest): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  }

  static pinLogin(payload: PinLoginRequest): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>('/auth/pin-login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  }

  static getCurrentUser(): Promise<CurrentUser> {
    return apiClient.get<CurrentUser>('/auth/me');
  }

  static logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout');
  }
}
