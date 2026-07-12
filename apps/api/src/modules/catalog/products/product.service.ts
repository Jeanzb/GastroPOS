import { Injectable } from '@nestjs/common';
import type { PaginatedResult, ProductDto } from '@gastroai/contracts';
import type { Prisma } from '../../../../generated/prisma';
import { ApiErrorCode } from '../../../common/errors/api-error-code';
import { ApplicationException } from '../../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../../common/pagination/pagination';
import { AuditService } from '../../audit/audit.service';
import type { CatalogActor } from '../catalog.types';
import { ProductCategoryRepository } from '../categories/product-category.repository';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { toProductDto } from './product.mapper';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly categoryRepository: ProductCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    actor: CatalogActor,
    query: ListProductsQueryDto,
  ): Promise<PaginatedResult<ProductDto>> {
    const pagination = normalizePagination(query);
    const filters = {
      isActive: query.isActive,
      categoryId: query.categoryId,
      search: query.search,
    };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(rows.map(toProductDto), total, pagination);
  }

  async getById(_actor: CatalogActor, id: string): Promise<ProductDto> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw notFound();
    }
    return toProductDto(product);
  }

  async create(
    actor: CatalogActor,
    dto: CreateProductDto,
  ): Promise<ProductDto> {
    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }
    if (dto.taxCategoryId) {
      await this.assertTaxCategoryExists(actor.tenantId, dto.taxCategoryId);
    }
    this.assertCoherentFiscalFlags(dto.isExcluded, dto.incApplies, dto.taxCategoryId);

    const sku = dto.sku?.trim() || null;
    if (sku) {
      await this.assertSkuAvailable(sku);
    }

    let created;
    try {
      created = await this.repository.create({
        tenantId: actor.tenantId,
        categoryId: dto.categoryId ?? null,
        taxCategoryId: dto.taxCategoryId ?? null,
        sku,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        priceAmount: dto.priceAmount,
        currency: dto.currency ?? 'COP',
        fiscalName: dto.fiscalName?.trim() || null,
        fiscalCodeReference: dto.fiscalCodeReference?.trim() || null,
        unitMeasureCode: dto.unitMeasureCode?.trim() || '94',
        standardCode: dto.standardCode ?? '999',
        isExcluded: dto.isExcluded ?? false,
        incApplies: dto.incApplies ?? false,
        isActive: dto.isActive ?? true,
        isSellable: dto.isSellable ?? true,
        isInventoried: dto.isInventoried ?? false,
        createdById: actor.actorUserId,
        recipeIngredients: normalizeRecipe(dto.recipeIngredients),
      });
    } catch (error) {
      if (isInvalidRecipeIngredient(error)) {
        throw invalidRecipeIngredient();
      }
      throw error;
    }

    const result = toProductDto(created);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async update(
    actor: CatalogActor,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }
    if (dto.taxCategoryId && dto.taxCategoryId !== existing.taxCategoryId) {
      await this.assertTaxCategoryExists(actor.tenantId, dto.taxCategoryId);
    }
    this.assertCoherentFiscalFlags(
      dto.isExcluded ?? existing.isExcluded,
      dto.incApplies ?? existing.incApplies,
      dto.taxCategoryId === undefined ? existing.taxCategoryId : dto.taxCategoryId,
    );

    const sku = dto.sku?.trim();
    if (sku && sku !== existing.sku) {
      await this.assertSkuAvailable(sku, id);
    }

    const before = toProductDto(existing);
    let updated;
    try {
      updated = await this.repository.update(id, {
        tenantId: actor.tenantId,
        categoryId: dto.categoryId,
        taxCategoryId: dto.taxCategoryId,
        sku: dto.sku === undefined ? undefined : sku || null,
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description.trim() || null,
        priceAmount: dto.priceAmount,
        currency: dto.currency,
        fiscalName:
          dto.fiscalName === undefined ? undefined : dto.fiscalName.trim() || null,
        fiscalCodeReference:
          dto.fiscalCodeReference === undefined
            ? undefined
            : dto.fiscalCodeReference.trim() || null,
        unitMeasureCode: dto.unitMeasureCode?.trim(),
        standardCode: dto.standardCode,
        isExcluded: dto.isExcluded,
        incApplies: dto.incApplies,
        isActive: dto.isActive,
        isSellable: dto.isSellable,
        isInventoried: dto.isInventoried,
        updatedById: actor.actorUserId,
        recipeIngredients:
          dto.recipeIngredients === undefined ? undefined : normalizeRecipe(dto.recipeIngredients),
      });
    } catch (error) {
      if (isInvalidRecipeIngredient(error)) {
        throw invalidRecipeIngredient();
      }
      throw error;
    }

    const after = toProductDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    if (
      dto.priceAmount !== undefined &&
      dto.priceAmount !== existing.priceAmount
    ) {
      await this.auditService.tryRecord({
        ...auditBase(actor),
        action: 'PRODUCT_PRICE_CHANGED',
        entityType: 'Product',
        entityId: id,
        before: { priceAmount: existing.priceAmount, currency: existing.currency },
        after: { priceAmount: updated.priceAmount, currency: updated.currency },
      });
    }

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
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      before: asJson(toProductDto(existing)),
    });
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new ApplicationException(400, {
        code: 'INVALID_CATEGORY',
        message: 'The referenced product category does not exist.',
      });
    }
  }

  private async assertSkuAvailable(
    sku: string,
    ignoreProductId?: string,
  ): Promise<void> {
    const clash = await this.repository.findBySku(sku);
    if (clash && clash.id !== ignoreProductId) {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: `A product with SKU "${sku}" already exists.`,
      });
    }
  }

  private async assertTaxCategoryExists(
    tenantId: string,
    taxCategoryId: string,
  ): Promise<void> {
    const exists = await this.repository.taxCategoryExists(tenantId, taxCategoryId);
    if (!exists) {
      throw new ApplicationException(400, {
        code: 'INVALID_TAX_CATEGORY',
        message: 'The referenced tax category does not exist.',
      });
    }
  }

  private assertCoherentFiscalFlags(
    isExcluded: boolean | undefined,
    incApplies: boolean | undefined,
    taxCategoryId: string | null | undefined,
  ): void {
    if (isExcluded && incApplies) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'A product cannot be both excluded from tax and subject to INC.',
      });
    }
    if (taxCategoryId && (isExcluded || incApplies)) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'Use either a tax category or direct excluded/INC flags, not both.',
      });
    }
  }
}

function normalizeRecipe(
  recipeIngredients:
    | Array<{ ingredientId: string; quantity: number }>
    | undefined,
): Array<{ ingredientId: string; quantity: number }> | undefined {
  if (recipeIngredients === undefined) {
    return undefined;
  }

  const byIngredient = new Map<string, number>();
  for (const ingredient of recipeIngredients) {
    const ingredientId = ingredient.ingredientId.trim();
    byIngredient.set(ingredientId, (byIngredient.get(ingredientId) ?? 0) + ingredient.quantity);
  }

  return [...byIngredient.entries()].map(([ingredientId, quantity]) => ({
    ingredientId,
    quantity,
  }));
}

function isInvalidRecipeIngredient(error: unknown): boolean {
  return error instanceof Error && error.message === 'INVALID_RECIPE_INGREDIENT';
}

function invalidRecipeIngredient(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'One or more recipe ingredients do not exist for this tenant.',
  });
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
    message: 'Product was not found.',
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
