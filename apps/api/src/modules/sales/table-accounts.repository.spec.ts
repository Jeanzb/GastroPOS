import {
  CashMovementType,
  CashSessionStatus,
  CustomerDocumentType,
  DiningTableStatus,
  FiscalInvoiceStatus,
  PaymentMethod,
  SaleStatus,
} from '../../../generated/prisma';
import type { PrismaService } from '../../database/prisma.service';
import type { InventoryConsumptionService } from '../inventory/inventory-consumption.service';
import { TableAccountsRepository } from './table-accounts.repository';

const now = new Date('2026-01-01T00:00:00.000Z');

function sale(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    cashSessionId: null,
    diningTableId: 'table_1',
    customerId: null,
    status: SaleStatus.DRAFT,
    currency: 'COP',
    guestCount: 2,
    waiterName: 'Maria Restrepo',
    customerName: null,
    requiresInvoice: false,
    subtotal: 32000,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 32000,
    paidTotal: 0,
    notes: null,
    cancelReason: null,
    createdById: 'user_1',
    closedById: null,
    closedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    diningTable: { id: 'table_1', number: '01' },
    items: [
      {
        id: 'item_1',
        tenantId: 'tenant_1',
        saleId: 'sale_1',
        productId: 'product_1',
        nameSnapshot: 'Bandeja paisa',
        unitPriceSnapshot: 32000,
        quantity: 1,
        lineTotal: 32000,
        fiscalName: 'Bandeja paisa',
        fiscalCodeReference: 'product_1',
        unitMeasureCode: '94',
        standardCode: '999',
        factusTaxCode: '01',
        taxRateBasisPoints: 0,
        isTaxExcluded: false,
        createdAt: now,
      },
    ],
    payments: [],
    ...overrides,
  };
}

function prismaMock() {
  const tx = {
    sale: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cashSession: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn().mockResolvedValue({ id: 'product_1', isInventoried: false }),
    },
    inventoryBalance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn().mockResolvedValue({ id: 'payment_1' }),
    },
    cashMovement: {
      create: jest.fn().mockResolvedValue({ id: 'cash_movement_1' }),
    },
    customer: {
      upsert: jest.fn(),
    },
    fiscalProfile: {
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    diningTable: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  };

  return { prisma, tx };
}

function inventoryConsumptionMock(): jest.Mocked<
  Pick<InventoryConsumptionService, 'consumeSaleItems'>
> {
  return {
    consumeSaleItems: jest.fn().mockResolvedValue({ status: 'OK' }),
  };
}

describe('TableAccountsRepository', () => {
  it('requires an open cash session before charging any payment method', async () => {
    const { prisma, tx } = prismaMock();
    tx.sale.findFirst.mockResolvedValueOnce(sale());
    tx.cashSession.findFirst.mockResolvedValueOnce(null);
    const inventoryConsumption = inventoryConsumptionMock();
    const repository = new TableAccountsRepository(
      prisma as unknown as PrismaService,
      inventoryConsumption as unknown as InventoryConsumptionService,
    );

    const result = await repository.chargeAccount({
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      saleId: 'sale_1',
      method: PaymentMethod.CARD,
      amount: 32000,
      reference: null,
      factusPaymentMethodCode: null,
      requiresInvoice: false,
      customer: null,
      chargedById: 'user_1',
    });

    expect(result).toEqual({ status: 'NO_ACTIVE_CASH_SESSION' });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.sale.updateMany).not.toHaveBeenCalled();
    expect(tx.diningTable.updateMany).not.toHaveBeenCalled();
  });

  it('closes card payments under the open session without creating a cash movement', async () => {
    const { prisma, tx } = prismaMock();
    tx.sale.findFirst.mockResolvedValueOnce(sale()).mockResolvedValueOnce(
      sale({
        status: SaleStatus.CLOSED,
        cashSessionId: 'cash_session_1',
        paidTotal: 32000,
        payments: [{ id: 'payment_1', method: PaymentMethod.CARD, amount: 32000 }],
      }),
    );
    tx.cashSession.findFirst.mockResolvedValueOnce({
      id: 'cash_session_1',
      status: CashSessionStatus.OPEN,
    });
    const inventoryConsumption = inventoryConsumptionMock();
    const repository = new TableAccountsRepository(
      prisma as unknown as PrismaService,
      inventoryConsumption as unknown as InventoryConsumptionService,
    );

    const result = await repository.chargeAccount({
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      saleId: 'sale_1',
      method: PaymentMethod.CARD,
      amount: 32000,
      reference: 'APPROVAL-123',
      factusPaymentMethodCode: '48',
      requiresInvoice: false,
      customer: null,
      chargedById: 'user_1',
    });

    expect(result.status).toBe('CHARGED');
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          method: PaymentMethod.CARD,
          amount: 32000,
          reference: 'APPROVAL-123',
          factusPaymentMethodCode: '48',
        }),
      }),
    );
    expect(tx.cashMovement.create).not.toHaveBeenCalled();
    expect(tx.sale.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SaleStatus.CLOSED,
          cashSessionId: 'cash_session_1',
          paidTotal: 32000,
        }),
      }),
    );
    expect(tx.diningTable.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DiningTableStatus.FREE,
          waiterName: null,
          openedAt: null,
        }),
      }),
    );
  });

  it('creates a physical cash movement only for cash payments', async () => {
    const { prisma, tx } = prismaMock();
    tx.sale.findFirst.mockResolvedValueOnce(sale()).mockResolvedValueOnce(
      sale({
        status: SaleStatus.CLOSED,
        cashSessionId: 'cash_session_1',
        paidTotal: 32000,
        payments: [{ id: 'payment_1', method: PaymentMethod.CASH, amount: 32000 }],
      }),
    );
    tx.cashSession.findFirst.mockResolvedValueOnce({
      id: 'cash_session_1',
      status: CashSessionStatus.OPEN,
    });
    const inventoryConsumption = inventoryConsumptionMock();
    const repository = new TableAccountsRepository(
      prisma as unknown as PrismaService,
      inventoryConsumption as unknown as InventoryConsumptionService,
    );

    const result = await repository.chargeAccount({
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      saleId: 'sale_1',
      method: PaymentMethod.CASH,
      amount: 32000,
      reference: null,
      factusPaymentMethodCode: null,
      requiresInvoice: false,
      customer: null,
      chargedById: 'user_1',
    });

    expect(result.status).toBe('CHARGED');
    expect(tx.cashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cashSessionId: 'cash_session_1',
          type: CashMovementType.SALE_PAYMENT,
          amount: 32000,
          reference: 'sale_1',
        }),
      }),
    );
  });

  it('creates fiscal invoice lines with net unit price, line tax and Factus payment method code', async () => {
    const { prisma, tx } = prismaMock();
    tx.sale.findFirst
      .mockResolvedValueOnce(
        sale({
          subtotal: 10800,
          grandTotal: 10800,
          items: [
            {
              id: 'item_inc',
              tenantId: 'tenant_1',
              saleId: 'sale_1',
              productId: 'product_inc',
              nameSnapshot: 'Menu restaurante',
              unitPriceSnapshot: 10800,
              quantity: 1,
              lineTotal: 10800,
              fiscalName: 'Menu restaurante',
              fiscalCodeReference: 'MENU-INC',
              unitMeasureCode: '94',
              standardCode: '999',
              factusTaxCode: '04',
              taxRateBasisPoints: 800,
              isTaxExcluded: false,
              createdAt: now,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        sale({
          status: SaleStatus.CLOSED,
          cashSessionId: 'cash_session_1',
          paidTotal: 10800,
          payments: [{ id: 'payment_1', method: PaymentMethod.CARD, amount: 10800 }],
        }),
      );
    tx.cashSession.findFirst.mockResolvedValueOnce({
      id: 'cash_session_1',
      status: CashSessionStatus.OPEN,
    });
    tx.customer.upsert.mockResolvedValueOnce({ id: 'customer_1' });
    tx.fiscalProfile.findUnique.mockResolvedValueOnce({
      id: 'fiscal_profile_1',
      invoiceResolutionPrefix: 'SETP',
    });
    tx.invoice.create.mockResolvedValueOnce({
      id: 'invoice_1',
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      saleId: 'sale_1',
      status: FiscalInvoiceStatus.DRAFT,
    });

    const inventoryConsumption = inventoryConsumptionMock();
    const repository = new TableAccountsRepository(
      prisma as unknown as PrismaService,
      inventoryConsumption as unknown as InventoryConsumptionService,
    );

    const result = await repository.chargeAccount({
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      saleId: 'sale_1',
      method: PaymentMethod.CARD,
      amount: 10800,
      reference: 'APPROVAL-456',
      factusPaymentMethodCode: '48',
      requiresInvoice: true,
      customer: {
        documentType: CustomerDocumentType.CC,
        documentNumber: '123456789',
        dv: null,
        name: 'Cliente Demo',
        email: null,
        phone: null,
        address: null,
        municipality: null,
        municipalityCode: null,
        countryCode: 'CO',
        taxResponsibility: null,
      },
      chargedById: 'user_1',
    });

    expect(result.status).toBe('CHARGED');
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          factusPaymentMethodCode: '48',
        }),
      }),
    );
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalAmount: 10000,
          taxAmount: 800,
          totalAmount: 10800,
          lines: {
            create: [
              expect.objectContaining({
                codeReference: 'MENU-INC',
                description: 'Menu restaurante',
                unitPriceAmount: 10000,
                grossUnitPriceAmount: 10800,
                factusPrice: '10000.00',
                taxableAmount: 10000,
                taxAmount: 800,
                totalAmount: 10800,
                factusTaxCode: '04',
                taxRateBasisPoints: 800,
                isTaxExcluded: false,
              }),
            ],
          },
          taxes: {
            create: [
              expect.objectContaining({
                taxName: 'INC',
                factusTaxCode: '04',
                taxableAmount: 10000,
                taxAmount: 800,
              }),
            ],
          },
        }),
      }),
    );
  });
});
