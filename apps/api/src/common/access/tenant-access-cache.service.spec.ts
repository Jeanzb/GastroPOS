import { TenantAccessCacheService } from './tenant-access-cache.service';

describe('TenantAccessCacheService', () => {
  const prisma = {
    tenant: {
      findFirst: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  const service = new TenantAccessCacheService(prisma as never, redis as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to Postgres when Redis status lookup fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    prisma.tenant.findFirst.mockResolvedValue({ status: 'ACTIVE' });

    await expect(service.getTenantStatus('tenant_1')).resolves.toBe('ACTIVE');
    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
      where: { id: 'tenant_1', deletedAt: null },
      select: { status: true },
    });
  });

  it('uses override values over plan features', async () => {
    redis.get.mockResolvedValue(null);
    prisma.tenant.findFirst.mockResolvedValue({
      plan: {
        features: [
          { enabled: true, feature: { code: 'inventory.enabled', isActive: true } },
        ],
      },
      featureOverrides: [
        { enabled: false, feature: { code: 'inventory.enabled', isActive: true } },
      ],
    });

    await expect(service.getTenantFeatures('tenant_1')).resolves.toEqual({
      'inventory.enabled': false,
    });
  });
});
