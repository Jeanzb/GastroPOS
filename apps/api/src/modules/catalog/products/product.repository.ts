import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma, Product } from '../../../../generated/prisma';

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
}

export interface UpdateProductData {
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
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    filters: ProductFilters,
    pagination: { skip: number; take: number },
  ): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: this.scope(tenantId, filters),
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(tenantId: string, filters: ProductFilters): Promise<number> {
    return this.prisma.product.count({ where: this.scope(tenantId, filters) });
  }

  findById(tenantId: string, id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  findBySku(tenantId: string, sku: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { tenantId, sku, deletedAt: null },
    });
  }

  create(data: CreateProductData): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: UpdateProductData): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  softDelete(id: string, deletedById: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
  }

  private scope(
    tenantId: string,
    filters: ProductFilters,
  ): Prisma.ProductWhereInput {
    return {
      tenantId,
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
