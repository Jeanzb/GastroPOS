import {
  CashMovementType,
  CashSessionStatus,
  PaymentMethod,
  SaleStatus,
  type CashMovement,
  type CashSession,
} from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { TenantRequestContext } from '../auth/auth.types';
import type { CashRepository } from './cash.repository';
import type { CashZSaleRecord, CashZSessionRecord } from './cash.repository';
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

function zSession(overrides: Partial<CashZSessionRecord> = {}): CashZSessionRecord {
  return {
    ...cashSession({ status: CashSessionStatus.CLOSED, closedById: 'user_1', closedAt: now }),
    branch: { id: 'branch_1', name: 'Sede Centro', code: 'CE' },
    movements: [
      movement({ id: 'opening', type: CashMovementType.OPENING_BALANCE, amount: 100000 }),
      movement({ id: 'sale_cash', type: CashMovementType.SALE_PAYMENT, amount: 40000 }),
      movement({ id: 'cash_out', type: CashMovementType.CASH_OUT, amount: 10000 }),
    ],
    ...overrides,
  };
}

function zSale(overrides: Partial<CashZSaleRecord> = {}): CashZSaleRecord {
  return {
    id: 'sale_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    cashSessionId: 'cash_1',
    diningTableId: 'table_1',
    customerId: null,
    status: SaleStatus.CLOSED,
    currency: 'COP',
    guestCount: 2,
    waiterName: 'Maria Restrepo',
    customerName: null,
    requiresInvoice: false,
    subtotal: 40000,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 40000,
    paidTotal: 40000,
    notes: null,
    cancelReason: null,
    createdById: 'user_1',
    closedById: 'user_1',
    closedAt: now,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'item_1',
        tenantId: 'tenant_1',
        saleId: 'sale_1',
        productId: 'product_1',
        nameSnapshot: 'Bandeja paisa',
        unitPriceSnapshot: 20000,
        quantity: 2,
        lineTotal: 40000,
        createdAt: now,
      },
    ],
    payments: [
      {
        id: 'payment_1',
        tenantId: 'tenant_1',
        saleId: 'sale_1',
        method: PaymentMethod.CASH,
        amount: 40000,
        reference: null,
        createdById: 'user_1',
        createdAt: now,
      },
    ],
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
    findZSessionById: jest.Mock;
    findClosedSalesForShift: jest.Mock;
    findClosedSalesForSession: jest.Mock;
    findTenantTimezone: jest.Mock;
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
      findZSessionById: jest.fn(),
      findClosedSalesForShift: jest.fn(),
      findClosedSalesForSession: jest.fn(),
      findTenantTimezone: jest.fn(),
    };
    repo.findClosedSalesForSession.mockResolvedValue([]);
    repo.findTenantTimezone.mockResolvedValue('America/Bogota');
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
    repo.branchExists.mockResolvedValue(true);
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

  it('rejects listing movements from a session outside the actor branch', async () => {
    repo.findById.mockResolvedValue(cashSession({ branchId: 'branch_2' }));

    await expect(service.listMovements(ctx, 'cash_1')).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.listMovements).not.toHaveBeenCalled();
  });

  it('closes a session calculating expected amount and difference', async () => {
    repo.findById.mockResolvedValue(cashSession());
    repo.branchExists.mockResolvedValue(true);
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
        closedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe('CLOSED');
    expect(result.difference).toBe(-2000);
    expect(result.cashExpectedAmount).toBe(140000);
    expect(result.bankedExpectedAmount).toBe(0);
  });

  it('rejects closing a session outside the actor branch', async () => {
    repo.findById.mockResolvedValue(cashSession({ branchId: 'branch_2' }));

    await expect(
      service.closeSession(ctx, 'cash_1', { countedAmount: 100000 }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.listMovements).not.toHaveBeenCalled();
    expect(repo.closeSession).not.toHaveBeenCalled();
  });

  it('builds a Z report from a closed cash session and closed sales', async () => {
    repo.findZSessionById.mockResolvedValue(
      zSession({
        expectedAmount: 130000,
        countedAmount: 129000,
        difference: -1000,
      }),
    );
    repo.branchExists.mockResolvedValue(true);
    repo.findClosedSalesForSession.mockResolvedValue([
      zSale(),
      zSale({
        id: 'sale_2',
        grandTotal: 30000,
        paidTotal: 30000,
        requiresInvoice: true,
        items: [
          {
            id: 'item_2',
            tenantId: 'tenant_1',
            saleId: 'sale_2',
            productId: 'product_2',
            nameSnapshot: 'Limonada de coco',
            unitPriceSnapshot: 15000,
            quantity: 2,
            lineTotal: 30000,
            createdAt: now,
          },
        ],
        payments: [
          {
            id: 'payment_2',
            tenantId: 'tenant_1',
            saleId: 'sale_2',
            method: PaymentMethod.CARD,
            amount: 30000,
            reference: 'AUTH-1',
            createdById: 'user_1',
            createdAt: now,
          },
        ],
      }),
    ]);

    const result = await service.getZReport(ctx, 'cash_1');

    expect(repo.findClosedSalesForSession).toHaveBeenCalledWith('tenant_1', 'branch_1', 'cash_1');
    expect(result).toEqual(
      expect.objectContaining({
        branchName: 'Sede Centro',
        timezone: 'America/Bogota',
        operationalDate: '2025-12-31',
        businessDayStartsAtHour: 4,
        expectedAmount: 130000,
        cashExpectedAmount: 130000,
        bankedExpectedAmount: 30000,
        totalExpectedAmount: 160000,
        countedAmount: 129000,
        difference: -1000,
        totalSales: 70000,
        ticketCount: 2,
        averageTicket: 35000,
        itemsSold: 4,
        invoicedCount: 1,
      }),
    );
    expect(result.byMethod).toEqual([
      { method: PaymentMethod.CASH, amount: 40000, count: 1 },
      { method: PaymentMethod.CARD, amount: 30000, count: 1 },
    ]);
    expect(result.paymentsByMethod).toEqual(result.byMethod);
    expect(result.movements).toEqual([
      expect.objectContaining({
        id: 'cash_out',
        type: CashMovementType.CASH_OUT,
        signedAmount: -10000,
      }),
    ]);
    expect(result.topProducts).toEqual([
      { name: 'Bandeja paisa', quantity: 2, total: 40000 },
      { name: 'Limonada de coco', quantity: 2, total: 30000 },
    ]);
  });

  it('rejects Z report generation before the cash session is closed', async () => {
    repo.findZSessionById.mockResolvedValue(
      zSession({ status: CashSessionStatus.OPEN, closedAt: null, closedById: null }),
    );
    repo.branchExists.mockResolvedValue(true);

    await expect(service.getZReport(ctx, 'cash_1')).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.findClosedSalesForSession).not.toHaveBeenCalled();
  });
});
