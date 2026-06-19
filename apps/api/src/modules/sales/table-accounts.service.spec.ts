import {
  CustomerDocumentType,
  PaymentMethod,
  SaleStatus,
  type Product,
} from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import { TableAccountsRepository, type TableAccountSaleRecord } from './table-accounts.repository';
import { TableAccountsService } from './table-accounts.service';
import type { OperationsActor } from '../operations/operations.types';

const now = new Date('2026-01-01T00:00:00.000Z');

const actor: OperationsActor = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  actorUserId: 'user_1',
  requestId: 'req_1',
};

function account(overrides: Partial<TableAccountSaleRecord> = {}): TableAccountSaleRecord {
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
        createdAt: now,
      },
    ],
    payments: [],
    ...overrides,
  } as TableAccountSaleRecord;
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product_1',
    tenantId: 'tenant_1',
    categoryId: 'category_1',
    sku: 'FUERTE-BANDEJA-PAISA',
    name: 'Bandeja paisa',
    description: null,
    priceAmount: 32000,
    currency: 'COP',
    isActive: true,
    isSellable: true,
    isInventoried: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    ...overrides,
  };
}

describe('TableAccountsService', () => {
  let repo: {
    findOpenByTable: jest.Mock;
    tableExists: jest.Mock;
    openAccount: jest.Mock;
    findLatestInvoiceBySaleId: jest.Mock;
    findById: jest.Mock;
    findSellableProduct: jest.Mock;
    addItem: jest.Mock;
    updateItemQuantity: jest.Mock;
    removeItem: jest.Mock;
    chargeAccount: jest.Mock;
  };
  let audit: { tryRecord: jest.Mock };
  let service: TableAccountsService;

  beforeEach(() => {
    repo = {
      findOpenByTable: jest.fn(),
      tableExists: jest.fn(),
      openAccount: jest.fn(),
      findLatestInvoiceBySaleId: jest.fn(),
      findById: jest.fn(),
      findSellableProduct: jest.fn(),
      addItem: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      chargeAccount: jest.fn(),
    };
    audit = { tryRecord: jest.fn() };
    service = new TableAccountsService(
      repo as unknown as TableAccountsRepository,
      audit as unknown as AuditService,
    );
  });

  it('opens a table account through the repository and audits it', async () => {
    repo.openAccount.mockResolvedValue(account({ items: [], subtotal: 0, grandTotal: 0 }));

    const result = await service.openAccount(actor, 'table_1', {
      waiterName: ' Maria Restrepo ',
      guestCount: 2,
    });

    expect(repo.openAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        tableId: 'table_1',
        waiterName: 'Maria Restrepo',
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TABLE_ACCOUNT_OPENED' }),
    );
    expect(result.tableNumber).toBe('01');
  });

  it('adds a sellable product and returns recalculated totals', async () => {
    repo.findById.mockResolvedValue(account({ items: [], subtotal: 0, grandTotal: 0 }));
    repo.findSellableProduct.mockResolvedValue(product());
    repo.addItem.mockResolvedValue(account());

    const result = await service.addItem(actor, 'sale_1', {
      productId: 'product_1',
      quantity: 1,
    });

    expect(repo.findSellableProduct).toHaveBeenCalledWith('tenant_1', 'product_1');
    expect(repo.addItem).toHaveBeenCalledWith(
      'tenant_1',
      'branch_1',
      'sale_1',
      expect.objectContaining({ unitPriceAmount: 32000 }),
    );
    expect(result.grandTotal).toBe(32000);
  });

  it('requires fiscal customer data when electronic invoice is requested', async () => {
    repo.findById.mockResolvedValue(account());

    await expect(
      service.chargeAccount(actor, 'sale_1', {
        method: PaymentMethod.CARD,
        amount: 32000,
        requiresInvoice: true,
      }),
    ).rejects.toBeInstanceOf(ApplicationException);

    expect(repo.chargeAccount).not.toHaveBeenCalled();
  });

  it('charges a complete account and returns a receipt', async () => {
    repo.findById.mockResolvedValue(account());
    repo.chargeAccount.mockResolvedValue({
      status: 'CHARGED',
      account: account({
        status: SaleStatus.CLOSED,
        paidTotal: 32000,
        closedById: 'user_1',
        closedAt: now,
        payments: [
          {
            id: 'payment_1',
            tenantId: 'tenant_1',
            saleId: 'sale_1',
            method: PaymentMethod.CARD,
            amount: 32000,
            reference: null,
            createdById: 'user_1',
            createdAt: now,
          },
        ],
      }),
      invoice: null,
    });

    const result = await service.chargeAccount(actor, 'sale_1', {
      method: PaymentMethod.CARD,
      amount: 32000,
      requiresInvoice: false,
    });

    expect(repo.chargeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        method: PaymentMethod.CARD,
        amount: 32000,
        requiresInvoice: false,
      }),
    );
    expect(result.total).toBe(32000);
    expect(result.balanceDue).toBe(0);
  });

  it('passes fiscal customer data to create invoice drafts', async () => {
    repo.findById.mockResolvedValue(account());
    repo.chargeAccount.mockResolvedValue({
      status: 'CHARGED',
      account: account({
        status: SaleStatus.CLOSED,
        paidTotal: 32000,
        requiresInvoice: true,
        closedAt: now,
      }),
      invoice: {
        id: 'invoice_1',
        tenantId: 'tenant_1',
        branchId: 'branch_1',
        fiscalProfileId: null,
        saleId: 'sale_1',
        customerId: 'customer_1',
        documentType: 'INVOICE',
        prefix: null,
        number: null,
        status: 'DRAFT',
        customerDocumentType: 'CC',
        customerDocumentNumber: '123',
        customerName: 'Cliente Demo',
        customerEmail: null,
        customerPhone: null,
        customerAddress: null,
        customerMunicipality: null,
        subtotalAmount: 32000,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 32000,
        currency: 'COP',
        providerType: null,
        providerName: null,
        externalReference: null,
        cufe: null,
        cude: null,
        qrUrl: null,
        xmlUrl: null,
        pdfUrl: null,
        providerPayload: null,
        rejectionPayload: null,
        sentAt: null,
        acceptedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdById: 'user_1',
        updatedById: null,
      },
    });

    await service.chargeAccount(actor, 'sale_1', {
      method: PaymentMethod.CARD,
      amount: 32000,
      requiresInvoice: true,
      customer: {
        documentType: CustomerDocumentType.CC,
        documentNumber: '123',
        name: 'Cliente Demo',
      },
    });

    expect(repo.chargeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({
          documentType: CustomerDocumentType.CC,
          documentNumber: '123',
          name: 'Cliente Demo',
        }),
      }),
    );
    expect(audit.tryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVOICE_DRAFT_CREATED' }),
    );
  });
});
