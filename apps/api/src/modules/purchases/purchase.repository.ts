import { Injectable } from '@nestjs/common';
import { Prisma, type PurchaseStatus, type Supplier } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { PurchaseWithDetails } from './purchase.mapper';

export interface PurchaseFilters {
  branchId?: string;
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
  branchId: string | null;
  actorUserId: string;
}

export interface ReceivePurchaseResult {
  purchase: PurchaseWithDetails;
  received: boolean;
  stockMovementCount: number;
  missingBranch?: boolean;
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

      const branchId = purchase.branchId ?? data.branchId;
      if (!branchId) {
        return { purchase, received: false, stockMovementCount: 0, missingBranch: true };
      }

      let stockMovementCount = 0;
      for (const item of purchase.items) {
        await this.receiveItemIntoInventory(tx, purchase, branchId, item, data.actorUserId);
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
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
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
    branchId: string,
    item: PurchaseWithDetails['items'][number],
    actorUserId: string,
  ): Promise<void> {
    const inventoryItem = await this.findOrCreateInventoryBalance(
      tx,
      purchase,
      branchId,
      item,
      actorUserId,
    );
    const stockBefore = inventoryItem.stockOnHand;
    const stockAfter = stockBefore + item.quantity;
    const averageCost = weightedAverageCost(
      stockBefore,
      inventoryItem.averageCost,
      item.quantity,
      item.unitCost,
    );

    await tx.inventoryBalance.update({
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
        branchId,
        inventoryBalanceId: inventoryItem.id,
        ingredientId: inventoryItem.ingredientId,
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

  private async findOrCreateInventoryBalance(
    tx: Prisma.TransactionClient,
    purchase: PurchaseWithDetails,
    branchId: string,
    item: PurchaseWithDetails['items'][number],
    actorUserId: string,
  ) {
    const product = item.productId
      ? await tx.product.findFirst({
          where: { id: item.productId, tenantId: purchase.tenantId, deletedAt: null },
          select: { id: true, sku: true, name: true },
        })
      : null;
    const sku = normalizeSku(product?.sku ?? `PUR-${item.id.slice(0, 8)}`);
    const name = product?.name ?? item.nameSnapshot;
    const ingredient =
      (await tx.inventoryIngredient.findFirst({
        where: {
          tenantId: purchase.tenantId,
          deletedAt: null,
          ...(item.productId ? { productId: item.productId } : { sku }),
        },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await tx.inventoryIngredient.create({
        data: {
          tenantId: purchase.tenantId,
          productId: item.productId,
          baseUnitId: await this.findOrCreateDefaultUnitId(tx, purchase.tenantId, actorUserId),
          sku,
          name,
          createdById: actorUserId,
        },
      }));

    const existing = await tx.inventoryBalance.findFirst({
      where: {
        tenantId: purchase.tenantId,
        branchId,
        ingredientId: ingredient.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return tx.inventoryBalance.create({
      data: {
        tenantId: purchase.tenantId,
        branchId,
        ingredientId: ingredient.id,
        stockOnHand: 0,
        averageCost: item.unitCost,
        createdById: actorUserId,
      },
    });
  }

  private async findOrCreateDefaultUnitId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
  ): Promise<string> {
    const unit = await tx.unitOfMeasure.upsert({
      where: { tenantId_code: { tenantId, code: 'UND' } },
      update: { name: 'Unidad', isActive: true, deletedAt: null, updatedById: actorUserId },
      create: { tenantId, code: 'UND', name: 'Unidad', createdById: actorUserId },
      select: { id: true },
    });
    return unit.id;
  }
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
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
