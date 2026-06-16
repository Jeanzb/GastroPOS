import { toAuditLogCreateData } from './audit-log.mapper';

describe('toAuditLogCreateData', () => {
  it('removes nullable optional fields and keeps audit payload data', () => {
    expect(
      toAuditLogCreateData({
        tenantId: 'tenant-1',
        branchId: null,
        actorUserId: '',
        action: 'PRODUCT_PRICE_CHANGED',
        entityType: 'Product',
        entityId: 'product-1',
        before: { priceMinor: 1000 },
        after: { priceMinor: 1200 },
        metadata: { source: 'test' },
        ipAddress: null,
        userAgent: 'jest',
        requestId: 'req-1',
      }),
    ).toEqual({
      tenantId: 'tenant-1',
      branchId: undefined,
      actorUserId: undefined,
      action: 'PRODUCT_PRICE_CHANGED',
      entityType: 'Product',
      entityId: 'product-1',
      before: { priceMinor: 1000 },
      after: { priceMinor: 1200 },
      metadata: { source: 'test' },
      ipAddress: undefined,
      userAgent: 'jest',
      requestId: 'req-1',
    });
  });
});
