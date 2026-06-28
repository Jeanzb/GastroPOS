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
  priceAmount: number;
  currency: 'COP';
  billingPeriod: 'MONTH';
  features: FeatureDto[];
}

export interface TenantFeatureDto extends FeatureDto {
  source: 'PLAN' | 'OVERRIDE';
}

export interface PlatformFeatureDto extends FeatureDto {
  tenantOverrideCount: number;
}

export interface TenantFeatureOverrideDto extends TenantFeatureDto {
  overrideReason: string | null;
}

export interface PlatformTenantDto {
  id: string;
  name: string;
  nit: string | null;
  municipality: string | null;
  status: TenantStatus;
  isActive: boolean;
  planCode: string | null;
  planPriceAmount: number | null;
  planPriceCurrency: 'COP' | null;
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
    city: string | null;
    address: string | null;
    phone: string | null;
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
  nit: string;
  municipality: string;
  taxRegime?: string;
  fiscalResponsibility?: string;
  ownerEmail: string;
  ownerFullName: string;
  ownerTemporaryPassword: string;
  branchName: string;
  branchCode: string;
  branchAddress?: string;
  branchPhone?: string;
}

export interface CreatePlatformBranchRequest {
  name: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
}

export interface UpdateTenantStatusRequest {
  status: TenantStatus;
  suspensionReason?: string | null;
}

export interface UpdateTenantPlanRequest {
  planCode: 'BASIC';
}

export interface DeletePlatformTenantRequest {
  confirmationPhrase: string;
  repeatedConfirmationPhrase: string;
}

export interface UpdateTenantFeatureOverrideRequest {
  enabled: boolean;
  reason?: string | null;
}

export type PlatformHealthStatus = 'operational' | 'degraded' | 'down';

export interface PlatformHealthCheckDto {
  name: 'api' | 'postgres' | 'redis';
  status: PlatformHealthStatus;
  latencyMs?: number;
  message?: string;
}

export interface PlatformHealthDto {
  status: PlatformHealthStatus;
  checkedAt: string;
  checks: PlatformHealthCheckDto[];
}
