import { FiscalInvoiceStatus } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { FactusAdapter } from './factus/factus.adapter';
import type { FactusConnectionService } from './factus/factus-connection.service';
import { DOWNLOAD_FISCAL_ARTIFACTS_JOB } from './fiscal-jobs.constants';
import { FiscalDocumentWorkflowService } from './fiscal-document-workflow.service';
import type { FiscalRepository } from './fiscal.repository';
import type { FiscalActor } from './fiscal.types';

const actor: FiscalActor = {
  tenantId: 'tenant_a',
  branchId: 'branch_a',
  actorUserId: 'user_a',
};

describe('FiscalDocumentWorkflowService branch isolation', () => {
  let repository: {
    findInvoiceDetail: jest.Mock;
    findInvoiceForIssue: jest.Mock;
  };
  let queue: { add: jest.Mock };
  let service: FiscalDocumentWorkflowService;

  beforeEach(() => {
    repository = {
      findInvoiceDetail: jest.fn(),
      findInvoiceForIssue: jest.fn(),
    };
    queue = { add: jest.fn() };
    service = new FiscalDocumentWorkflowService(
      repository as unknown as FiscalRepository,
      { tryRecord: jest.fn() } as unknown as AuditService,
      queue as never,
      {} as FactusAdapter,
      {} as FactusConnectionService,
      { get: jest.fn().mockReturnValue(false) } as never,
    );
  });

  it('looks up document detail with both tenant and active branch', async () => {
    repository.findInvoiceDetail.mockResolvedValue(null);

    await expect(
      service.getDocumentDetail(actor, 'invoice_from_other_branch'),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repository.findInvoiceDetail).toHaveBeenCalledWith(
      'tenant_a',
      'branch_a',
      'invoice_from_other_branch',
    );
  });

  it('rejects document operations without an active branch before querying persistence', async () => {
    await expect(
      service.getDocumentDetail({ ...actor, branchId: null }, 'invoice_a'),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repository.findInvoiceDetail).not.toHaveBeenCalled();
  });

  it('queues evidence download using the same tenant and branch scope', async () => {
    repository.findInvoiceForIssue.mockResolvedValue(fiscalInvoice());

    await service.requestArtifactDownload(actor, 'invoice_a');

    expect(repository.findInvoiceForIssue).toHaveBeenCalledWith(
      'tenant_a',
      'branch_a',
      'invoice_a',
    );
    expect(queue.add).toHaveBeenCalledWith(
      DOWNLOAD_FISCAL_ARTIFACTS_JOB,
      expect.objectContaining({
        tenantId: 'tenant_a',
        branchId: 'branch_a',
        invoiceId: 'invoice_a',
      }),
      expect.any(Object),
    );
  });
});

function fiscalInvoice() {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'invoice_a',
    tenantId: 'tenant_a',
    branchId: 'branch_a',
    saleId: null,
    customerId: null,
    fiscalProfileId: null,
    documentType: 'INVOICE',
    status: FiscalInvoiceStatus.ACCEPTED_BY_DIAN,
    referenceCode: 'sale:tenant_a:sale_a:v1',
    prefix: 'FE',
    number: 1,
    factusNumber: 'FE-1',
    factusId: '1',
    cufe: null,
    cude: null,
    qrUrl: null,
    publicUrl: null,
    customerName: 'Consumidor final',
    customerDocumentNumber: null,
    subtotalAmount: 10000,
    taxAmount: 1900,
    discountAmount: 0,
    totalAmount: 11900,
    currency: 'COP',
    isValidated: true,
    retryCount: 0,
    lastErrorCode: null,
    sentAt: now,
    acceptedAt: now,
    validatedAt: now,
    rejectedAt: null,
    createdAt: now,
    updatedAt: now,
    pdfBase64: null,
    pdfUrl: null,
    xmlBase64: null,
    xmlUrl: null,
    attachedDocumentXmlBase64: null,
  };
}
