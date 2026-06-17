import { Injectable } from '@nestjs/common';
import type { PaginatedResult, ProductCategoryDto } from '@gastroai/contracts';
import type { Prisma } from '../../../../generated/prisma';
import { ApiErrorCode } from '../../../common/errors/api-error-code';
import { ApplicationException } from '../../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../../common/pagination/pagination';
import { AuditService } from '../../audit/audit.service';
import type { CatalogActor } from '../catalog.types';
import type { CreateProductCategoryDto } from './dto/create-product-category.dto';
import type { ListProductCategoriesQueryDto } from './dto/list-product-categories-query.dto';
import type { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { toProductCategoryDto } from './product-category.mapper';
import { ProductCategoryRepository } from './product-category.repository';

@Injectable()
export class ProductCategoryService {
  constructor(
    private readonly repository: ProductCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    actor: CatalogActor,
    query: ListProductCategoriesQueryDto,
  ): Promise<PaginatedResult<ProductCategoryDto>> {
    const pagination = normalizePagination(query);
    const filters = { isActive: query.isActive, search: query.search };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(
      rows.map(toProductCategoryDto),
      total,
      pagination,
    );
  }

  async getById(_actor: CatalogActor, id: string): Promise<ProductCategoryDto> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw notFound();
    }
    return toProductCategoryDto(category);
  }

  async create(
    actor: CatalogActor,
    dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryDto> {
    const name = dto.name.trim();
    const existing = await this.repository.findByName(name);
    if (existing) {
      throw duplicateName(name);
    }

    const created = await this.repository.create({
      name,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      createdById: actor.actorUserId,
    });

    const result = toProductCategoryDto(created);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'PRODUCT_CATEGORY_CREATED',
      entityType: 'ProductCategory',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async update(
    actor: CatalogActor,
    id: string,
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const name = dto.name?.trim();
    if (name && name !== existing.name) {
      const clash = await this.repository.findByName(name);
      if (clash && clash.id !== id) {
        throw duplicateName(name);
      }
    }

    const before = toProductCategoryDto(existing);
    const updated = await this.repository.update(id, {
      name,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      updatedById: actor.actorUserId,
    });

    const after = toProductCategoryDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'PRODUCT_CATEGORY_UPDATED',
      entityType: 'ProductCategory',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async remove(actor: CatalogActor, id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    await this.repository.softDelete(id, actor.actorUserId);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'PRODUCT_CATEGORY_DELETED',
      entityType: 'ProductCategory',
      entityId: id,
      before: asJson(toProductCategoryDto(existing)),
    });
  }
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function auditBase(actor: CatalogActor) {
  return {
    tenantId: actor.tenantId,
    branchId: actor.branchId,
    actorUserId: actor.actorUserId,
    requestId: actor.requestId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  };
}

function notFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Product category was not found.',
  });
}

function duplicateName(name: string): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `A product category named "${name}" already exists.`,
  });
}
