import { Injectable } from '@nestjs/common';
import type { PaginatedResult, PurchaseDto } from '@gastroai/contracts';
import type { Prisma, PurchaseStatus } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../common/pagination/pagination';
import type { TenantRequestContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { toPurchaseDto } from './purchase.mapper';
import { PurchaseRepository, type CreatePurchaseItemData } from './purchase.repository';
import type { CreatePurchaseDto } from './dto/create-purchase.dto';
import type { ListPurchasesQueryDto } from './dto/list-purchases-query.dto';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly repository: PurchaseRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    _ctx: TenantRequestContext,
    query: ListPurchasesQueryDto,
  ): Promise<PaginatedResult<PurchaseDto>> {
    const pagination = normalizePagination(query);
    const filters = {
      status: query.status,
      supplierId: query.supplierId,
      search: query.search,
    };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(rows.map(toPurchaseDto), total, pagination);
  }

  async getById(_ctx: TenantRequestContext, id: string): Promise<PurchaseDto> {
    const purchase = await this.repository.findById(id);
    if (!purchase) {
      throw notFound();
    }

    return toPurchaseDto(purchase);
  }

  async create(ctx: TenantRequestContext, dto: CreatePurchaseDto): Promise<PurchaseDto> {
    const supplier = await this.repository.findSupplierById(dto.supplierId);
    if (!supplier) {
      throw supplierNotFound();
    }

    await this.assertProductsBelongToTenant(dto.items.map((item) => item.productId));

    const items = dto.items.map((item): CreatePurchaseItemData => {
      const quantity = item.quantity;
      const unitCost = item.unitCost;
      return {
        productId: item.productId?.trim() || null,
        nameSnapshot: item.name.trim(),
        quantity,
        unitCost,
        lineTotal: quantity * unitCost,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxTotal = dto.taxTotal ?? 0;
    const total = subtotal + taxTotal;

    const created = await this.repository.create({
      tenantId: ctx.tenantId,
      branchId: dto.branchId?.trim() || ctx.branchId,
      supplierId: supplier.id,
      status: 'DRAFT',
      currency: (dto.currency ?? 'COP').trim().toUpperCase(),
      reference: dto.reference?.trim() || null,
      notes: dto.notes?.trim() || null,
      subtotal,
      taxTotal,
      total,
      createdById: ctx.actorUserId,
      items,
    });

    const result = toPurchaseDto(created);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'PURCHASE_CREATED',
      entityType: 'Purchase',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async receive(ctx: TenantRequestContext, id: string): Promise<PurchaseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }
    if (existing.status !== 'DRAFT') {
      throw invalidStatus(existing.status, 'receive');
    }

    const received = await this.repository.receive({
      id,
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
    });
    if (!received) {
      throw notFound();
    }
    if (!received.received) {
      throw invalidStatus(received.purchase.status, 'receive');
    }

    const updated = received.purchase;
    const result = toPurchaseDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'PURCHASE_RECEIVED',
      entityType: 'Purchase',
      entityId: id,
      before: asJson(toPurchaseDto(existing)),
      after: asJson(result),
      metadata: asJson({ stockMovementCount: received.stockMovementCount }),
    });

    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'STOCK_MOVEMENTS_CREATED',
      entityType: 'Purchase',
      entityId: id,
      metadata: asJson({
        reason: 'PURCHASE_RECEIVED',
        stockMovementCount: received.stockMovementCount,
      }),
    });

    return result;
  }

  async cancel(ctx: TenantRequestContext, id: string): Promise<PurchaseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }
    if (existing.status !== 'DRAFT') {
      throw invalidStatus(existing.status, 'cancel');
    }

    const updated = await this.repository.cancel(id);
    const result = toPurchaseDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'PURCHASE_CANCELLED',
      entityType: 'Purchase',
      entityId: id,
      before: asJson(toPurchaseDto(existing)),
      after: asJson(result),
    });

    return result;
  }

  private async assertProductsBelongToTenant(productIds: Array<string | undefined>): Promise<void> {
    const ids = Array.from(new Set(productIds.filter((id): id is string => Boolean(id?.trim()))));
    if (ids.length === 0) {
      return;
    }

    const count = await this.repository.countProductsByIds(ids);
    if (count !== ids.length) {
      throw invalidProduct();
    }
  }
}

function auditBase(ctx: TenantRequestContext) {
  return {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    actorUserId: ctx.actorUserId,
  };
}

function notFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Purchase was not found.',
  });
}

function supplierNotFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Supplier was not found.',
  });
}

function invalidProduct(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'One or more purchase products do not belong to this tenant.',
  });
}

function invalidStatus(status: PurchaseStatus, action: 'receive' | 'cancel'): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `Cannot ${action} a purchase with status ${status}.`,
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
