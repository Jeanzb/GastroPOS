import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { redisConnectionOptions } from '../../common/redis/redis-url';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationTelemetryModule } from '../integrations/integration-telemetry.module';
import { CreditNoteRepository } from './credit-note.repository';
import { CreditNoteWorkflowService } from './credit-note-workflow.service';
import { FactusAdapter } from './factus/factus.adapter';
import { FactusConnectionService } from './factus/factus-connection.service';
import { FactusConnectionRepository } from './factus/factus-connection.repository';
import { FactusCredentialsCipher } from './factus/factus-credentials.cipher';
import { FiscalController } from './fiscal.controller';
import { FiscalDocumentWorkflowService } from './fiscal-document-workflow.service';
import { FiscalOutboxDispatcherService } from './fiscal-outbox-dispatcher.service';
import { FISCAL_QUEUE_NAME } from './fiscal-jobs.constants';
import { FiscalProcessor } from './fiscal.processor';
import { FiscalRepository } from './fiscal.repository';
import { FiscalService } from './fiscal.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    IntegrationTelemetryModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisConnectionOptions(config.get('REDIS_URL', { infer: true })),
      }),
    }),
    BullModule.registerQueue({ name: FISCAL_QUEUE_NAME }),
  ],
  controllers: [FiscalController],
  providers: [
    FiscalService,
    FiscalDocumentWorkflowService,
    FiscalOutboxDispatcherService,
    CreditNoteWorkflowService,
    FiscalRepository,
    CreditNoteRepository,
    FactusAdapter,
    FactusConnectionService,
    FactusConnectionRepository,
    FactusCredentialsCipher,
    FiscalProcessor,
  ],
  exports: [FiscalService, CreditNoteWorkflowService, FactusAdapter, FactusConnectionService],
})
export class FiscalModule {}
