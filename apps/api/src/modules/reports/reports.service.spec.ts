import { PaymentMethod, SaleStatus } from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { ReportsRepository, SaleSummaryRecord } from './reports.repository';
import { ReportsService } from './reports.service';

const ctx: TenantRequestContext = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  role: 'OWNER',
  permissions: [],
  sessionId: 'session_1',
};

const from = '2026-06-19T05:00:00.000Z';
const to = '2026-06-20T04:59:59.000Z';
const createdAt = new Date('2026-06-19T14:00:00.000Z');

function sale(overrides: Partial<SaleSummaryRecord> = {}): SaleSummaryRecord {
  return {
    id: 'sale_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    cashSessionId: null,
    diningTableId: 'table_1',
    customerId: null,
    status: SaleStatus.CLOSED,
    currency: 'COP',
    guestCount: 2,
    waiterName: 'Diego Granados',
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
    closedById: 'cashier_1',
    closedAt: createdAt,
    cancelledAt: null,
    createdAt,
    updatedAt: createdAt,
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
        createdAt,
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
        createdById: 'cashier_1',
        createdAt,
      },
    ],
    ...overrides,
  };
}

describe('ReportsService', () => {
  let repo: { findClosedSales: jest.Mock };
  let service: ReportsService;

  beforeEach(() => {
    repo = { findClosedSales: jest.fn() };
    service = new ReportsService(repo as unknown as ReportsRepository);
  });

  it('returns an empty sales summary when there are no closed sales', async () => {
    repo.findClosedSales.mockResolvedValue([]);

    const result = await service.getSalesSummary(ctx, { from, to });

    expect(result).toEqual(
      expect.objectContaining({
        totalSales: 0,
        ticketCount: 0,
        averageTicket: 0,
        itemsSold: 0,
        invoicedCount: 0,
        byMethod: [],
        topProducts: [],
        byHour: [],
      }),
    );
  });

  it('aggregates totals by payment method, product and hour', async () => {
    repo.findClosedSales.mockResolvedValue([
      sale({ id: 'sale_1' }),
      sale({
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
            createdAt,
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
            createdById: 'cashier_1',
            createdAt,
          },
        ],
      }),
    ]);

    const result = await service.getSalesSummary(ctx, { from, to });

    expect(result.totalSales).toBe(70000);
    expect(result.ticketCount).toBe(2);
    expect(result.averageTicket).toBe(35000);
    expect(result.itemsSold).toBe(4);
    expect(result.invoicedCount).toBe(1);
    expect(result.byMethod).toEqual([
      { method: PaymentMethod.CASH, amount: 40000, count: 1 },
      { method: PaymentMethod.CARD, amount: 30000, count: 1 },
    ]);
    expect(result.topProducts).toEqual([
      { name: 'Bandeja paisa', quantity: 2, total: 40000 },
      { name: 'Limonada de coco', quantity: 2, total: 30000 },
    ]);
    expect(result.byHour).toEqual([{ hour: 9, amount: 70000 }]);
  });

  it('uses the requested branch and explicit date range', async () => {
    repo.findClosedSales.mockResolvedValue([]);

    await service.getSalesSummary(ctx, { from, to, branchId: 'branch_2' });

    expect(repo.findClosedSales).toHaveBeenCalledWith(
      'tenant_1',
      'branch_2',
      new Date(from),
      new Date(to),
    );
  });

  it('rejects an inverted date range', async () => {
    await expect(service.getSalesSummary(ctx, { from: to, to: from })).rejects.toBeInstanceOf(
      ApplicationException,
    );

    expect(repo.findClosedSales).not.toHaveBeenCalled();
  });
});
