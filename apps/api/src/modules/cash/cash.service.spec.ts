import {
  CashMovementType,
  CashSessionStatus,
  type CashMovement,
  type CashSession,
} from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { TenantRequestContext } from '../auth/auth.types';
import type { CashRepository } from './cash.repository';
import { CashService } from './cash.service';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'CASHIER',
  permissions: [],
  sessionId: 'session_1',
};

const now = new Date('2026-01-01T00:00:00.000Z');

function cashSession(overrides: Partial<CashSession> = {}): CashSession {
  return {
    id: 'cash_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    status: CashSessionStatus.OPEN,
    currency: 'COP',
    openingBalance: 100000,
    expectedAmount: null,
    countedAmount: null,
    difference: null,
    notes: null,
    openedById: 'user_1',
    closedById: null,
    openedAt: now,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function movement(overrides: Partial<CashMovement> = {}): CashMovement {
  return {
    id: 'movement_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    cashSessionId: 'cash_1',
    type: CashMovementType.CASH_IN,
    amount: 20000,
    reference: null,
    notes: null,
    createdById: 'user_1',
    createdAt: now,
    ...overrides,
  };
}

describe('CashService', () => {
  let repo: {
    branchExists: jest.Mock;
    findActiveByBranch: jest.Mock;
    findById: jest.Mock;
    listMovements: jest.Mock;
    openSession: jest.Mock;
    createMovement: jest.Mock;
    closeSession: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: CashService;

  beforeEach(() => {
    repo = {
      branchExists: jest.fn(),
      findActiveByBranch: jest.fn(),
      findById: jest.fn(),
      listMovements: jest.fn(),
      openSession: jest.fn(),
      createMovement: jest.fn(),
      closeSession: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new CashService(repo as unknown as CashRepository, audit as unknown as AuditService);
  });

  it('opens a cash session for a valid tenant branch and writes audit', async () => {
    repo.branchExists.mockResolvedValue(true);
    repo.findActiveByBranch.mockResolvedValue(null);
    repo.openSession.mockResolvedValue(cashSession());

    const result = await service.openSession(ctx, {
      openingBalance: 100000,
      notes: 'Inicio turno',
    });

    expect(repo.openSession).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch_1',
        openingBalance: 100000,
        currency: 'COP',
        notes: 'Inicio turno',
        openedById: 'user_1',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CASH_SESSION_OPENED' }),
    );
    expect(result.status).toBe('OPEN');
  });

  it('rejects opening when the branch already has an open session', async () => {
    repo.branchExists.mockResolvedValue(true);
    repo.findActiveByBranch.mockResolvedValue(cashSession());

    await expect(service.openSession(ctx, { openingBalance: 100000 })).rejects.toBeInstanceOf(
      ApplicationException,
    );
    expect(repo.openSession).not.toHaveBeenCalled();
  });

  it('registers a movement only for an open session', async () => {
    repo.findById.mockResolvedValue(cashSession());
    repo.createMovement.mockResolvedValue(movement());

    const result = await service.registerMovement(ctx, 'cash_1', {
      type: 'CASH_IN',
      amount: 20000,
      reference: 'aporte',
    });

    expect(repo.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        cashSessionId: 'cash_1',
        branchId: 'branch_1',
        type: 'CASH_IN',
        amount: 20000,
        reference: 'aporte',
      }),
    );
    expect(result.amount).toBe(20000);
  });

  it('closes a session calculating expected amount and difference', async () => {
    repo.findById.mockResolvedValue(cashSession());
    repo.listMovements.mockResolvedValue([
      movement({
        id: 'opening',
        type: CashMovementType.OPENING_BALANCE,
        amount: 100000,
      }),
      movement({ id: 'sale', type: CashMovementType.SALE_PAYMENT, amount: 50000 }),
      movement({ id: 'cash_out', type: CashMovementType.CASH_OUT, amount: 10000 }),
    ]);
    repo.closeSession.mockResolvedValue(
      cashSession({
        status: CashSessionStatus.CLOSED,
        expectedAmount: 140000,
        countedAmount: 138000,
        difference: -2000,
        closedById: 'user_1',
        closedAt: now,
      }),
    );

    const result = await service.closeSession(ctx, 'cash_1', {
      countedAmount: 138000,
    });

    expect(repo.closeSession).toHaveBeenCalledWith(
      'cash_1',
      expect.objectContaining({
        expectedAmount: 140000,
        countedAmount: 138000,
        difference: -2000,
      }),
    );
    expect(result.status).toBe('CLOSED');
    expect(result.difference).toBe(-2000);
  });
});
