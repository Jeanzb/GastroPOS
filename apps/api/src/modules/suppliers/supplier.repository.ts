import { Injectable } from '@nestjs/common';
import { Prisma, type Supplier } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

export interface SupplierFilters {
  isActive?: boolean;
  search?: string;
}

export interface CreateSupplierData {
  name: string;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdById: string;
}

export interface UpdateSupplierData {
  name?: string;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
  updatedById: string;
}

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: SupplierFilters,
    pagination: { skip: number; take: number },
  ): Promise<Supplier[]> {
    return this.prisma.tenantScoped.supplier.findMany({
      where: this.scope(filters),
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: SupplierFilters): Promise<number> {
    return this.prisma.tenantScoped.supplier.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<Supplier | null> {
    return this.prisma.tenantScoped.supplier.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findByName(name: string): Promise<Supplier | null> {
    return this.prisma.tenantScoped.supplier.findFirst({
      where: { name, deletedAt: null },
    });
  }

  create(data: CreateSupplierData): Promise<Supplier> {
    return this.prisma.tenantScoped.supplier.create({
      data: data as Prisma.SupplierUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    return this.prisma.tenantScoped.supplier.update({ where: { id }, data });
  }

  softDelete(id: string, deletedById: string): Promise<Supplier> {
    return this.prisma.tenantScoped.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
  }

  private scope(filters: SupplierFilters): Prisma.SupplierWhereInput {
    return {
      deletedAt: null,
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                documentNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
