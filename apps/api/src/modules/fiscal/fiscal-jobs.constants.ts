export const FISCAL_QUEUE_NAME = 'fiscal-documents';

export const ISSUE_FISCAL_DOCUMENT_JOB = 'issue-fiscal-document';
export const ISSUE_CREDIT_NOTE_JOB = 'issue-credit-note';
export const DOWNLOAD_FISCAL_ARTIFACTS_JOB = 'download-fiscal-artifacts';
export const SYNC_FACTUS_STATUS_JOB = 'sync-factus-status';

export interface FiscalDocumentJobData {
  tenantId: string;
  branchId: string | null;
  invoiceId: string;
  actorUserId: string | null;
}

export interface CreditNoteJobData {
  tenantId: string;
  branchId: string | null;
  creditNoteId: string;
  actorUserId: string | null;
}
