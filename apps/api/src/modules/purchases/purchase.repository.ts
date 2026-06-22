import { Injectable } from '@nestjs/common';
import { Prisma, type PurchaseStatus, type Supplier } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_INVENTORY_CATEGORIES } from '../inventory/inventory-categories.constants';
import type { PurchaseWithDetails } from './purchase.mapper';

export interface PurchaseFilters {
  branchId?: string;
  status?: PurchaseStatus;
  supplierId?: string;
  search?: string;
  /** Inclusive lower bound on createdAt (month start, tenant tz, as UTC instant). */
  from?: Date;
  /** Exclusive upper bound on createdAt (next month start). */
  to?: Date;
}

export interface PurchasePeriodRow {
  createdAt: Date;
  total: number;
  status: PurchaseStatus;
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

  async findTenantTimezone(tenantId: string): Promise<string | null> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return settings?.timezone ?? null;
  }

  /** Lightweight rows used to roll purchases up by month for the history selector. */
  findRowsForPeriods(filters: Pick<PurchaseFilters, 'branchId'>): Promise<PurchasePeriodRow[]> {
    return this.prisma.tenantScoped.purchase.findMany({
      where: {
        deletedAt: null,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
      select: { createdAt: true, total: true, status: true },
    });
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
      ...(filters.from && filters.to
        ? { createdAt: { gte: filters.from, lt: filters.to } }
        : {}),
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
          select: { id: true, name: true },
        })
      : null;
    const linkedIngredient = product
      ? await tx.inventoryIngredient.findFirst({
          where: {
            tenantId: purchase.tenantId,
            productId: product.id,
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
        })
      : null;

    const category = linkedIngredient
      ? null
      : await this.findOrCreateGenericInventoryCategory(tx, purchase.tenantId, actorUserId);
    const sku = linkedIngredient
      ? linkedIngredient.sku
      : product
        ? await this.createInventorySku(tx, purchase.tenantId, category!.skuPrefix)
        : normalizeSku(`PUR-${item.id.slice(0, 8)}`);
    const name = product?.name ?? item.nameSnapshot;
    const ingredient = linkedIngredient ??
      (await tx.inventoryIngredient.findFirst({
        where: {
          tenantId: purchase.tenantId,
          deletedAt: null,
          sku,
        },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await tx.inventoryIngredient.create({
        data: {
          tenantId: purchase.tenantId,
          productId: product?.id ?? null,
          baseUnitId: await this.findOrCreateDefaultUnitId(tx, purchase.tenantId, actorUserId),
          categoryId: category!.id,
          sku,
          name,
          createdById: actorUserId,
        },
      }));

    if (product) {
      await tx.product.updateMany({
        where: { id: product.id, tenantId: purchase.tenantId, deletedAt: null },
        data: { isInventoried: true, updatedById: actorUserId },
      });
    }

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

  private async findOrCreateGenericInventoryCategory(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
  ): Promise<{ id: string; skuPrefix: string }> {
    const category = DEFAULT_INVENTORY_CATEGORIES.find((item) => item.code === 'GENERICO');
    if (!category) {
      throw new Error('Generic inventory category is not configured.');
    }

    const result = await tx.inventoryCategory.upsert({
      where: { tenantId_code: { tenantId, code: category.code } },
      update: {
        name: category.name,
        skuPrefix: category.skuPrefix,
        isActive: true,
        deletedAt: null,
        updatedById: actorUserId,
      },
      create: {
        tenantId,
        code: category.code,
        name: category.name,
        skuPrefix: category.skuPrefix,
        createdById: actorUserId,
      },
      select: { id: true, skuPrefix: true },
    });

    return result;
  }

  private async createInventorySku(
    tx: Prisma.TransactionClient,
    tenantId: string,
    prefix: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ number: number }>>`
      INSERT INTO "inventory_sku_sequences" ("id", "tenantId", "prefix", "nextNumber", "createdAt", "updatedAt")
      VALUES (${`invseq_${tenantId}_${prefix}`}, ${tenantId}, ${prefix}, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenantId", "prefix")
      DO UPDATE SET
        "nextNumber" = "inventory_sku_sequences"."nextNumber" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "nextNumber" - 1 AS "number"
    `;

    const number = rows[0]?.number;
    if (!number) {
      throw new Error('Inventory SKU sequence did not return a number.');
    }
    return `${prefix}-${number.toString().padStart(4, '0')}`;
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
