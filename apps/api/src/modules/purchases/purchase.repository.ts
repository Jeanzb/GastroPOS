import { Injectable } from '@nestjs/common';
import { Prisma, type PurchaseStatus, type Supplier } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { PurchaseWithDetails } from './purchase.mapper';

export interface PurchaseFilters {
  status?: PurchaseStatus;
  supplierId?: string;
  search?: string;
}

export interface CreatePurchaseItemData {
  productId: string | null;
  nameSnapshot: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface CreatePurchaseData {
  tenantId: string;
  branchId: string | null;
  supplierId: string;
  status: PurchaseStatus;
  currency: string;
  reference: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdById: string;
  items: CreatePurchaseItemData[];
}

export interface ReceivePurchaseData {
  id: string;
  tenantId: string;
  actorUserId: string;
}

export interface ReceivePurchaseResult {
  purchase: PurchaseWithDetails;
  received: boolean;
  stockMovementCount: number;
}

@Injectable()
export class PurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: PurchaseFilters,
    pagination: { skip: number; take: number },
  ): Promise<PurchaseWithDetails[]> {
    return this.prisma.tenantScoped.purchase.findMany({
      where: this.scope(filters),
      include: this.includeDetails(),
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: PurchaseFilters): Promise<number> {
    return this.prisma.tenantScoped.purchase.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<PurchaseWithDetails | null> {
    return this.prisma.tenantScoped.purchase.findFirst({
      where: { id, deletedAt: null },
      include: this.includeDetails(),
    });
  }

  findSupplierById(id: string): Promise<Supplier | null> {
    return this.prisma.tenantScoped.supplier.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
  }

  countProductsByIds(ids: string[]): Promise<number> {
    return this.prisma.tenantScoped.product.count({
      where: { id: { in: ids }, deletedAt: null },
    });
  }

  create(data: CreatePurchaseData): Promise<PurchaseWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          supplierId: data.supplierId,
          status: data.status,
          currency: data.currency,
          reference: data.reference,
          notes: data.notes,
          subtotal: data.subtotal,
          taxTotal: data.taxTotal,
          total: data.total,
          createdById: data.createdById,
          items: {
            create: data.items.map((item) => ({
              tenantId: data.tenantId,
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: this.includeDetails(),
      });

      return created;
    });
  }

  receive(data: ReceivePurchaseData): Promise<ReceivePurchaseResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: data.id, tenantId: data.tenantId, deletedAt: null },
        include: this.includeDetails(),
      });

      if (!purchase) {
        return null;
      }

      if (purchase.status !== 'DRAFT') {
        return { purchase, received: false, stockMovementCount: 0 };
      }

      let stockMovementCount = 0;
      for (const item of purchase.items) {
        await this.receiveItemIntoInventory(tx, purchase, item, data.actorUserId);
        stockMovementCount += 1;
      }

      const updated = await tx.purchase.update({
        where: { id: data.id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: this.includeDetails(),
      });

      return { purchase: updated, received: true, stockMovementCount };
    });
  }

  cancel(id: string): Promise<PurchaseWithDetails> {
    return this.prisma.tenantScoped.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.includeDetails(),
    });
  }

  private includeDetails() {
    return {
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { createdAt: 'asc' } },
    } satisfies Prisma.PurchaseInclude;
  }

  private scope(filters: PurchaseFilters): Prisma.PurchaseWhereInput {
    return {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: 'insensitive' } },
              { notes: { contains: filters.search, mode: 'insensitive' } },
              {
                supplier: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private async receiveItemIntoInventory(
    tx: Prisma.TransactionClient,
    purchase: PurchaseWithDetails,
    item: PurchaseWithDetails['items'][number],
    actorUserId: string,
  ): Promise<void> {
    const inventoryItem = await this.findOrCreateInventoryItem(tx, purchase, item, actorUserId);
    const stockBefore = inventoryItem.stockOnHand;
    const stockAfter = stockBefore + item.quantity;
    const averageCost = weightedAverageCost(
      stockBefore,
      inventoryItem.averageCost,
      item.quantity,
      item.unitCost,
    );

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        stockOnHand: stockAfter,
        averageCost,
        updatedById: actorUserId,
      },
    });

    await tx.stockMovement.create({
      data: {
        tenantId: purchase.tenantId,
        branchId: purchase.branchId,
        inventoryItemId: inventoryItem.id,
        purchaseId: purchase.id,
        purchaseItemId: item.id,
        type: 'PURCHASE',
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.lineTotal,
        stockBefore,
        stockAfter,
        reason: `Purchase ${purchase.reference ?? purchase.id} received`,
        createdById: actorUserId,
      },
    });
  }

  private async findOrCreateInventoryItem(
    tx: Prisma.TransactionClient,
    purchase: PurchaseWithDetails,
    item: PurchaseWithDetails['items'][number],
    actorUserId: string,
  ) {
    const existing = await tx.inventoryItem.findFirst({
      where: {
        tenantId: purchase.tenantId,
        branchId: purchase.branchId,
        deletedAt: null,
        ...(item.productId
          ? { productId: item.productId }
          : { productId: null, name: item.nameSnapshot }),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return tx.inventoryItem.create({
      data: {
        tenantId: purchase.tenantId,
        branchId: purchase.branchId,
        productId: item.productId,
        name: item.nameSnapshot,
        stockOnHand: 0,
        averageCost: item.unitCost,
        createdById: actorUserId,
      },
    });
  }
}

function weightedAverageCost(
  stockBefore: number,
  previousAverageCost: number,
  quantity: number,
  unitCost: number,
): number {
  const stockAfter = stockBefore + quantity;
  if (stockAfter <= 0 || stockBefore <= 0) {
    return unitCost;
  }

  return Math.round((stockBefore * previousAverageCost + quantity * unitCost) / stockAfter);
}
