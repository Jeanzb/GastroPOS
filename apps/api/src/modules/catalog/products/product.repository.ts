import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma } from '../../../../generated/prisma';
import type { ProductWithInventory } from './product.mapper';

export interface ProductFilters {
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}

export interface CreateProductData {
  tenantId: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  isActive: boolean;
  isSellable: boolean;
  isInventoried: boolean;
  createdById: string;
  recipeIngredients?: Array<{ ingredientId: string; quantity: number }>;
}

export interface UpdateProductData {
  tenantId: string;
  categoryId?: string | null;
  sku?: string | null;
  name?: string;
  description?: string | null;
  priceAmount?: number;
  currency?: string;
  isActive?: boolean;
  isSellable?: boolean;
  isInventoried?: boolean;
  updatedById: string;
  recipeIngredients?: Array<{ ingredientId: string; quantity: number }>;
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: ProductFilters,
    pagination: { skip: number; take: number },
  ): Promise<ProductWithInventory[]> {
    return this.prisma.tenantScoped.product.findMany({
      where: this.scope(filters),
      include: PRODUCT_INCLUDE,
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: ProductFilters): Promise<number> {
    return this.prisma.tenantScoped.product.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<ProductWithInventory | null> {
    return this.prisma.tenantScoped.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
  }

  findBySku(sku: string): Promise<ProductWithInventory | null> {
    return this.prisma.tenantScoped.product.findFirst({
      where: { sku, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
  }

  create(data: CreateProductData): Promise<ProductWithInventory> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertRecipeIngredientsBelongToTenant(tx, data.tenantId, data.recipeIngredients);
      const product = await tx.product.create({
        data: {
          tenantId: data.tenantId,
          categoryId: data.categoryId,
          sku: data.sku,
          name: data.name,
          description: data.description,
          priceAmount: data.priceAmount,
          currency: data.currency,
          isActive: data.isActive,
          isSellable: data.isSellable,
          isInventoried: data.isInventoried,
          createdById: data.createdById,
        },
      });

      await this.replaceRecipe(tx, {
        tenantId: data.tenantId,
        productId: product.id,
        recipeIngredients: data.recipeIngredients,
        actorUserId: data.createdById,
      });

      return this.findByIdInTx(tx, data.tenantId, product.id);
    });
  }

  update(id: string, data: UpdateProductData): Promise<ProductWithInventory> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertRecipeIngredientsBelongToTenant(tx, data.tenantId, data.recipeIngredients);

      await tx.product.updateMany({
        where: { id, tenantId: data.tenantId, deletedAt: null },
        data: {
          categoryId: data.categoryId,
          sku: data.sku,
          name: data.name,
          description: data.description,
          priceAmount: data.priceAmount,
          currency: data.currency,
          isActive: data.isActive,
          isSellable: data.isSellable,
          isInventoried: data.isInventoried,
          updatedById: data.updatedById,
        },
      });

      await this.replaceRecipe(tx, {
        tenantId: data.tenantId,
        productId: id,
        recipeIngredients: data.recipeIngredients,
        actorUserId: data.updatedById,
      });

      return this.findByIdInTx(tx, data.tenantId, id);
    });
  }

  softDelete(id: string, deletedById: string): Promise<ProductWithInventory> {
    return this.prisma.tenantScoped.product.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
      include: PRODUCT_INCLUDE,
    });
  }

  private async findByIdInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<ProductWithInventory> {
    const product = await tx.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new Error('Product was saved but could not be loaded.');
    }
    return product;
  }

  private async replaceRecipe(
    tx: Prisma.TransactionClient,
    data: {
      tenantId: string;
      productId: string;
      recipeIngredients?: Array<{ ingredientId: string; quantity: number }>;
      actorUserId: string;
    },
  ): Promise<void> {
    if (data.recipeIngredients === undefined) {
      return;
    }

    if (data.recipeIngredients.length === 0) {
      await tx.productRecipe.updateMany({
        where: { tenantId: data.tenantId, productId: data.productId, deletedAt: null },
        data: { isActive: false, deletedAt: new Date(), updatedById: data.actorUserId },
      });
      return;
    }

    const recipe = await tx.productRecipe.upsert({
      where: { tenantId_productId: { tenantId: data.tenantId, productId: data.productId } },
      update: {
        isActive: true,
        deletedAt: null,
        updatedById: data.actorUserId,
      },
      create: {
        tenantId: data.tenantId,
        productId: data.productId,
        isActive: true,
        createdById: data.actorUserId,
      },
    });

    await tx.productRecipeIngredient.deleteMany({
      where: { tenantId: data.tenantId, recipeId: recipe.id },
    });
    await tx.productRecipeIngredient.createMany({
      data: data.recipeIngredients.map((ingredient) => ({
        tenantId: data.tenantId,
        recipeId: recipe.id,
        ingredientId: ingredient.ingredientId,
        quantity: ingredient.quantity,
        createdById: data.actorUserId,
        updatedById: data.actorUserId,
      })),
    });
  }

  private async assertRecipeIngredientsBelongToTenant(
    tx: Prisma.TransactionClient,
    tenantId: string,
    recipeIngredients?: Array<{ ingredientId: string; quantity: number }>,
  ): Promise<void> {
    if (!recipeIngredients?.length) {
      return;
    }

    const uniqueIngredientIds = [...new Set(recipeIngredients.map((item) => item.ingredientId))];
    const count = await tx.inventoryIngredient.count({
      where: {
        tenantId,
        id: { in: uniqueIngredientIds },
        isActive: true,
        deletedAt: null,
      },
    });
    if (count !== uniqueIngredientIds.length) {
      throw new Error('INVALID_RECIPE_INGREDIENT');
    }
  }

  private scope(filters: ProductFilters): Prisma.ProductWhereInput {
    return {
      deletedAt: null,
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
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
}

const PRODUCT_INCLUDE = {
  inventoryIngredients: {
    where: { deletedAt: null },
    include: {
      baseUnit: { select: { code: true } },
      balances: { where: { deletedAt: null }, select: { id: true }, take: 1 },
    },
    take: 1,
  },
  recipes: {
    where: { deletedAt: null },
    take: 1,
    include: {
      ingredients: {
        orderBy: { createdAt: 'asc' },
        include: {
          ingredient: {
            include: {
              baseUnit: { select: { code: true } },
              balances: { where: { deletedAt: null }, select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;
