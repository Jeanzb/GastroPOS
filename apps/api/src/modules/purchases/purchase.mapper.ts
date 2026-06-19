import type { PurchaseDto } from '@gastroai/contracts';
import type { Purchase, PurchaseItem, Supplier } from '../../../generated/prisma';

export type PurchaseWithDetails = Purchase & {
  supplier: Pick<Supplier, 'id' | 'name'>;
  items: PurchaseItem[];
};

export function toPurchaseDto(purchase: PurchaseWithDetails): PurchaseDto {
  return {
    id: purchase.id,
    branchId: purchase.branchId,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplier.name,
    status: purchase.status,
    currency: purchase.currency,
    reference: purchase.reference,
    notes: purchase.notes,
    subtotal: purchase.subtotal,
    taxTotal: purchase.taxTotal,
    total: purchase.total,
    receivedAt: purchase.receivedAt?.toISOString() ?? null,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    items: purchase.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
