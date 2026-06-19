import { Injectable } from '@nestjs/common';
import { Prisma, type InventoryItem, type StockMovementType } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { StockMovementWithItem } from './inventory.mapper';
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

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findItems(
    filters: InventoryItemFilters,
    pagination: { skip: number; take: number },
  ): Promise<InventoryItem[]> {
    return this.prisma.tenantScoped.inventoryItem.findMany({
      where: this.itemScope(filters),
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  countItems(filters: InventoryItemFilters): Promise<number> {
    return this.prisma.tenantScoped.inventoryItem.count({
      where: this.itemScope(filters),
    });
  }

  findMovements(
    filters: StockMovementFilters,
    pagination: { skip: number; take: number },
    sorting: StockMovementSorting,
  ): Promise<StockMovementWithItem[]> {
    return this.prisma.tenantScoped.stockMovement.findMany({
      where: this.movementScope(filters),
      include: { inventoryItem: { select: { id: true, name: true } } },
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

  private itemScope(filters: InventoryItemFilters): Prisma.InventoryItemWhereInput {
    return {
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.lowStockOnly
        ? { stockOnHand: { lte: this.prisma.inventoryItem.fields.minimumStock } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { sku: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private movementScope(filters: StockMovementFilters): Prisma.StockMovementWhereInput {
    return {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };
  }

  private movementOrderBy(
    sorting: StockMovementSorting,
  ): Prisma.StockMovementOrderByWithRelationInput[] {
    const sortDir = sorting.sortDir;

    if (sorting.sortBy === 'inventoryItemName') {
      return [{ inventoryItem: { name: sortDir } }, { createdAt: 'desc' }];
    }

    return [{ [sorting.sortBy]: sortDir }, { createdAt: 'desc' }];
  }
}
