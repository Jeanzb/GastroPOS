import type { AuthTokens } from '../auth/auth.contracts';
import type { AuthScope } from '../enums/auth-scope';
import type { PlatformRole } from '../enums/platform-role';
import type { TenantStatus } from '../enums/tenant-status';

export interface PlatformLoginRequest {
  email: string;
  password: string;
}

export interface PlatformRefreshTokenRequest {
  refreshToken: string;
}

export interface PlatformUserDto {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  authScope: Extract<AuthScope, 'PLATFORM'>;
}

export interface PlatformAuthResponse {
  user: PlatformUserDto;
  tokens: AuthTokens;
}

export interface FeatureDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface PlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  features: FeatureDto[];
}

export interface TenantFeatureDto extends FeatureDto {
  source: 'PLAN' | 'OVERRIDE';
}

export interface PlatformTenantDto {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  isActive: boolean;
  planCode: string | null;
  branchCount: number;
  userCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformTenantDetailDto extends PlatformTenantDto {
  trialEndsAt: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  archivedAt: string | null;
  suspensionReason: string | null;
  features: TenantFeatureDto[];
  branches: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }>;
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  }>;
}

export interface PlatformOverviewDto {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  pastDueTenants: number;
}

export interface CreatePlatformTenantRequest {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFullName: string;
  ownerTemporaryPassword: string;
  branchName: string;
  branchCode: string;
}

export interface UpdateTenantStatusRequest {
  status: TenantStatus;
  suspensionReason?: string | null;
}

export interface UpdateTenantPlanRequest {
  planCode: 'BASIC';
}
