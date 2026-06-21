import { Injectable } from '@nestjs/common';
import { Prisma, type InventoryCategory, type StockMovementType } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { InventoryBalanceWithIngredient, StockMovementWithInventory } from './inventory.mapper';
import type { SortDirection, StockMovementSortField } from './dto/list-stock-movements-query.dto';

export interface InventoryItemFilters {
  branchId?: string;
  search?: string;
  lowStockOnly?: boolean;
}

export interface StockMovementFilters {
  branchId?: string;
  inventoryItemId?: string;
  type?: StockMovementType;
}

export interface StockMovementSorting {
  sortBy: StockMovementSortField;
  sortDir: SortDirection;
}

export interface CreateInventoryItemData {
  tenantId: string;
  branchId: string;
  productId: string | null;
  categoryId: string;
  name: string;
  baseUnitCode: string;
  baseUnitName: string;
  initialStock: number;
  initialUnitCost: number | null;
  minimumStock: number;
  allowNegativeStock: boolean;
  createdById: string;
}

export interface UpdateInventoryItemData {
  tenantId: string;
  id: string;
  name?: string;
  baseUnitCode?: string;
  baseUnitName?: string;
  minimumStock?: number;
  allowNegativeStock?: boolean;
  isActive?: boolean;
  updatedById: string;
}

export interface AdjustInventoryStockData {
  tenantId: string;
  id: string;
  movementType: Extract<StockMovementType, 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>;
  quantity: number;
  unitCost: number | null;
  reason: string;
  actorUserId: string;
}

export type CreateInventoryItemResult =
  | { status: 'CREATED'; item: InventoryBalanceWithIngredient }
  | { status: 'INVALID_BRANCH' }
  | { status: 'INVALID_CATEGORY' }
  | { status: 'INVALID_PRODUCT' }
  | { status: 'DUPLICATE_SKU' };

export type UpdateInventoryItemResult =
  | { status: 'UPDATED'; item: InventoryBalanceWithIngredient }
  | { status: 'NOT_FOUND' };

export type AdjustInventoryStockResult =
  | { status: 'ADJUSTED'; item: InventoryBalanceWithIngredient }
  | { status: 'NOT_FOUND' }
  | { status: 'INSUFFICIENT_STOCK' };

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(tenantId: string): Promise<InventoryCategory[]> {
    return this.prisma.inventoryCategory.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });
  }

  findItems(
    filters: InventoryItemFilters,
    pagination: { skip: number; take: number },
  ): Promise<InventoryBalanceWithIngredient[]> {
    return this.prisma.tenantScoped.inventoryBalance.findMany({
      where: this.itemScope(filters),
      include: this.includeIngredient(),
      orderBy: [{ ingredient: { name: 'asc' } }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  countItems(filters: InventoryItemFilters): Promise<number> {
    return this.prisma.tenantScoped.inventoryBalance.count({
      where: this.itemScope(filters),
    });
  }

  findItemById(id: string): Promise<InventoryBalanceWithIngredient | null> {
    return this.prisma.tenantScoped.inventoryBalance.findFirst({
      where: { id, deletedAt: null, ingredient: { deletedAt: null } },
      include: this.includeIngredient(),
    });
  }

  findMovements(
    filters: StockMovementFilters,
    pagination: { skip: number; take: number },
    sorting: StockMovementSorting,
  ): Promise<StockMovementWithInventory[]> {
    return this.prisma.tenantScoped.stockMovement.findMany({
      where: this.movementScope(filters),
      include: { ingredient: { select: { id: true, name: true } } },
      orderBy: this.movementOrderBy(sorting),
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  countMovements(filters: StockMovementFilters): Promise<number> {
    return this.prisma.tenantScoped.stockMovement.count({
      where: this.movementScope(filters),
    });
  }

  createItem(data: CreateInventoryItemData): Promise<CreateInventoryItemResult> {
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: { id: data.branchId, tenantId: data.tenantId, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (!branch) {
        return { status: 'INVALID_BRANCH' };
      }

      if (data.productId) {
        const product = await tx.product.findFirst({
          where: { id: data.productId, tenantId: data.tenantId, deletedAt: null },
          select: { id: true },
        });
        if (!product) {
          return { status: 'INVALID_PRODUCT' };
        }
      }

      const category = await tx.inventoryCategory.findFirst({
        where: {
          id: data.categoryId,
          tenantId: data.tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, skuPrefix: true },
      });
      if (!category) {
        return { status: 'INVALID_CATEGORY' };
      }

      const unit = await this.findOrCreateUnit(tx, {
        tenantId: data.tenantId,
        code: data.baseUnitCode,
        name: data.baseUnitName,
        actorUserId: data.createdById,
      });
      const skuNumber = await this.reserveSkuNumber(tx, data.tenantId, category.skuPrefix);
      const sku = `${category.skuPrefix}-${skuNumber.toString().padStart(4, '0')}`;

      let ingredient;
      try {
        ingredient = await tx.inventoryIngredient.create({
          data: {
            tenantId: data.tenantId,
            productId: data.productId,
            baseUnitId: unit.id,
            categoryId: category.id,
            sku,
            name: data.name,
            createdById: data.createdById,
          },
        });
      } catch (error) {
        if (isUniqueConstraint(error)) {
          return { status: 'DUPLICATE_SKU' };
        }
        throw error;
      }

      const balance = await tx.inventoryBalance.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          ingredientId: ingredient.id,
          stockOnHand: data.initialStock,
          minimumStock: data.minimumStock,
          averageCost: data.initialStock > 0 ? data.initialUnitCost ?? 0 : 0,
          allowNegativeStock: data.allowNegativeStock,
          createdById: data.createdById,
        },
      });

      if (data.initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: data.tenantId,
            branchId: data.branchId,
            inventoryBalanceId: balance.id,
            ingredientId: ingredient.id,
            type: 'ADJUSTMENT_IN',
            quantity: data.initialStock,
            unitCost: data.initialUnitCost,
            totalCost: data.initialUnitCost ? data.initialStock * data.initialUnitCost : null,
            stockBefore: 0,
            stockAfter: data.initialStock,
            reason: 'Stock inicial',
            createdById: data.createdById,
          },
        });
      }

      const item = await this.findItemByIdInTx(tx, data.tenantId, balance.id);
      if (!item) {
        throw new Error('Inventory item was created but could not be loaded.');
      }

      return { status: 'CREATED', item };
    });
  }

  updateItem(data: UpdateInventoryItemData): Promise<UpdateInventoryItemResult> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.findItemByIdInTx(tx, data.tenantId, data.id);
      if (!current) {
        return { status: 'NOT_FOUND' };
      }

      const unit =
        data.baseUnitCode === undefined
          ? null
          : await this.findOrCreateUnit(tx, {
              tenantId: data.tenantId,
              code: data.baseUnitCode,
              name: data.baseUnitName ?? data.baseUnitCode,
              actorUserId: data.updatedById,
            });

      await tx.inventoryIngredient.update({
        where: { id: current.ingredientId },
        data: {
          name: data.name,
          baseUnitId: unit?.id,
          isActive: data.isActive,
          updatedById: data.updatedById,
        },
      });

      await tx.inventoryBalance.update({
        where: { id: data.id },
        data: {
          minimumStock: data.minimumStock,
          allowNegativeStock: data.allowNegativeStock,
          updatedById: data.updatedById,
        },
      });

      const item = await this.findItemByIdInTx(tx, data.tenantId, data.id);
      if (!item) {
        throw new Error('Inventory item was updated but could not be loaded.');
      }

      return { status: 'UPDATED', item };
    });
  }

  adjustStock(data: AdjustInventoryStockData): Promise<AdjustInventoryStockResult> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.findItemByIdInTx(tx, data.tenantId, data.id);
      if (!current) {
        return { status: 'NOT_FOUND' };
      }

      const stockBefore = current.stockOnHand;
      const stockAfter =
        data.movementType === 'ADJUSTMENT_IN'
          ? stockBefore + data.quantity
          : stockBefore - data.quantity;

      if (stockAfter < 0 && !current.allowNegativeStock) {
        return { status: 'INSUFFICIENT_STOCK' };
      }

      const averageCost =
        data.movementType === 'ADJUSTMENT_IN' && data.unitCost
          ? weightedAverageCost(stockBefore, current.averageCost, data.quantity, data.unitCost)
          : current.averageCost;

      await tx.inventoryBalance.update({
        where: { id: current.id },
        data: {
          stockOnHand: stockAfter,
          averageCost,
          updatedById: data.actorUserId,
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: data.tenantId,
          branchId: current.branchId,
          inventoryBalanceId: current.id,
          ingredientId: current.ingredientId,
          type: data.movementType,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost: data.unitCost ? data.quantity * data.unitCost : null,
          stockBefore,
          stockAfter,
          reason: data.reason,
          createdById: data.actorUserId,
        },
      });

      const item = await this.findItemByIdInTx(tx, data.tenantId, data.id);
      if (!item) {
        throw new Error('Inventory item was adjusted but could not be loaded.');
      }

      return { status: 'ADJUSTED', item };
    });
  }

  private findItemByIdInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<InventoryBalanceWithIngredient | null> {
    return tx.inventoryBalance.findFirst({
      where: { id, tenantId, deletedAt: null, ingredient: { deletedAt: null } },
      include: this.includeIngredient(),
    });
  }

  private async findOrCreateUnit(
    tx: Prisma.TransactionClient,
    data: { tenantId: string; code: string; name: string; actorUserId: string },
  ) {
    return tx.unitOfMeasure.upsert({
      where: { tenantId_code: { tenantId: data.tenantId, code: data.code } },
      update: {
        name: data.name,
        isActive: true,
        deletedAt: null,
        updatedById: data.actorUserId,
      },
      create: {
        tenantId: data.tenantId,
        code: data.code,
        name: data.name,
        createdById: data.actorUserId,
      },
    });
  }

  private async reserveSkuNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    prefix: string,
  ): Promise<number> {
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
    return number;
  }

  private itemScope(filters: InventoryItemFilters): Prisma.InventoryBalanceWhereInput {
    return {
      deletedAt: null,
      ingredient: {
        deletedAt: null,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.lowStockOnly
        ? { stockOnHand: { lte: this.prisma.inventoryBalance.fields.minimumStock } }
        : {}),
    };
  }

  private movementScope(filters: StockMovementFilters): Prisma.StockMovementWhereInput {
    return {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.inventoryItemId ? { inventoryBalanceId: filters.inventoryItemId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };
  }

  private movementOrderBy(
    sorting: StockMovementSorting,
  ): Prisma.StockMovementOrderByWithRelationInput[] {
    const sortDir = sorting.sortDir;

    if (sorting.sortBy === 'inventoryItemName') {
      return [{ ingredient: { name: sortDir } }, { createdAt: 'desc' }];
    }

    return [{ [sorting.sortBy]: sortDir }, { createdAt: 'desc' }];
  }

  private includeIngredient() {
    return {
      ingredient: {
        include: {
          baseUnit: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, name: true, skuPrefix: true } },
        },
      },
    } satisfies Prisma.InventoryBalanceInclude;
  }
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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
