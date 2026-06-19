import { Injectable } from '@nestjs/common';
import {
  CashMovementType,
  CashSessionStatus,
  DiningTableStatus,
  FiscalInvoiceEventType,
  FiscalInvoiceStatus,
  PaymentMethod,
  SaleStatus,
  StockMovementType,
  type CustomerDocumentType,
  type Invoice,
  type Prisma,
  type Product,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

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
}

export interface FiscalCustomerData {
  documentType: CustomerDocumentType;
  documentNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipality: string | null;
  taxResponsibility: string | null;
}

export interface ChargeAccountData {
  tenantId: string;
  branchId: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  requiresInvoice: boolean;
  customer: FiscalCustomerData | null;
  chargedById: string;
}

export type ChargeAccountResult =
  | { status: 'CHARGED'; account: TableAccountSaleRecord; invoice: Invoice | null }
  | { status: 'NO_ACTIVE_CASH_SESSION' }
  | { status: 'ACCOUNT_NOT_FOUND' };

@Injectable()
export class TableAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  findSellableProduct(tenantId: string, productId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        deletedAt: null,
        isActive: true,
        isSellable: true,
      },
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

      const cashSession =
        data.method === PaymentMethod.CASH
          ? await tx.cashSession.findFirst({
              where: {
                tenantId: data.tenantId,
                branchId: data.branchId,
                status: CashSessionStatus.OPEN,
              },
            })
          : null;

      if (data.method === PaymentMethod.CASH && !cashSession) {
        return { status: 'NO_ACTIVE_CASH_SESSION' };
      }

      await tx.payment.create({
        data: {
          tenantId: data.tenantId,
          saleId: sale.id,
          method: data.method,
          amount: data.amount,
          reference: data.reference,
          createdById: data.chargedById,
        },
      });

      if (cashSession) {
        await tx.cashMovement.create({
          data: {
            tenantId: data.tenantId,
            branchId: data.branchId,
            cashSessionId: cashSession.id,
            type: CashMovementType.SALE_PAYMENT,
            amount: data.amount,
            reference: sale.id,
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
            taxResponsibility: data.customer.taxResponsibility,
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
            taxResponsibility: data.customer.taxResponsibility,
            createdById: data.chargedById,
          },
        });
        customerId = customer.id;

        const fiscalProfile = await tx.fiscalProfile.findUnique({
          where: { tenantId: data.tenantId },
          select: {
            id: true,
            invoiceResolutionPrefix: true,
            providerConfig: {
              select: {
                providerType: true,
                providerName: true,
              },
            },
          },
        });

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
            customerName: data.customer.name,
            customerEmail: data.customer.email,
            customerPhone: data.customer.phone,
            customerAddress: data.customer.address,
            customerMunicipality: data.customer.municipality,
            subtotalAmount: sale.subtotal,
            taxAmount: sale.taxTotal,
            discountAmount: sale.discountTotal,
            totalAmount: sale.grandTotal,
            currency: sale.currency,
            providerType: fiscalProfile?.providerConfig?.providerType ?? null,
            providerName: fiscalProfile?.providerConfig?.providerName ?? null,
            createdById: data.chargedById,
            lines: {
              create: sale.items.map((item) => ({
                tenantId: data.tenantId,
                productId: item.productId,
                description: item.nameSnapshot,
                quantity: item.quantity,
                unitPriceAmount: item.unitPriceSnapshot,
                subtotalAmount: item.lineTotal,
                taxAmount: 0,
                totalAmount: item.lineTotal,
                currency: sale.currency,
              })),
            },
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
          cashSessionId: cashSession?.id ?? sale.cashSessionId,
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

      await this.deductStockForSale(tx, data, sale);

      const account = await this.findByIdInTx(tx, data.tenantId, data.branchId, sale.id);
      if (!account) {
        return { status: 'ACCOUNT_NOT_FOUND' };
      }

      return { status: 'CHARGED', account, invoice };
    });
  }

  /**
   * Kardex-accurate stock deduction for a charged sale. For each line tied to a
   * product, the matching inventory item (branch-specific, then global) is
   * decremented and a SALE_CONSUMPTION movement is recorded. Untracked products
   * are skipped; the charge never fails on stock so the sale stays atomic.
   */
  private async deductStockForSale(
    tx: Prisma.TransactionClient,
    data: ChargeAccountData,
    sale: TableAccountSaleRecord,
  ): Promise<void> {
    for (const item of sale.items) {
      if (!item.productId) {
        continue;
      }

      const inventoryItem =
        (await tx.inventoryItem.findFirst({
          where: {
            tenantId: data.tenantId,
            productId: item.productId,
            isActive: true,
            deletedAt: null,
            branchId: data.branchId,
          },
        })) ??
        (await tx.inventoryItem.findFirst({
          where: {
            tenantId: data.tenantId,
            productId: item.productId,
            isActive: true,
            deletedAt: null,
            branchId: null,
          },
        }));

      if (!inventoryItem) {
        continue;
      }

      const stockBefore = inventoryItem.stockOnHand;
      const stockAfter = stockBefore - item.quantity;

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { stockOnHand: stockAfter, updatedById: data.chargedById },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: data.tenantId,
          branchId: inventoryItem.branchId ?? data.branchId,
          inventoryItemId: inventoryItem.id,
          type: StockMovementType.SALE_CONSUMPTION,
          quantity: item.quantity,
          stockBefore,
          stockAfter,
          reason: `Venta mesa · ${sale.id}`,
          createdById: data.chargedById,
        },
      });
    }
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
