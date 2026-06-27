import type { UserRole } from '../enums/user-role';
import type { AuthScope } from '../enums/auth-scope';
import type { AppPermission, RoleProfile } from './permissions.contracts';

export interface LoginRequest {
  tenantIdentifier: string;
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

/** Fast POS staff login: the employee supplies their commerce (name or slug) and their cédula. */
export interface StaffLoginRequest {
  commerce: string;
  documentNumber: string;
}

/** The authenticated user as exposed to the client (never includes secrets). */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  authScope: Exclude<AuthScope, 'PLATFORM'>;
  permissions: AppPermission[];
  availableRoles: RoleProfile[];
  tenantId: string;
  branchId: string | null;
}

export interface LoginResponse {
  user: CurrentUser;
  tokens: AuthTokens;
}
