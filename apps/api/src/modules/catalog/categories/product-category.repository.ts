import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma, ProductCategory } from '../../../../generated/prisma';

export interface ProductCategoryFilters {
  isActive?: boolean;
  search?: string;
}

export interface CreateProductCategoryData {
  tenantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdById: string;
}

export interface UpdateProductCategoryData {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedById: string;
}

@Injectable()
export class ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    filters: ProductCategoryFilters,
    pagination: { skip: number; take: number },
  ): Promise<ProductCategory[]> {
    return this.prisma.productCategory.findMany({
      where: this.scope(tenantId, filters),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(tenantId: string, filters: ProductCategoryFilters): Promise<number> {
    return this.prisma.productCategory.count({
      where: this.scope(tenantId, filters),
    });
  }

  findById(tenantId: string, id: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  findByName(tenantId: string, name: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findFirst({
      where: { tenantId, name, deletedAt: null },
    });
  }

  create(data: CreateProductCategoryData): Promise<ProductCategory> {
    return this.prisma.productCategory.create({ data });
  }

  update(id: string, data: UpdateProductCategoryData): Promise<ProductCategory> {
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  softDelete(id: string, deletedById: string): Promise<ProductCategory> {
    return this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
  }

  private scope(
    tenantId: string,
    filters: ProductCategoryFilters,
  ): Prisma.ProductCategoryWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
  }
}
