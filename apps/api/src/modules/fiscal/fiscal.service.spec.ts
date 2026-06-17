import {
  FiscalEnvironment,
  FiscalProviderStatus,
  FiscalProviderType,
  type FiscalProfile,
  type FiscalProviderConfig,
} from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import { FiscalService } from './fiscal.service';
import type { FiscalRepository } from './fiscal.repository';
import type { FiscalActor } from './fiscal.types';

const actor: FiscalActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function provider(overrides: Partial<FiscalProviderConfig> = {}): FiscalProviderConfig {
  return {
    id: 'provider_1',
    tenantId: 'tenant_1',
    fiscalProfileId: 'fiscal_1',
    providerType: FiscalProviderType.TECHNOLOGY_PROVIDER,
    providerName: 'Proveedor Demo',
    environment: FiscalEnvironment.TEST,
    status: FiscalProviderStatus.CONFIGURED,
    endpointUrl: 'https://api.proveedor.test',
    softwareId: null,
    certificateAlias: null,
    accountId: 'acct_1',
    apiKeyRef: null,
    lastConnectionTestAt: null,
    lastConnectionError: null,
    createdAt: now,
    updatedAt: now,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

function profile(
  overrides: Partial<FiscalProfile> = {},
  providerConfig: FiscalProviderConfig | null = provider(),
): FiscalProfile & { providerConfig: FiscalProviderConfig | null } {
  return {
    id: 'fiscal_1',
    tenantId: 'tenant_1',
    legalName: 'Restaurante Demo S.A.S.',
    nit: '900123456-7',
    taxRegime: 'Responsable de IVA',
    fiscalResponsibilities: ['O-13'],
    municipality: 'Bogota D.C.',
    address: 'Cra 7 # 12-34',
    invoiceResolutionNumber: '18764000000001',
    invoiceResolutionPrefix: 'SETP',
    numberingRangeFrom: 1,
    numberingRangeTo: 5000,
    numberingValidFrom: now,
    numberingValidUntil: new Date('2027-01-01T00:00:00.000Z'),
    isReady: false,
    createdAt: now,
    updatedAt: now,
    createdById: 'user_1',
    updatedById: null,
    providerConfig,
    ...overrides,
  };
}

describe('FiscalService', () => {
  let repo: {
    findProfile: jest.Mock;
    upsertProfile: jest.Mock;
    updateProviderConnectionResult: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: FiscalService;

  beforeEach(() => {
    repo = {
      findProfile: jest.fn(),
      upsertProfile: jest.fn(),
      updateProviderConnectionResult: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new FiscalService(
      repo as unknown as FiscalRepository,
      audit as unknown as AuditService,
    );
  });

  it('upserts a fiscal profile scoped to the tenant and writes audit', async () => {
    repo.findProfile.mockResolvedValue(null);
    repo.upsertProfile.mockResolvedValue(profile());

    const result = await service.upsertProfile(actor, {
      legalName: ' Restaurante Demo S.A.S. ',
      nit: ' 900123456-7 ',
      invoiceResolutionNumber: '18764000000001',
      invoiceResolutionPrefix: 'SETP',
      numberingRangeFrom: 1,
      numberingRangeTo: 5000,
      providerConfig: {
        providerType: FiscalProviderType.TECHNOLOGY_PROVIDER,
        providerName: 'Proveedor Demo',
        endpointUrl: 'https://api.proveedor.test',
        accountId: 'acct_1',
      },
    });

    expect(repo.upsertProfile).toHaveBeenCalledWith(
      'tenant_1',
      expect.objectContaining({
        legalName: 'Restaurante Demo S.A.S.',
        nit: '900123456-7',
        actorUserId: 'user_1',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FISCAL_PROFILE_CREATED' }),
    );
    expect(result.nit).toBe('900123456-7');
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

  it('marks provider as tested when minimum technical fields exist', async () => {
    const current = profile();
    const testedProvider = provider({
      status: FiscalProviderStatus.CONNECTION_TESTED,
      lastConnectionTestAt: now,
    });
    repo.findProfile.mockResolvedValue(current);
    repo.updateProviderConnectionResult.mockResolvedValue(
      profile({ isReady: true }, testedProvider),
    );

    const result = await service.testProviderConnection(actor);

    expect(repo.updateProviderConnectionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        providerConfigId: 'provider_1',
        status: FiscalProviderStatus.CONNECTION_TESTED,
        isReady: true,
      }),
    );
    expect(result.status).toBe(FiscalProviderStatus.CONNECTION_TESTED);
    expect(result.profile.isReady).toBe(true);
  });

  it('records provider error when DIAN direct config is incomplete', async () => {
    const current = profile(
      {},
      provider({
        providerType: FiscalProviderType.DIAN_DIRECT,
        providerName: null,
        softwareId: null,
        certificateAlias: null,
        accountId: null,
      }),
    );
    repo.findProfile.mockResolvedValue(current);
    repo.updateProviderConnectionResult.mockResolvedValue(
      profile({ isReady: false }, provider({ status: FiscalProviderStatus.ERROR })),
    );

    const result = await service.testProviderConnection(actor);

    expect(repo.updateProviderConnectionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        status: FiscalProviderStatus.ERROR,
        isReady: false,
      }),
    );
    expect(result.status).toBe(FiscalProviderStatus.ERROR);
  });
});
