import { apiClient } from '@/api';
import type { CurrentUser, LoginRequest, LoginResponse, StaffLoginRequest } from '@/types/auth';

export class AuthService {
  static login(payload: LoginRequest): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  }

  static staffLogin(payload: StaffLoginRequest): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>('/auth/staff-login', {
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
