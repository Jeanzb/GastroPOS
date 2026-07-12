import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  DOWNLOAD_FISCAL_ARTIFACTS_JOB,
  FISCAL_QUEUE_NAME,
  ISSUE_CREDIT_NOTE_JOB,
  ISSUE_FISCAL_DOCUMENT_JOB,
  SYNC_FACTUS_STATUS_JOB,
  type CreditNoteJobData,
  type FiscalDocumentJobData,
} from './fiscal-jobs.constants';
import { CreditNoteWorkflowService } from './credit-note-workflow.service';
import { FiscalDocumentWorkflowService } from './fiscal-document-workflow.service';

@Processor(FISCAL_QUEUE_NAME)
export class FiscalProcessor extends WorkerHost {
  private readonly logger = new Logger(FiscalProcessor.name);

  constructor(
    private readonly workflow: FiscalDocumentWorkflowService,
    private readonly creditNoteWorkflow: CreditNoteWorkflowService,
  ) {
    super();
  }

  async process(job: Job<FiscalDocumentJobData | CreditNoteJobData, void, string>): Promise<void> {
    switch (job.name) {
      case ISSUE_FISCAL_DOCUMENT_JOB:
        await this.workflow.processIssueJob(job.data as FiscalDocumentJobData);
        return;
      case ISSUE_CREDIT_NOTE_JOB:
        await this.creditNoteWorkflow.processIssueJob(job.data as CreditNoteJobData);
        return;
      case DOWNLOAD_FISCAL_ARTIFACTS_JOB:
        await this.workflow.processDownloadArtifactsJob(job.data as FiscalDocumentJobData);
        return;
      case SYNC_FACTUS_STATUS_JOB:
        await this.workflow.processSyncStatusJob(job.data as FiscalDocumentJobData);
        return;
      default:
        this.logger.warn(`Unknown fiscal job ignored: ${job.name}`);
    }
  }
}
