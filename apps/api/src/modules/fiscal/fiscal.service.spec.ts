import { type FiscalProfile } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { FactusAdapter } from './factus/factus.adapter';
import type { FactusConnectionService } from './factus/factus-connection.service';
import type { FiscalDocumentWorkflowService } from './fiscal-document-workflow.service';
import type { FiscalRepository } from './fiscal.repository';
import { FiscalService } from './fiscal.service';
import type { FiscalActor } from './fiscal.types';

const actor: FiscalActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function profile(overrides: Partial<FiscalProfile> = {}): FiscalProfile {
  return {
    id: 'fiscal_1',
    tenantId: 'tenant_1',
    legalName: 'Restaurante Demo S.A.S.',
    nit: '900123456-7',
    taxRegime: 'Responsable de IVA',
    fiscalResponsibilities: ['O-13'],
    countryCode: 'CO',
    municipality: 'Bogota D.C.',
    municipalityCode: null,
    address: 'Cra 7 # 12-34',
    email: null,
    phone: null,
    dv: null,
    invoiceResolutionNumber: '18764000000001',
    invoiceResolutionPrefix: 'SETP',
    numberingRangeFrom: 1,
    numberingRangeTo: 5000,
    numberingValidFrom: now,
    numberingValidUntil: new Date('2027-01-01T00:00:00.000Z'),
    numberingRangeId: 389,
    creditNoteNumberingRangeId: 390,
    isReady: true,
    createdAt: now,
    updatedAt: now,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('FiscalService', () => {
  let repo: { findProfile: jest.Mock; upsertProfile: jest.Mock };
  let audit: { tryRecord: jest.Mock };
  let factus: { listDianNumberingRanges: jest.Mock };
  let connection: { getRuntime: jest.Mock };
  let documents: {
    listDocuments: jest.Mock;
    retryDocument: jest.Mock;
    requestArtifactDownload: jest.Mock;
    tryScheduleInvoiceIssue: jest.Mock;
  };
  let service: FiscalService;

  beforeEach(() => {
    repo = { findProfile: jest.fn(), upsertProfile: jest.fn() };
    audit = { tryRecord: jest.fn() };
    factus = { listDianNumberingRanges: jest.fn() };
    connection = { getRuntime: jest.fn().mockResolvedValue({ tenantId: 'tenant_1' }) };
    documents = {
      listDocuments: jest.fn(),
      retryDocument: jest.fn(),
      requestArtifactDownload: jest.fn(),
      tryScheduleInvoiceIssue: jest.fn(),
    };
    service = new FiscalService(
      repo as unknown as FiscalRepository,
      audit as unknown as AuditService,
      factus as unknown as FactusAdapter,
      connection as unknown as FactusConnectionService,
      documents as unknown as FiscalDocumentWorkflowService,
    );
  });

  it('upserts tenant fiscal data without storing provider connection configuration', async () => {
    repo.findProfile.mockResolvedValue(null);
    repo.upsertProfile.mockResolvedValue(profile());

    const result = await service.upsertProfile(actor, {
      legalName: ' Restaurante Demo S.A.S. ',
      nit: ' 900123456-7 ',
      invoiceResolutionNumber: '18764000000001',
      invoiceResolutionPrefix: 'SETP',
      numberingRangeFrom: 1,
      numberingRangeTo: 5000,
      numberingRangeId: 389,
      creditNoteNumberingRangeId: 390,
    });

    expect(repo.upsertProfile).toHaveBeenCalledWith(
      'tenant_1',
      expect.objectContaining({
        legalName: 'Restaurante Demo S.A.S.',
        nit: '900123456-7',
        isReady: true,
        actorUserId: 'user_1',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FISCAL_PROFILE_CREATED' }),
    );
    expect(result.nit).toBe('900123456-7');
    expect(repo.upsertProfile.mock.calls[0]?.[1]).not.toHaveProperty('providerConfig');
  });

  it('rejects an invalid invoice numbering range', async () => {
    await expect(
      service.upsertProfile(actor, {
        legalName: 'Restaurante Demo',
        nit: '900123456-7',
        numberingRangeFrom: 20,
        numberingRangeTo: 10,
      }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(repo.upsertProfile).not.toHaveBeenCalled();
  });

  it('keeps readiness false until the minimum resolution and range data exists', async () => {
    repo.findProfile.mockResolvedValue(profile());
    repo.upsertProfile.mockResolvedValue(profile({ isReady: false, numberingRangeId: null }));

    await service.upsertProfile(actor, {
      legalName: 'Restaurante Demo S.A.S.',
      nit: '900123456-7',
      invoiceResolutionNumber: '18764000000001',
      invoiceResolutionPrefix: 'SETP',
      numberingRangeFrom: 1,
      numberingRangeTo: 5000,
    });

    expect(repo.upsertProfile).toHaveBeenCalledWith(
      'tenant_1',
      expect.objectContaining({ isReady: false }),
    );
  });

  it('normalizes tenant numbering ranges without exposing provider configuration', async () => {
    const current = profile();
    repo.findProfile.mockResolvedValue(current);
    factus.listDianNumberingRanges.mockResolvedValue({
      endpoint: '/v2/numbering-ranges',
      httpStatus: 200,
      payload: {
        data: [
          {
            id: 389,
            document: '21',
            prefix: 'SETP',
            resolution_number: '18764000000001',
            from: 1,
            to: 5000,
            current: 42,
            valid_until: '2027-01-01',
            status: 'active',
          },
        ],
      },
    });

    const result = await service.listNumberingRanges(actor);

    expect(factus.listDianNumberingRanges).toHaveBeenCalledWith({ tenantId: 'tenant_1' });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 389,
        prefix: 'SETP',
        rangeFrom: 1,
        rangeTo: 5000,
        current: 42,
        isActive: true,
      }),
    ]);
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FISCAL_NUMBERING_RANGES_SYNCED' }),
    );
  });

  it('rejects range synchronization when the fiscal profile is not configured', async () => {
    repo.findProfile.mockResolvedValue(null);

    await expect(service.listNumberingRanges(actor)).rejects.toBeInstanceOf(ApplicationException);
    expect(factus.listDianNumberingRanges).not.toHaveBeenCalled();
  });
});
