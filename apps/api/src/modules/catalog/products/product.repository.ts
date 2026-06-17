import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma, Product } from '../../../../generated/prisma';

export interface ProductFilters {
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}

export interface CreateProductData {
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
    filters: ProductFilters,
    pagination: { skip: number; take: number },
  ): Promise<Product[]> {
    return this.prisma.tenantScoped.product.findMany({
      where: this.scope(filters),
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: ProductFilters): Promise<number> {
    return this.prisma.tenantScoped.product.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.tenantScoped.product.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.prisma.tenantScoped.product.findFirst({
      where: { sku, deletedAt: null },
    });
  }

  create(data: CreateProductData): Promise<Product> {
    return this.prisma.tenantScoped.product.create({
      data: data as Prisma.ProductUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateProductData): Promise<Product> {
    return this.prisma.tenantScoped.product.update({ where: { id }, data });
  }

  softDelete(id: string, deletedById: string): Promise<Product> {
    return this.prisma.tenantScoped.product.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
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
