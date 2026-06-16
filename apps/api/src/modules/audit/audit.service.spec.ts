import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let repository: jest.Mocked<Pick<AuditRepository, 'create'>>;
  let service: AuditService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
    };
    service = new AuditService(repository as unknown as AuditRepository);
  });

  it('records normalized audit entries through the repository', async () => {
    await service.record({
      tenantId: 'tenant-1',
      branchId: null,
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'user-1',
      metadata: { result: 'success' },
    });

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      branchId: undefined,
      actorUserId: undefined,
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'user-1',
      before: undefined,
      after: undefined,
      metadata: { result: 'success' },
      ipAddress: undefined,
      userAgent: undefined,
      requestId: undefined,
    });
  });

  it('tryRecord does not throw when audit storage fails', async () => {
    repository.create.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(
      service.tryRecord({
        action: 'FAILED_LOGIN',
        entityType: 'User',
        metadata: { email: 'owner@example.com' },
      }),
    ).resolves.toBeUndefined();
  });
});
