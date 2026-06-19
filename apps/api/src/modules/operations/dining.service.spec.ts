import { DiningTableStatus, type DiningTable, type DiningZone } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import { DiningRepository } from './dining.repository';
import { DiningService } from './dining.service';
import type { OperationsActor } from './operations.types';

const now = new Date('2026-01-01T00:00:00.000Z');

const actor: OperationsActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  requestId: 'req_1',
};

function zone(overrides: Partial<DiningZone> = {}): DiningZone {
  return {
    id: 'zone_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    name: 'Salon Principal',
    sortOrder: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

function table(overrides: Partial<DiningTable> = {}): DiningTable {
  return {
    id: 'table_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    zoneId: 'zone_1',
    number: '01',
    seats: 4,
    status: DiningTableStatus.FREE,
    waiterName: null,
    openedAt: null,
    reservationName: null,
    reservationTime: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('DiningService', () => {
  let repo: {
    findZonesWithTables: jest.Mock;
    findZoneById: jest.Mock;
    findZoneByName: jest.Mock;
    createZone: jest.Mock;
    updateZone: jest.Mock;
    findTableById: jest.Mock;
    findTableByNumber: jest.Mock;
    createTable: jest.Mock;
    updateTable: jest.Mock;
    updateTableStatus: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: DiningService;

  beforeEach(() => {
    repo = {
      findZonesWithTables: jest.fn(),
      findZoneById: jest.fn(),
      findZoneByName: jest.fn(),
      createZone: jest.fn(),
      updateZone: jest.fn(),
      findTableById: jest.fn(),
      findTableByNumber: jest.fn(),
      createTable: jest.fn(),
      updateTable: jest.fn(),
      updateTableStatus: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new DiningService(
      repo as unknown as DiningRepository,
      audit as unknown as AuditService,
    );
  });

  it('lists zones with tables through the repository', async () => {
    repo.findZonesWithTables.mockResolvedValue([{ ...zone(), tables: [table()] }]);

    const result = await service.listZones(actor);

    expect(repo.findZonesWithTables).toHaveBeenCalledWith('tenant_1', 'branch_1');
    expect(result[0]?.tables[0]?.number).toBe('01');
  });

  it('creates a table only inside an existing branch zone', async () => {
    repo.findZoneById.mockResolvedValue(zone());
    repo.findTableByNumber.mockResolvedValue(null);
    repo.createTable.mockResolvedValue(table({ number: '10' }));

    const result = await service.createTable(actor, 'zone_1', {
      number: '10',
      seats: 4,
    });

    expect(repo.createTable).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch_1',
        tenantId: 'tenant_1',
        zoneId: 'zone_1',
        number: '10',
        createdById: 'user_1',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DINING_TABLE_CREATED' }),
    );
    expect(result.number).toBe('10');
  });

  it('rejects duplicate table numbers in the same branch', async () => {
    repo.findZoneById.mockResolvedValue(zone());
    repo.findTableByNumber.mockResolvedValue(table({ number: '01' }));

    await expect(
      service.createTable(actor, 'zone_1', { number: '01', seats: 4 }),
    ).rejects.toBeInstanceOf(ApplicationException);
    expect(repo.createTable).not.toHaveBeenCalled();
  });

  it('opens a free table and preserves the transition in audit', async () => {
    repo.findTableById.mockResolvedValue(table());
    repo.updateTableStatus.mockResolvedValue(
      table({
        status: DiningTableStatus.OCCUPIED,
        waiterName: 'Maria Restrepo',
        openedAt: now,
      }),
    );

    const result = await service.updateTableStatus(actor, 'table_1', {
      status: 'OCCUPIED',
      waiterName: 'Maria Restrepo',
    });

    expect(repo.updateTableStatus).toHaveBeenCalledWith(
      'tenant_1',
      'table_1',
      'branch_1',
      expect.objectContaining({
        status: DiningTableStatus.OCCUPIED,
        waiterName: 'Maria Restrepo',
        openedAt: expect.any(Date),
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DINING_TABLE_STATUS_UPDATED' }),
    );
    expect(result.status).toBe('OCCUPIED');
  });

  it('requires branch context for dining operations', async () => {
    await expect(service.listZones({ ...actor, branchId: null })).rejects.toBeInstanceOf(
      ApplicationException,
    );
  });
});
