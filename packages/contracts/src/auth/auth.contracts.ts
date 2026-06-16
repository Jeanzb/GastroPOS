import type { UserRole } from '../enums/user-role';

export interface LoginRequest {
  email: string;
  password: string;
  /** Optional tenant slug for users who belong to more than one business. */
  tenantSlug?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/** The authenticated user as exposed to the client (never includes secrets). */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
}

export interface LoginResponse {
  user: CurrentUser;
  tokens: AuthTokens;
}
