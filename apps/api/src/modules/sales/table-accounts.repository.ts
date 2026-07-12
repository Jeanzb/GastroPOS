import { Injectable } from '@nestjs/common';
import {
  CashMovementType,
  CashSessionStatus,
  CustomerDocumentType,
  DiningTableStatus,
  FiscalInvoiceEventType,
  FiscalInvoiceStatus,
  FiscalProviderType,
  PaymentMethod,
  SaleStatus,
  type Invoice,
  type Prisma,
  type Product,
  type TaxCategory,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { InventoryConsumptionService } from '../inventory/inventory-consumption.service';

const TABLE_ACCOUNT_INCLUDE = {
  diningTable: {
    select: { id: true, number: true },
  },
  items: {
    orderBy: { createdAt: 'asc' },
  },
  payments: {
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.SaleInclude;

export type TableAccountSaleRecord = Prisma.SaleGetPayload<{
  include: typeof TABLE_ACCOUNT_INCLUDE;
}>;

export type ProductFiscalRecord = Product & { taxCategory: TaxCategory | null };

export interface OpenAccountData {
  tenantId: string;
  branchId: string;
  tableId: string;
  waiterName: string | null;
  guestCount: number | null;
  customerName: string | null;
  createdById: string;
}

export interface ProductSnapshotData {
  productId: string;
  name: string;
  unitPriceAmount: number;
  quantity: number;
  fiscalName: string | null;
  fiscalCodeReference: string | null;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
}

export interface FiscalCustomerData {
  documentType: CustomerDocumentType;
  documentNumber: string;
  dv: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipality: string | null;
  municipalityCode: string | null;
  countryCode: string;
  taxResponsibility: string | null;
}

export interface ChargeAccountData {
  tenantId: string;
  branchId: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  factusPaymentMethodCode: string | null;
  payments?: Array<{
    method: PaymentMethod;
    amount: number;
    reference: string | null;
    factusPaymentMethodCode: string | null;
    paymentForm: 1 | 2;
    dueDate: Date | null;
  }>;
  requiresInvoice: boolean;
  customer: FiscalCustomerData | null;
  chargedById: string;
}

export type ChargeAccountResult =
  | { status: 'CHARGED'; account: TableAccountSaleRecord; invoice: Invoice | null }
  | { status: 'NO_ACTIVE_CASH_SESSION' }
  | { status: 'ACCOUNT_NOT_FOUND' }
  | { status: 'INSUFFICIENT_STOCK'; itemName: string }
  | { status: 'INVENTORY_NOT_CONFIGURED'; itemName: string };

@Injectable()
export class TableAccountsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryConsumption: InventoryConsumptionService,
  ) {}

  async branchExists(tenantId: string, branchId: string): Promise<boolean> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return Boolean(branch);
  }

  async tableExists(tenantId: string, branchId: string, tableId: string): Promise<boolean> {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, tenantId, branchId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(table);
  }

  findOpenByTable(
    tenantId: string,
    branchId: string,
    tableId: string,
  ): Promise<TableAccountSaleRecord | null> {
    return this.prisma.sale.findFirst({
      where: {
        tenantId,
        branchId,
        diningTableId: tableId,
        status: SaleStatus.DRAFT,
      },
      include: TABLE_ACCOUNT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(
    tenantId: string,
    branchId: string,
    saleId: string,
  ): Promise<TableAccountSaleRecord | null> {
    return this.prisma.sale.findFirst({
      where: { id: saleId, tenantId, branchId },
      include: TABLE_ACCOUNT_INCLUDE,
    });
  }

  findLatestInvoiceBySaleId(tenantId: string, saleId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({
      where: { tenantId, saleId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findSellableProduct(tenantId: string, productId: string): Promise<ProductFiscalRecord | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        deletedAt: null,
        isActive: true,
        isSellable: true,
      },
      include: { taxCategory: true },
    });
  }

  async openAccount(data: OpenAccountData): Promise<TableAccountSaleRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.diningTable.findFirst({
        where: {
          id: data.tableId,
          tenantId: data.tenantId,
          branchId: data.branchId,
          deletedAt: null,
        },
      });
      if (!table) {
        return null;
      }

      const existing = await this.findOpenByTableInTx(
        tx,
        data.tenantId,
        data.branchId,
        data.tableId,
      );
      if (existing) {
        return existing;
      }

      const openedAt = table.openedAt ?? new Date();
      const sale = await tx.sale.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          diningTableId: table.id,
          status: SaleStatus.DRAFT,
          currency: 'COP',
          waiterName: data.waiterName,
          guestCount: data.guestCount,
          customerName: data.customerName,
          createdById: data.createdById,
        },
      });

      await tx.diningTable.updateMany({
        where: {
          id: table.id,
          tenantId: data.tenantId,
          branchId: data.branchId,
          deletedAt: null,
        },
        data: {
          status: DiningTableStatus.OCCUPIED,
          waiterName: data.waiterName,
          openedAt,
          reservationName: null,
          reservationTime: null,
          updatedById: data.createdById,
        },
      });

      return this.findByIdInTx(tx, data.tenantId, data.branchId, sale.id);
    });
  }

  async addItem(
    tenantId: string,
    branchId: string,
    saleId: string,
    item: ProductSnapshotData,
  ): Promise<TableAccountSaleRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.saleItem.findFirst({
        where: { tenantId, saleId, productId: item.productId },
      });

      if (existing) {
        const nextQuantity = existing.quantity + item.quantity;
        await tx.saleItem.update({
          where: { id: existing.id },
          data: {
            quantity: nextQuantity,
            lineTotal: nextQuantity * existing.unitPriceSnapshot,
          },
        });
      } else {
        await tx.saleItem.create({
          data: {
            tenantId,
            saleId,
            productId: item.productId,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.unitPriceAmount,
            quantity: item.quantity,
            lineTotal: item.unitPriceAmount * item.quantity,
            fiscalName: item.fiscalName,
            fiscalCodeReference: item.fiscalCodeReference,
            unitMeasureCode: item.unitMeasureCode,
            standardCode: item.standardCode,
            factusTaxCode: item.factusTaxCode,
            taxRateBasisPoints: item.taxRateBasisPoints,
            isTaxExcluded: item.isTaxExcluded,
          },
        });
      }

      return this.recalculateAndFind(tx, tenantId, branchId, saleId);
    });
  }

  async updateItemQuantity(
    tenantId: string,
    branchId: string,
    saleId: string,
    itemId: string,
    quantity: number,
  ): Promise<TableAccountSaleRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.saleItem.findFirst({
        where: { id: itemId, tenantId, saleId },
      });
      if (!item) {
        return null;
      }

      if (quantity === 0) {
        await tx.saleItem.delete({ where: { id: item.id } });
      } else {
        await tx.saleItem.update({
          where: { id: item.id },
          data: {
            quantity,
            lineTotal: quantity * item.unitPriceSnapshot,
          },
        });
      }

      return this.recalculateAndFind(tx, tenantId, branchId, saleId);
    });
  }

  async removeItem(
    tenantId: string,
    branchId: string,
    saleId: string,
    itemId: string,
  ): Promise<TableAccountSaleRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.saleItem.findFirst({
        where: { id: itemId, tenantId, saleId },
      });
      if (!item) {
        return null;
      }

      await tx.saleItem.delete({ where: { id: item.id } });
      return this.recalculateAndFind(tx, tenantId, branchId, saleId);
    });
  }

  async chargeAccount(data: ChargeAccountData): Promise<ChargeAccountResult> {
    return this.prisma.$transaction(async (tx) => {
      const sale = await this.findByIdInTx(tx, data.tenantId, data.branchId, data.saleId);
      if (!sale || sale.status !== SaleStatus.DRAFT) {
        return { status: 'ACCOUNT_NOT_FOUND' };
      }

      const cashSession = await tx.cashSession.findFirst({
        where: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          status: CashSessionStatus.OPEN,
        },
      });

      if (!cashSession) {
        return { status: 'NO_ACTIVE_CASH_SESSION' };
      }

      const stockResult = await this.inventoryConsumption.consumeSaleItems(tx, {
        tenantId: data.tenantId,
        branchId: data.branchId,
        saleId: sale.id,
        items: sale.items,
        actorUserId: data.chargedById,
      });
      if (stockResult.status !== 'OK') {
        return stockResult;
      }

      const mixedPayments = data.payments ?? [];
      const hasMixedPayments = mixedPayments.length > 0;
      const payments: NonNullable<ChargeAccountData['payments']> = hasMixedPayments
        ? mixedPayments
        : [
            {
              method: data.method,
              amount: data.amount,
              reference: data.reference,
              factusPaymentMethodCode: data.factusPaymentMethodCode,
              paymentForm: 1 as const,
              dueDate: null,
            },
          ];

      if (hasMixedPayments) {
        await tx.payment.createMany({
          data: payments.map((payment) => ({
            tenantId: data.tenantId,
            saleId: sale.id,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
            factusPaymentMethodCode: payment.factusPaymentMethodCode,
            paymentForm: payment.paymentForm,
            dueDate: payment.dueDate,
            createdById: data.chargedById,
          })),
        });
      } else {
        const payment = payments[0]!;
        await tx.payment.create({
          data: {
            tenantId: data.tenantId,
            saleId: sale.id,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
            factusPaymentMethodCode: payment.factusPaymentMethodCode,
            paymentForm: payment.paymentForm,
            dueDate: payment.dueDate,
            createdById: data.chargedById,
          },
        });
      }

      const cashPayments = payments.filter((payment) => payment.method === PaymentMethod.CASH);
      if (cashPayments.length > 0 && hasMixedPayments) {
        await tx.cashMovement.createMany({
          data: cashPayments.map((payment) => ({
            tenantId: data.tenantId,
            branchId: data.branchId,
            cashSessionId: cashSession.id,
            type: CashMovementType.SALE_PAYMENT,
            amount: payment.amount,
            reference: payment.reference ?? sale.id,
            notes: `Sale payment ${sale.id}`,
            createdById: data.chargedById,
          })),
        });
      } else if (cashPayments.length > 0) {
        const payment = cashPayments[0]!;
        await tx.cashMovement.create({
          data: {
            tenantId: data.tenantId,
            branchId: data.branchId,
            cashSessionId: cashSession.id,
            type: CashMovementType.SALE_PAYMENT,
            amount: payment.amount,
            reference: payment.reference ?? sale.id,
            notes: `Sale payment ${sale.id}`,
            createdById: data.chargedById,
          },
        });
      }

      let customerId: string | null = null;
      let invoice: Invoice | null = null;
      if (data.requiresInvoice && data.customer) {
        const customer = await tx.customer.upsert({
          where: {
            tenantId_documentType_documentNumber: {
              tenantId: data.tenantId,
              documentType: data.customer.documentType,
              documentNumber: data.customer.documentNumber,
            },
          },
          update: {
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone,
            address: data.customer.address,
            municipality: data.customer.municipality,
            municipalityCode: data.customer.municipalityCode,
            countryCode: data.customer.countryCode,
            dv: data.customer.dv,
            taxResponsibility: data.customer.taxResponsibility,
            factusIdentificationCode: mapFactusDocumentCode(data.customer.documentType),
            legalOrganizationCode:
              data.customer.documentType === CustomerDocumentType.NIT ? '1' : '2',
            company:
              data.customer.documentType === CustomerDocumentType.NIT ? data.customer.name : null,
            names:
              data.customer.documentType === CustomerDocumentType.NIT ? null : data.customer.name,
            tributeCode: 'ZZ',
            isActive: true,
            deletedAt: null,
            updatedById: data.chargedById,
          },
          create: {
            tenantId: data.tenantId,
            documentType: data.customer.documentType,
            documentNumber: data.customer.documentNumber,
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone,
            address: data.customer.address,
            municipality: data.customer.municipality,
            municipalityCode: data.customer.municipalityCode,
            countryCode: data.customer.countryCode,
            dv: data.customer.dv,
            taxResponsibility: data.customer.taxResponsibility,
            factusIdentificationCode: mapFactusDocumentCode(data.customer.documentType),
            legalOrganizationCode:
              data.customer.documentType === CustomerDocumentType.NIT ? '1' : '2',
            company:
              data.customer.documentType === CustomerDocumentType.NIT ? data.customer.name : null,
            names:
              data.customer.documentType === CustomerDocumentType.NIT ? null : data.customer.name,
            tributeCode: 'ZZ',
            createdById: data.chargedById,
          },
        });
        customerId = customer.id;

        const fiscalProfile = await tx.fiscalProfile.findUnique({
          where: { tenantId: data.tenantId },
          select: {
            id: true,
            invoiceResolutionPrefix: true,
          },
        });

        const fiscalSnapshot = buildFiscalInvoiceSnapshot(sale.items, sale.discountTotal);
        invoice = await tx.invoice.create({
          data: {
            tenantId: data.tenantId,
            branchId: data.branchId,
            fiscalProfileId: fiscalProfile?.id ?? null,
            saleId: sale.id,
            customerId,
            documentType: 'INVOICE',
            prefix: fiscalProfile?.invoiceResolutionPrefix ?? null,
            status: FiscalInvoiceStatus.DRAFT,
            customerDocumentType: data.customer.documentType,
            customerDocumentNumber: data.customer.documentNumber,
            customerDv: data.customer.dv,
            customerIdentificationCode: mapFactusDocumentCode(data.customer.documentType),
            customerLegalOrganizationCode:
              data.customer.documentType === CustomerDocumentType.NIT ? '1' : '2',
            customerCompany:
              data.customer.documentType === CustomerDocumentType.NIT ? data.customer.name : null,
            customerNames:
              data.customer.documentType === CustomerDocumentType.NIT ? null : data.customer.name,
            customerName: data.customer.name,
            customerEmail: data.customer.email,
            customerPhone: data.customer.phone,
            customerAddress: data.customer.address,
            customerCountryCode: data.customer.countryCode,
            customerMunicipality: data.customer.municipality,
            customerMunicipalityCode: data.customer.municipalityCode,
            customerTributeCode: 'ZZ',
            subtotalAmount: fiscalSnapshot.subtotalAmount,
            taxAmount: fiscalSnapshot.taxAmount,
            discountAmount: fiscalSnapshot.discountAmount,
            totalAmount: sale.grandTotal,
            currency: sale.currency,
            providerType: FiscalProviderType.API_PROVIDER,
            providerName: 'Factus',
            createdById: data.chargedById,
            lines: {
              create: fiscalSnapshot.lines.map((item) => ({
                tenantId: data.tenantId,
                productId: item.productId,
                codeReference: item.codeReference,
                description: item.description,
                quantity: item.quantity,
                unitPriceAmount: item.unitPriceAmount,
                grossUnitPriceAmount: item.grossUnitPriceAmount,
                factusPrice: item.factusPrice,
                discountAmount: item.discountAmount,
                factusDiscountAmount: item.factusDiscountAmount,
                taxableAmount: item.taxableAmount,
                subtotalAmount: item.subtotalAmount,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount,
                currency: sale.currency,
                unitMeasureCode: item.unitMeasureCode,
                standardCode: item.standardCode,
                factusTaxCode: item.factusTaxCode,
                taxRateBasisPoints: item.taxRateBasisPoints,
                isTaxExcluded: item.isTaxExcluded,
              })),
            },
            taxes: fiscalSnapshot.taxes.length
              ? {
                  create: fiscalSnapshot.taxes.map((tax) => ({
                    tenantId: data.tenantId,
                    taxName: tax.taxName,
                    factusTaxCode: tax.factusTaxCode,
                    taxRateBasisPoints: tax.taxRateBasisPoints,
                    taxableAmount: tax.taxableAmount,
                    taxAmount: tax.taxAmount,
                    isTaxExcluded: tax.isTaxExcluded,
                  })),
                }
              : undefined,
            events: {
              create: {
                tenantId: data.tenantId,
                type: FiscalInvoiceEventType.CREATED,
                status: FiscalInvoiceStatus.DRAFT,
                message: 'Electronic invoice draft created from table account.',
                createdById: data.chargedById,
              },
            },
          },
        });
      }

      await tx.sale.updateMany({
        where: {
          id: sale.id,
          tenantId: data.tenantId,
          branchId: data.branchId,
          status: SaleStatus.DRAFT,
        },
        data: {
          status: SaleStatus.CLOSED,
          fiscalDocumentId: invoice?.id ?? null,
          fiscalStatus: invoice ? FiscalInvoiceStatus.DRAFT : null,
          cashSessionId: cashSession.id,
          customerId,
          customerName: data.customer?.name ?? sale.customerName,
          requiresInvoice: data.requiresInvoice,
          paidTotal: sale.paidTotal + data.amount,
          closedById: data.chargedById,
          closedAt: new Date(),
        },
      });

      if (sale.diningTableId) {
        await tx.diningTable.updateMany({
          where: {
            id: sale.diningTableId,
            tenantId: data.tenantId,
            branchId: data.branchId,
            deletedAt: null,
          },
          data: {
            status: DiningTableStatus.FREE,
            waiterName: null,
            openedAt: null,
            updatedById: data.chargedById,
          },
        });
      }

      const account = await this.findByIdInTx(tx, data.tenantId, data.branchId, sale.id);
      if (!account) {
        return { status: 'ACCOUNT_NOT_FOUND' };
      }

      return { status: 'CHARGED', account, invoice };
    });
  }

  private async recalculateAndFind(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    saleId: string,
  ): Promise<TableAccountSaleRecord | null> {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId, branchId },
      select: { id: true, discountTotal: true, taxTotal: true },
    });
    if (!sale) {
      return null;
    }

    const aggregate = await tx.saleItem.aggregate({
      where: { tenantId, saleId },
      _sum: { lineTotal: true },
    });
    const subtotal = aggregate._sum.lineTotal ?? 0;
    const grandTotal = Math.max(0, subtotal - sale.discountTotal + sale.taxTotal);

    await tx.sale.updateMany({
      where: { id: saleId, tenantId, branchId },
      data: { subtotal, grandTotal },
    });

    return this.findByIdInTx(tx, tenantId, branchId, saleId);
  }

  private findOpenByTableInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    tableId: string,
  ): Promise<TableAccountSaleRecord | null> {
    return tx.sale.findFirst({
      where: {
        tenantId,
        branchId,
        diningTableId: tableId,
        status: SaleStatus.DRAFT,
      },
      include: TABLE_ACCOUNT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  private findByIdInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    branchId: string,
    saleId: string,
  ): Promise<TableAccountSaleRecord | null> {
    return tx.sale.findFirst({
      where: { id: saleId, tenantId, branchId },
      include: TABLE_ACCOUNT_INCLUDE,
    });
  }
}

function mapFactusDocumentCode(type: CustomerDocumentType): string {
  const map: Record<CustomerDocumentType, string> = {
    [CustomerDocumentType.CC]: '13',
    [CustomerDocumentType.NIT]: '31',
    [CustomerDocumentType.CE]: '22',
    [CustomerDocumentType.PP]: '41',
    [CustomerDocumentType.TI]: '12',
    [CustomerDocumentType.NUIP]: '91',
    [CustomerDocumentType.OTHER]: '13',
  };
  return map[type];
}

type FiscalSaleItem = TableAccountSaleRecord['items'][number];

interface FiscalInvoiceLineSnapshot {
  productId: string | null;
  codeReference: string;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  grossUnitPriceAmount: number;
  factusPrice: string;
  discountAmount: number;
  factusDiscountAmount: string | null;
  taxableAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
}

interface FiscalInvoiceTaxSnapshot {
  taxName: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  taxableAmount: number;
  taxAmount: number;
  isTaxExcluded: boolean;
}

function buildFiscalInvoiceSnapshot(
  items: FiscalSaleItem[],
  discountTotal: number,
): {
  lines: FiscalInvoiceLineSnapshot[];
  taxes: FiscalInvoiceTaxSnapshot[];
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
} {
  const grossTotal = items.reduce((total, item) => total + item.lineTotal, 0);
  if (discountTotal < 0 || discountTotal > grossTotal) {
    throw new Error('INVALID_FISCAL_DISCOUNT_TOTAL');
  }

  const discounts = allocateAmount(
    discountTotal,
    items.map((item) => item.lineTotal),
  );
  const lines = items.map((item, index) => buildFiscalLineSnapshot(item, discounts[index] ?? 0));
  const taxesByKey = new Map<string, FiscalInvoiceTaxSnapshot>();

  for (const line of lines) {
    const key = `${line.factusTaxCode}:${line.taxRateBasisPoints}:${line.isTaxExcluded}`;
    const current = taxesByKey.get(key) ?? {
      taxName: taxName(line.factusTaxCode, line.isTaxExcluded),
      factusTaxCode: line.factusTaxCode,
      taxRateBasisPoints: line.taxRateBasisPoints,
      taxableAmount: 0,
      taxAmount: 0,
      isTaxExcluded: line.isTaxExcluded,
    };
    current.taxableAmount += line.taxableAmount;
    current.taxAmount += line.taxAmount;
    taxesByKey.set(key, current);
  }

  return {
    lines,
    taxes: [...taxesByKey.values()].filter((tax) => tax.taxAmount > 0 || tax.isTaxExcluded),
    subtotalAmount: lines.reduce((total, line) => total + line.taxableAmount, 0),
    taxAmount: lines.reduce((total, line) => total + line.taxAmount, 0),
    discountAmount: lines.reduce((total, line) => total + line.discountAmount, 0),
  };
}

function buildFiscalLineSnapshot(
  item: FiscalSaleItem,
  grossDiscountAmount: number,
): FiscalInvoiceLineSnapshot {
  const rateBasisPoints = item.isTaxExcluded ? 0 : Math.max(0, item.taxRateBasisPoints);
  const unitNetCents = netCentsFromTaxIncludedPesos(item.unitPriceSnapshot, rateBasisPoints);
  const grossLineCents = item.lineTotal * 100;
  const grossDiscountCents = grossDiscountAmount * 100;
  const netDiscountCents = netCentsFromTaxIncludedCents(grossDiscountCents, rateBasisPoints);
  const taxableCents = Math.max(0, unitNetCents * item.quantity - netDiscountCents);
  const totalCents = Math.max(0, grossLineCents - grossDiscountCents);
  const taxCents = item.isTaxExcluded ? 0 : Math.max(0, totalCents - taxableCents);

  return {
    productId: item.productId,
    codeReference: item.fiscalCodeReference ?? item.productId ?? item.id,
    description: item.fiscalName ?? item.nameSnapshot,
    quantity: item.quantity,
    unitPriceAmount: centsToRoundedPesos(unitNetCents),
    grossUnitPriceAmount: item.unitPriceSnapshot,
    factusPrice: centsToAmount(unitNetCents),
    discountAmount: centsToRoundedPesos(netDiscountCents),
    factusDiscountAmount: netDiscountCents > 0 ? centsToAmount(netDiscountCents) : null,
    taxableAmount: centsToRoundedPesos(taxableCents),
    subtotalAmount: centsToRoundedPesos(taxableCents),
    taxAmount: centsToRoundedPesos(taxCents),
    totalAmount: centsToRoundedPesos(totalCents),
    unitMeasureCode: item.unitMeasureCode,
    standardCode: item.standardCode,
    factusTaxCode: item.factusTaxCode,
    taxRateBasisPoints: rateBasisPoints,
    isTaxExcluded: item.isTaxExcluded,
  };
}

function allocateAmount(amount: number, weights: number[]): number[] {
  if (amount === 0) {
    return weights.map(() => 0);
  }
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  let assigned = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return amount - assigned;
    }
    const share = Math.floor((amount * weight) / totalWeight);
    assigned += share;
    return share;
  });
}

function netCentsFromTaxIncludedPesos(amount: number, rateBasisPoints: number): number {
  return netCentsFromTaxIncludedCents(amount * 100, rateBasisPoints);
}

function netCentsFromTaxIncludedCents(amountCents: number, rateBasisPoints: number): number {
  if (rateBasisPoints <= 0) {
    return amountCents;
  }
  return Math.round((amountCents * 10_000) / (10_000 + rateBasisPoints));
}

function centsToRoundedPesos(value: number): number {
  return Math.round(value / 100);
}

function centsToAmount(value: number): string {
  return (value / 100).toFixed(2);
}

function taxName(factusTaxCode: string, isExcluded: boolean): string {
  if (isExcluded) {
    return 'Excluido';
  }
  if (factusTaxCode === '04') {
    return 'INC';
  }
  if (factusTaxCode === '35') {
    return 'Impuesto saludable';
  }
  return 'IVA';
}
