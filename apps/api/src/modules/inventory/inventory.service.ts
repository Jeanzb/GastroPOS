import { Injectable } from '@nestjs/common';
import type { InventoryItemDto, PaginatedResult, StockMovementDto } from '@gastroai/contracts';
import type { Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { assertBranchAccess } from '../../common/access/branch-access';
import { createPaginatedResult, normalizePagination } from '../../common/pagination/pagination';
import { AuditService } from '../audit/audit.service';
import type { TenantRequestContext } from '../auth/auth.types';
import type { AdjustInventoryStockDto } from './dto/adjust-inventory-stock.dto';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import type { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { toInventoryItemDto, toStockMovementDto } from './inventory.mapper';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly auditService: AuditService,
  ) {}

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

  async createItem(
    ctx: TenantRequestContext,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const branchId = assertBranchAccess(ctx, dto.branchId);
    if (!branchId) {
      throw invalidBranch();
    }

    const result = await this.repository.createItem({
      tenantId: ctx.tenantId,
      branchId,
      productId: dto.productId?.trim() || null,
      sku: normalizeSku(dto.sku),
      name: dto.name.trim(),
      baseUnitCode: normalizeUnitCode(dto.baseUnitCode),
      baseUnitName: normalizeUnitName(dto.baseUnitName, dto.baseUnitCode),
      initialStock: dto.initialStock ?? 0,
      initialUnitCost: dto.initialUnitCost ?? null,
      minimumStock: dto.minimumStock ?? 0,
      allowNegativeStock: dto.allowNegativeStock ?? false,
      createdById: ctx.actorUserId,
    });

    if (result.status === 'INVALID_BRANCH') {
      throw invalidBranch();
    }
    if (result.status === 'INVALID_PRODUCT') {
      throw invalidProduct();
    }
    if (result.status === 'DUPLICATE_SKU') {
      throw duplicateSku();
    }

    const dtoResult = toInventoryItemDto(result.item);
    await this.auditService.tryRecord({
      ...auditBase(ctx, dtoResult.branchId),
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'InventoryBalance',
      entityId: dtoResult.id,
      after: asJson(dtoResult),
    });

    return dtoResult;
  }

  async updateItem(
    ctx: TenantRequestContext,
    id: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const existing = await this.repository.findItemById(id);
    if (!existing) {
      throw notFound();
    }
    assertBranchAccess(ctx, existing.branchId);

    const result = await this.repository.updateItem({
      tenantId: ctx.tenantId,
      id,
      sku: dto.sku === undefined ? undefined : normalizeSku(dto.sku),
      name: dto.name?.trim(),
      baseUnitCode:
        dto.baseUnitCode === undefined ? undefined : normalizeUnitCode(dto.baseUnitCode),
      baseUnitName:
        dto.baseUnitCode === undefined
          ? undefined
          : normalizeUnitName(dto.baseUnitName, dto.baseUnitCode),
      minimumStock: dto.minimumStock,
      allowNegativeStock: dto.allowNegativeStock,
      isActive: dto.isActive,
      updatedById: ctx.actorUserId,
    });

    if (result.status === 'NOT_FOUND') {
      throw notFound();
    }
    if (result.status === 'DUPLICATE_SKU') {
      throw duplicateSku();
    }

    const before = toInventoryItemDto(existing);
    const after = toInventoryItemDto(result.item);
    await this.auditService.tryRecord({
      ...auditBase(ctx, after.branchId),
      action: 'INVENTORY_ITEM_UPDATED',
      entityType: 'InventoryBalance',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async adjustStock(
    ctx: TenantRequestContext,
    id: string,
    dto: AdjustInventoryStockDto,
  ): Promise<InventoryItemDto> {
    const existing = await this.repository.findItemById(id);
    if (!existing) {
      throw notFound();
    }
    assertBranchAccess(ctx, existing.branchId);

    const result = await this.repository.adjustStock({
      tenantId: ctx.tenantId,
      id,
      movementType: dto.type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      quantity: dto.quantity,
      unitCost: dto.unitCost ?? null,
      reason: dto.reason.trim(),
      actorUserId: ctx.actorUserId,
    });

    if (result.status === 'NOT_FOUND') {
      throw notFound();
    }
    if (result.status === 'INSUFFICIENT_STOCK') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'The adjustment would leave this inventory item with negative stock.',
      });
    }

    const before = toInventoryItemDto(existing);
    const after = toInventoryItemDto(result.item);
    await this.auditService.tryRecord({
      ...auditBase(ctx, after.branchId),
      action: 'INVENTORY_STOCK_ADJUSTED',
      entityType: 'InventoryBalance',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
      metadata: {
        movementType: dto.type,
        quantity: dto.quantity,
        reason: dto.reason.trim(),
      },
    });

    return after;
  }
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeUnitCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeUnitName(name: string | undefined, code: string): string {
  return name?.trim() || normalizeUnitCode(code);
}

function invalidBranch(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'The referenced branch does not exist or is not available.',
  });
}

function invalidProduct(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'The referenced product does not exist.',
  });
}

function duplicateSku(): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: 'An inventory ingredient already exists with this SKU.',
  });
}

function notFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Inventory item was not found.',
  });
}

function auditBase(ctx: TenantRequestContext, branchId: string) {
  return {
    tenantId: ctx.tenantId,
    branchId,
    actorUserId: ctx.actorUserId,
  };
}

function asJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
