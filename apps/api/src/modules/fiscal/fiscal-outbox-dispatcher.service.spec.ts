import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { Env } from '../../config/env.schema';
import { FiscalOutboxDispatcherService } from './fiscal-outbox-dispatcher.service';
import type { FiscalDocumentJobData } from './fiscal-jobs.constants';
import type { FiscalRepository } from './fiscal.repository';

describe('FiscalOutboxDispatcherService', () => {
  it('dispatches a due event with a deterministic job id', async () => {
    const repository = {
      findDispatchableOutboxEvents: jest.fn().mockResolvedValue([
        {
          id: 'outbox_1',
          tenantId: 'tenant_1',
          branchId: 'branch_1',
          invoiceId: 'invoice_1',
          attemptCount: 2,
        },
      ]),
    };
    const queue = { add: jest.fn() };
    const config = { get: jest.fn().mockReturnValue(true) };
    const service = new FiscalOutboxDispatcherService(
      repository as unknown as FiscalRepository,
      queue as unknown as Queue<FiscalDocumentJobData>,
      config as unknown as ConfigService<Env, true>,
    );

    await service.dispatchDueEvents();

    expect(queue.add).toHaveBeenCalledWith(
      'issue-fiscal-document',
      {
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        invoiceId: 'invoice_1',
        actorUserId: null,
      },
      expect.objectContaining({
        jobId: 'issue-fiscal-document:outbox:outbox_1:2',
      }),
    );
  });

  it('does not query the outbox when fiscal jobs are disabled', async () => {
    const repository = { findDispatchableOutboxEvents: jest.fn() };
    const queue = { add: jest.fn() };
    const config = { get: jest.fn().mockReturnValue(false) };
    const service = new FiscalOutboxDispatcherService(
      repository as unknown as FiscalRepository,
      queue as unknown as Queue<FiscalDocumentJobData>,
      config as unknown as ConfigService<Env, true>,
    );

    await service.dispatchDueEvents();

    expect(repository.findDispatchableOutboxEvents).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
