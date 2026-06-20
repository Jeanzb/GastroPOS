import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { TenantStatus } from '@gastroai/contracts';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../redis';

const CACHE_TTL_SECONDS = 300;

export type TenantFeatureMap = Record<string, boolean>;

@Injectable()
export class TenantAccessCacheService {
  private readonly logger = new Logger(TenantAccessCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getTenantStatus(tenantId: string): Promise<TenantStatus | null> {
    const key = tenantStatusKey(tenantId);
    const cached = await this.safeGet(key);
    if (cached) {
      return cached as TenantStatus;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { status: true },
    });
    if (!tenant) {
      return null;
    }
    await this.safeSet(key, tenant.status);
    return tenant.status as TenantStatus;
  }

  async setTenantStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await this.safeSet(tenantStatusKey(tenantId), status);
  }

  async getTenantFeatures(tenantId: string): Promise<TenantFeatureMap | null> {
    const key = tenantFeaturesKey(tenantId);
    const cached = await this.safeGet(key);
    if (cached) {
      return parseFeatureMap(cached);
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        plan: {
          select: {
            features: {
              select: {
                enabled: true,
                feature: { select: { code: true, isActive: true } },
              },
            },
          },
        },
        featureOverrides: {
          select: {
            enabled: true,
            feature: { select: { code: true, isActive: true } },
          },
        },
      },
    });
    if (!tenant) {
      return null;
    }

    const features: TenantFeatureMap = {};
    for (const planFeature of tenant.plan?.features ?? []) {
      features[planFeature.feature.code] = planFeature.enabled && planFeature.feature.isActive;
    }
    for (const override of tenant.featureOverrides) {
      features[override.feature.code] = override.enabled && override.feature.isActive;
    }

    await this.safeSet(key, JSON.stringify(features));
    return features;
  }

  async invalidateTenantFeatures(tenantId: string): Promise<void> {
    await this.safeDel(tenantFeaturesKey(tenantId));
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for ${key}: ${errorMessage(error)}`);
      return null;
    }
  }

  private async safeSet(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', CACHE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Redis SET failed for ${key}: ${errorMessage(error)}`);
    }
  }

  private async safeDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for ${key}: ${errorMessage(error)}`);
    }
  }
}

function tenantStatusKey(tenantId: string): string {
  return `tenant:${tenantId}:status`;
}

function tenantFeaturesKey(tenantId: string): string {
  return `tenant:${tenantId}:features`;
}

function parseFeatureMap(value: string): TenantFeatureMap | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return null;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
