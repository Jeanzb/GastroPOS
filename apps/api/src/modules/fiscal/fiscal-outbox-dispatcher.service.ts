import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import type { Env } from '../../config/env.schema';
import {
  FISCAL_QUEUE_NAME,
  ISSUE_FISCAL_DOCUMENT_JOB,
  type FiscalDocumentJobData,
} from './fiscal-jobs.constants';
import { FiscalRepository } from './fiscal.repository';
import { jobOptions } from './fiscal.utils';

@Injectable()
export class FiscalOutboxDispatcherService {
  private readonly logger = new Logger(FiscalOutboxDispatcherService.name);
  private isDispatching = false;

  constructor(
    private readonly repository: FiscalRepository,
    @InjectQueue(FISCAL_QUEUE_NAME)
    private readonly fiscalQueue: Queue<FiscalDocumentJobData>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron('*/30 * * * * *')
  async dispatchDueEvents(): Promise<void> {
    if (this.isDispatching || !this.config.get('FISCAL_QUEUE_ENABLED', { infer: true })) {
      return;
    }

    this.isDispatching = true;
    try {
      const events = await this.repository.findDispatchableOutboxEvents();
      for (const event of events) {
        if (!event.invoiceId || !event.branchId) {
          continue;
        }
        await this.fiscalQueue.add(
          ISSUE_FISCAL_DOCUMENT_JOB,
          {
            tenantId: event.tenantId,
            branchId: event.branchId,
            invoiceId: event.invoiceId,
            actorUserId: null,
          },
          jobOptions(`${ISSUE_FISCAL_DOCUMENT_JOB}:outbox:${event.id}:${event.attemptCount}`),
        );
      }
    } catch (error) {
      this.logger.error(
        'Fiscal outbox dispatch failed.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isDispatching = false;
    }
  }
}
