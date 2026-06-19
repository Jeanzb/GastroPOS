import { Injectable } from '@nestjs/common';
import type { InventoryItemDto, PaginatedResult, StockMovementDto } from '@gastroai/contracts';
import { assertBranchAccess } from '../../common/access/branch-access';
import { createPaginatedResult, normalizePagination } from '../../common/pagination/pagination';
import type { TenantRequestContext } from '../auth/auth.types';
import { toInventoryItemDto, toStockMovementDto } from './inventory.mapper';
import { InventoryRepository } from './inventory.repository';
import type { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import type { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async listItems(
    ctx: TenantRequestContext,
    query: ListInventoryItemsQueryDto,
  ): Promise<PaginatedResult<InventoryItemDto>> {
    const pagination = normalizePagination(query);
    const filters = {
      branchId: assertBranchAccess(ctx, query.branchId),
      search: query.search,
      lowStockOnly: query.lowStockOnly,
    };

    const [rows, total] = await Promise.all([
      this.repository.findItems(filters, pagination),
      this.repository.countItems(filters),
    ]);

    return createPaginatedResult(rows.map(toInventoryItemDto), total, pagination);
  }

  async listMovements(
    ctx: TenantRequestContext,
    query: ListStockMovementsQueryDto,
  ): Promise<PaginatedResult<StockMovementDto>> {
    const pagination = normalizePagination(query);
    const filters = {
      branchId: assertBranchAccess(ctx, query.branchId),
      inventoryItemId: query.inventoryItemId,
      type: query.type,
    };
    const sorting = {
      sortBy: query.sortBy ?? 'createdAt',
      sortDir: query.sortDir ?? 'desc',
    } as const;

    const [rows, total] = await Promise.all([
      this.repository.findMovements(filters, pagination, sorting),
      this.repository.countMovements(filters),
    ]);

    return createPaginatedResult(rows.map(toStockMovementDto), total, pagination);
  }
}
