import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { CreditNoteRepository } from './credit-note.repository';
import { CreditNoteWorkflowService } from './credit-note-workflow.service';
import type { FactusAdapter } from './factus/factus.adapter';
import type { FactusConnectionService } from './factus/factus-connection.service';
import type { FiscalActor } from './fiscal.types';

const actor: FiscalActor = {
  tenantId: 'tenant_a',
  branchId: 'branch_a',
  actorUserId: 'user_a',
};

describe('CreditNoteWorkflowService branch isolation', () => {
  let repository: { createDraft: jest.Mock; findCreditNoteForIssue: jest.Mock };
  let service: CreditNoteWorkflowService;

  beforeEach(() => {
    repository = { createDraft: jest.fn(), findCreditNoteForIssue: jest.fn() };
    service = new CreditNoteWorkflowService(
      repository as unknown as CreditNoteRepository,
      { tryRecord: jest.fn() } as unknown as AuditService,
      { add: jest.fn() } as never,
      {} as FactusAdapter,
      {
        getBranchConfiguration: jest.fn().mockResolvedValue({
          isEnabled: true,
          creditNoteNumberingRangeId: 390,
        }),
      } as unknown as FactusConnectionService,
      { get: jest.fn().mockReturnValue(false) } as never,
    );
  });

  it('creates the credit note draft under the active tenant and branch', async () => {
    repository.createDraft.mockResolvedValue(null);

    await expect(
      service.createCreditNote(actor, 'invoice_a', {
        idempotencyKey: 'credit-note-request-a',
        correctionConceptCode: '1',
        lines: [{ invoiceLineId: 'line_a', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repository.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        branchId: 'branch_a',
        invoiceId: 'invoice_a',
      }),
    );
  });

  it('does not create a credit note when the actor has no active branch', async () => {
    await expect(
      service.createCreditNote({ ...actor, branchId: null }, 'invoice_a', {
        idempotencyKey: 'credit-note-request-a',
        correctionConceptCode: '1',
        lines: [{ invoiceLineId: 'line_a', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repository.createDraft).not.toHaveBeenCalled();
  });

  it('loads queued jobs with the tenant and branch from job data', async () => {
    repository.findCreditNoteForIssue.mockResolvedValue(null);

    await service.processIssueJob({
      tenantId: 'tenant_a',
      branchId: 'branch_a',
      creditNoteId: 'credit_note_a',
      actorUserId: 'user_a',
    });

    expect(repository.findCreditNoteForIssue).toHaveBeenCalledWith(
      'tenant_a',
      'branch_a',
      'credit_note_a',
    );
  });
});
