import type {
  FeatureDto,
  PlanDto,
  PlatformFeatureDto,
  PlatformRole,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  TenantFeatureOverrideDto,
  PlatformUserDto,
  TenantFeatureDto,
  TenantStatus,
} from '@gastroai/contracts';
import type { AuthenticatedPlatformUser } from './platform.types';

const BASIC_PLAN_PRICE_AMOUNT = 99000;
const BASIC_PLAN_CURRENCY = 'COP' as const;

type UserRoleName =
  | 'OWNER'
  | 'ADMIN'
  | 'CASHIER'
  | 'WAITER'
  | 'KITCHEN'
  | 'INVENTORY_MANAGER'
  | 'ACCOUNTANT';

interface FeatureRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  features: Array<{
    enabled: boolean;
    feature: FeatureRecord;
  }>;
}

interface TenantListRecord {
  id: string;
  name: string;
  status: TenantStatus;
  isActive: boolean;
  createdAt: Date;
  plan: { code: string } | null;
  _count: { branches: number; users: number };
  users: Array<{ lastLoginAt: Date | null }>;
}

interface TenantDetailRecord extends Omit<TenantListRecord, 'users' | 'plan'> {
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  archivedAt: Date | null;
  suspensionReason: string | null;
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
    role: UserRoleName;
    isActive: boolean;
    lastLoginAt: Date | null;
  }>;
  featureOverrides: Array<{
    enabled: boolean;
    feature: FeatureRecord;
  }>;
  plan: PlanRecord | null;
}

export function toPlatformUserDto(user: AuthenticatedPlatformUser): PlatformUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as PlatformRole,
    authScope: 'PLATFORM',
  };
}

export function toPlatformTenantDto(tenant: TenantListRecord): PlatformTenantDto {
  return {
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    isActive: tenant.isActive,
    planCode: tenant.plan?.code ?? null,
    planPriceAmount: tenant.plan?.code === 'BASIC' ? BASIC_PLAN_PRICE_AMOUNT : null,
    planPriceCurrency: tenant.plan?.code === 'BASIC' ? BASIC_PLAN_CURRENCY : null,
    branchCount: tenant._count.branches,
    userCount: tenant._count.users,
    lastLoginAt: isoOrNull(tenant.users[0]?.lastLoginAt ?? null),
    createdAt: tenant.createdAt.toISOString(),
  };
}

export function toPlatformTenantDetailDto(tenant: TenantDetailRecord): PlatformTenantDetailDto {
  const baseFeatures =
    tenant.plan?.features.map((planFeature) => ({
      ...toFeatureDto(planFeature.feature, planFeature.enabled),
      source: 'PLAN' as const,
    })) ?? [];
  const overrideFeatures = tenant.featureOverrides.map((override) => ({
    ...toFeatureDto(override.feature, override.enabled),
    source: 'OVERRIDE' as const,
  }));
  const overrideCodes = new Set(overrideFeatures.map((feature) => feature.code));
  const features: TenantFeatureDto[] = [
    ...baseFeatures.filter((feature) => !overrideCodes.has(feature.code)),
    ...overrideFeatures,
  ].sort((left, right) => left.code.localeCompare(right.code));

  return {
    ...toPlatformTenantDto({
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      plan: tenant.plan,
      _count: tenant._count,
      users: tenant.users,
    }),
    trialEndsAt: isoOrNull(tenant.trialEndsAt),
    suspendedAt: isoOrNull(tenant.suspendedAt),
    cancelledAt: isoOrNull(tenant.cancelledAt),
    archivedAt: isoOrNull(tenant.archivedAt),
    suspensionReason: tenant.suspensionReason,
    features,
    branches: tenant.branches,
    users: tenant.users.map((user) => ({
      ...user,
      lastLoginAt: isoOrNull(user.lastLoginAt),
    })),
  };
}

export function toPlanDto(plan: PlanRecord): PlanDto {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    isActive: plan.isActive,
    priceAmount: plan.code === 'BASIC' ? BASIC_PLAN_PRICE_AMOUNT : 0,
    currency: BASIC_PLAN_CURRENCY,
    billingPeriod: 'MONTH',
    features: plan.features
      .map((feature) => toFeatureDto(feature.feature, feature.enabled))
      .sort((left, right) => left.code.localeCompare(right.code)),
  };
}

export function toPlatformFeatureDto(
  feature: FeatureRecord & { _count: { tenantOverrides: number } },
): PlatformFeatureDto {
  return {
    ...toFeatureDto(feature, feature.isActive),
    tenantOverrideCount: feature._count.tenantOverrides,
  };
}

export function toTenantFeatureOverrideDtos(tenant: {
  plan: { features: PlanRecord['features'] } | null;
  featureOverrides: Array<{ enabled: boolean; reason: string | null; feature: FeatureRecord }>;
}): TenantFeatureOverrideDto[] {
  const baseFeatures =
    tenant.plan?.features.map((planFeature) => ({
      ...toFeatureDto(planFeature.feature, planFeature.enabled),
      source: 'PLAN' as const,
      overrideReason: null,
    })) ?? [];
  const overrideFeatures = tenant.featureOverrides.map((override) => ({
    ...toFeatureDto(override.feature, override.enabled),
    source: 'OVERRIDE' as const,
    overrideReason: override.reason,
  }));
  const overrideCodes = new Set(overrideFeatures.map((feature) => feature.code));
  return [
    ...baseFeatures.filter((feature) => !overrideCodes.has(feature.code)),
    ...overrideFeatures,
  ].sort((left, right) => left.code.localeCompare(right.code));
}

function toFeatureDto(feature: FeatureRecord, enabled: boolean): FeatureDto {
  return {
    id: feature.id,
    code: feature.code,
    name: feature.name,
    description: feature.description,
    enabled: enabled && feature.isActive,
  };
}

function isoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
