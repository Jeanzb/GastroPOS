import {
  CustomerDocumentType,
  PaymentMethod,
  SaleStatus,
  type Product,
} from '../../../generated/prisma';
import { ApplicationException } from '../../common/errors/application.exception';
import type { AuditService } from '../audit/audit.service';
import type { FiscalService } from '../fiscal/fiscal.service';
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
    fiscalDocumentId: null,
    status: SaleStatus.DRAFT,
    fiscalStatus: null,
    currency: 'COP',
    guestCount: 2,
    waiterName: 'Maria Restrepo',
    customerName: null,
    requiresInvoice: false,
    subtotal: 32000,
    discountTotal: 0,
    taxTotal: 0,
    tipAmount: 0,
    roundingAmount: 0,
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
    taxCategoryId: null,
    sku: 'FUERTE-BANDEJA-PAISA',
    name: 'Bandeja paisa',
    description: null,
    priceAmount: 32000,
    currency: 'COP',
    fiscalName: null,
    fiscalCodeReference: null,
    unitMeasureCode: '94',
    standardCode: '999',
    isExcluded: false,
    incApplies: false,
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
  let fiscal: { tryScheduleInvoiceIssue: jest.Mock };
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
    fiscal = { tryScheduleInvoiceIssue: jest.fn() };
    service = new TableAccountsService(
      repo as unknown as TableAccountsRepository,
      audit as unknown as AuditService,
      fiscal as unknown as FiscalService,
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

  it('forces the authenticated waiter name when a waiter opens a table account', async () => {
    repo.openAccount.mockResolvedValue(
      account({ items: [], subtotal: 0, grandTotal: 0, waiterName: 'Diego Gomez' }),
    );

    await service.openAccount(
      { ...actor, role: 'WAITER', fullName: 'Diego Gomez', authScope: 'POS' },
      'table_1',
      {
        waiterName: 'Maria Restrepo',
        guestCount: 3,
        customerName: 'Familia Gomez',
      },
    );

    expect(repo.openAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        waiterName: 'Diego Gomez',
        guestCount: 3,
        customerName: 'Familia Gomez',
      }),
    );
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
      expect.objectContaining({
        unitPriceAmount: 32000,
        factusTaxCode: '01',
        taxRateBasisPoints: 0,
      }),
    );
    expect(result.grandTotal).toBe(32000);
  });

  it('snapshots fiscal product tax profile when adding an item', async () => {
    repo.findById.mockResolvedValue(account({ items: [], subtotal: 0, grandTotal: 0 }));
    repo.findSellableProduct.mockResolvedValue(
      product({
        incApplies: true,
        fiscalName: 'Menu ejecutivo',
        fiscalCodeReference: 'MENU-001',
      }),
    );
    repo.addItem.mockResolvedValue(account());

    await service.addItem(actor, 'sale_1', {
      productId: 'product_1',
      quantity: 1,
    });

    expect(repo.addItem).toHaveBeenCalledWith(
      'tenant_1',
      'branch_1',
      'sale_1',
      expect.objectContaining({
        fiscalName: 'Menu ejecutivo',
        fiscalCodeReference: 'MENU-001',
        unitMeasureCode: '94',
        standardCode: '999',
        factusTaxCode: '04',
        taxRateBasisPoints: 800,
        isTaxExcluded: false,
      }),
    );
  });

  it('uses final consumer data when electronic invoice is requested without customer', async () => {
    repo.findById.mockResolvedValue(account());
    repo.chargeAccount.mockResolvedValue({
      status: 'CHARGED',
      account: account({
        status: SaleStatus.CLOSED,
        paidTotal: 32000,
        requiresInvoice: true,
        closedAt: now,
      }),
      invoice: null,
    });

    await service.chargeAccount(actor, 'sale_1', {
      method: PaymentMethod.CARD,
      amount: 32000,
      requiresInvoice: true,
    });

    expect(repo.chargeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({
          documentType: CustomerDocumentType.OTHER,
          documentNumber: '222222222222',
          name: 'Consumidor Final',
        }),
      }),
    );
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
            factusPaymentMethodCode: null,
            paymentForm: 1,
            dueDate: null,
            acquirerReference: null,
            reconciledAt: null,
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
      factusPaymentMethodCode: '48',
      requiresInvoice: false,
    });

    expect(repo.chargeAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        method: PaymentMethod.CARD,
        amount: 32000,
        factusPaymentMethodCode: '48',
        requiresInvoice: false,
      }),
    );
    expect(result.total).toBe(32000);
    expect(result.balanceDue).toBe(0);
  });

  it('blocks card payments when there is no open cash session', async () => {
    repo.findById.mockResolvedValue(account());
    repo.chargeAccount.mockResolvedValue({ status: 'NO_ACTIVE_CASH_SESSION' });

    await expect(
      service.chargeAccount(actor, 'sale_1', {
        method: PaymentMethod.CARD,
        amount: 32000,
        requiresInvoice: false,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Debe abrir el turno de caja (base inicial) para poder registrar ventas',
      }),
    });
  });

  it('blocks transfer payments when there is no open cash session', async () => {
    repo.findById.mockResolvedValue(account());
    repo.chargeAccount.mockResolvedValue({ status: 'NO_ACTIVE_CASH_SESSION' });

    await expect(
      service.chargeAccount(actor, 'sale_1', {
        method: PaymentMethod.TRANSFER,
        amount: 32000,
        requiresInvoice: false,
      }),
    ).rejects.toBeInstanceOf(ApplicationException);
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
        referenceCode: null,
        numberingRangeId: null,
        factusNumber: null,
        factusId: null,
        cufe: null,
        cude: null,
        qrUrl: null,
        publicUrl: null,
        xmlUrl: null,
        pdfUrl: null,
        pdfBase64: null,
        pdfFileName: null,
        xmlBase64: null,
        xmlFileName: null,
        attachedDocumentXmlBase64: null,
        attachedDocumentXmlFileName: null,
        providerPayload: null,
        rejectionPayload: null,
        isValidated: false,
        lastErrorCode: null,
        retryCount: 0,
        lastAttemptAt: null,
        nextRetryAt: null,
        sentAt: null,
        acceptedAt: null,
        validatedAt: null,
        rejectedAt: null,
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
        email: 'cliente@example.com',
        phone: '3001234567',
        address: 'Calle 10 # 1-2',
        municipalityCode: '11001',
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
    expect(fiscal.tryScheduleInvoiceIssue).toHaveBeenCalledWith(actor, 'invoice_1');
  });
});
