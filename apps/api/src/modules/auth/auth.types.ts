import type { UserRole } from '../../../generated/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
  sessionId: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
  sessionId: string;
}

export interface AuthRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokenPair;
}
