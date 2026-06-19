import type {
  KitchenCommandDto,
  ReceiptDto,
  TableAccountDto,
  TableAccountInvoiceDto,
  TablePaymentMethod,
} from '@gastroai/contracts';
import type { Invoice } from '../../../generated/prisma';
import type { TableAccountSaleRecord } from './table-accounts.repository';

export function toTableAccountDto(
  sale: TableAccountSaleRecord,
  invoice?: Invoice | null,
): TableAccountDto {
  return {
    id: sale.id,
    diningTableId: sale.diningTableId ?? '',
    tableNumber: sale.diningTable?.number ?? 'Sin mesa',
    branchId: sale.branchId,
    status: sale.status,
    currency: sale.currency,
    waiterName: sale.waiterName,
    guestCount: sale.guestCount,
    customerName: sale.customerName,
    requiresInvoice: sale.requiresInvoice,
    subtotal: sale.subtotal,
    discountTotal: sale.discountTotal,
    taxTotal: sale.taxTotal,
    grandTotal: sale.grandTotal,
    paidTotal: sale.paidTotal,
    balanceDue: Math.max(0, sale.grandTotal - sale.paidTotal),
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      unitPriceAmount: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      createdAt: item.createdAt.toISOString(),
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    })),
    invoice: invoice ? toTableAccountInvoiceDto(invoice) : null,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    closedAt: sale.closedAt?.toISOString() ?? null,
  };
}

export function toKitchenCommandDto(sale: TableAccountSaleRecord): KitchenCommandDto {
  return {
    saleId: sale.id,
    tableNumber: sale.diningTable?.number ?? 'Sin mesa',
    waiterName: sale.waiterName,
    createdAt: new Date().toISOString(),
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      quantity: item.quantity,
    })),
    totalItems: sale.items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function toReceiptDto(
  sale: TableAccountSaleRecord,
  invoice?: Invoice | null,
): ReceiptDto {
  const lastPayment = sale.payments[sale.payments.length - 1];

  return {
    saleId: sale.id,
    tableNumber: sale.diningTable?.number ?? 'Sin mesa',
    currency: sale.currency,
    subtotal: sale.subtotal,
    discountTotal: sale.discountTotal,
    taxTotal: sale.taxTotal,
    total: sale.grandTotal,
    paidTotal: sale.paidTotal,
    balanceDue: Math.max(0, sale.grandTotal - sale.paidTotal),
    paymentMethod: (lastPayment?.method ?? null) as TablePaymentMethod | null,
    requiresInvoice: sale.requiresInvoice,
    invoice: invoice ? toTableAccountInvoiceDto(invoice) : null,
    items: sale.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      unitPriceAmount: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    closedAt: sale.closedAt?.toISOString() ?? null,
  };
}

function toTableAccountInvoiceDto(invoice: Invoice): TableAccountInvoiceDto {
  return {
    id: invoice.id,
    status: invoice.status,
    customerName: invoice.customerName,
    totalAmount: invoice.totalAmount,
    createdAt: invoice.createdAt.toISOString(),
  };
}
