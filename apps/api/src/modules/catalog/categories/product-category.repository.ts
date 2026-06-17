import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma, ProductCategory } from '../../../../generated/prisma';

export interface ProductCategoryFilters {
  isActive?: boolean;
  search?: string;
}

export interface CreateProductCategoryData {
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
    filters: ProductCategoryFilters,
    pagination: { skip: number; take: number },
  ): Promise<ProductCategory[]> {
    return this.prisma.tenantScoped.productCategory.findMany({
      where: this.scope(filters),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: ProductCategoryFilters): Promise<number> {
    return this.prisma.tenantScoped.productCategory.count({
      where: this.scope(filters),
    });
  }

  findById(id: string): Promise<ProductCategory | null> {
    return this.prisma.tenantScoped.productCategory.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findByName(name: string): Promise<ProductCategory | null> {
    return this.prisma.tenantScoped.productCategory.findFirst({
      where: { name, deletedAt: null },
    });
  }

  create(data: CreateProductCategoryData): Promise<ProductCategory> {
    return this.prisma.tenantScoped.productCategory.create({
      data: data as Prisma.ProductCategoryUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateProductCategoryData): Promise<ProductCategory> {
    return this.prisma.tenantScoped.productCategory.update({
      where: { id },
      data,
    });
  }

  softDelete(id: string, deletedById: string): Promise<ProductCategory> {
    return this.prisma.tenantScoped.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
  }

  private scope(
    filters: ProductCategoryFilters,
  ): Prisma.ProductCategoryWhereInput {
    return {
      deletedAt: null,
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
  }
}
