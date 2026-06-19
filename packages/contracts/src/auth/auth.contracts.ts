import type { UserRole } from '../enums/user-role';
import type { AppPermission, RoleProfile } from './permissions.contracts';

export interface LoginRequest {
  email: string;
  password: string;
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
  permissions: AppPermission[];
  availableRoles: RoleProfile[];
  tenantId: string;
  branchId: string | null;
}

export interface LoginResponse {
  user: CurrentUser;
  tokens: AuthTokens;
}
