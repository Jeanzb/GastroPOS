import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Customer,
  type CustomerDocumentType,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

export interface CustomerFilters {
  isActive?: boolean;
  search?: string;
}

export interface CreateCustomerData {
  documentType: CustomerDocumentType;
  documentNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipality: string | null;
  taxResponsibility: string | null;
  isActive: boolean;
  createdById: string;
}

export interface UpdateCustomerData {
  documentType?: CustomerDocumentType;
  documentNumber?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  municipality?: string | null;
  taxResponsibility?: string | null;
  isActive?: boolean;
  updatedById: string;
}

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: CustomerFilters,
    pagination: { skip: number; take: number },
  ): Promise<Customer[]> {
    return this.prisma.tenantScoped.customer.findMany({
      where: this.scope(filters),
      orderBy: [{ name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: CustomerFilters): Promise<number> {
    return this.prisma.tenantScoped.customer.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<Customer | null> {
    return this.prisma.tenantScoped.customer.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findByDocument(
    documentType: CustomerDocumentType,
    documentNumber: string,
  ): Promise<Customer | null> {
    return this.prisma.tenantScoped.customer.findFirst({
      where: { documentType, documentNumber, deletedAt: null },
    });
  }

  create(data: CreateCustomerData): Promise<Customer> {
    return this.prisma.tenantScoped.customer.create({
      data: data as Prisma.CustomerUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateCustomerData): Promise<Customer> {
    return this.prisma.tenantScoped.customer.update({ where: { id }, data });
  }

  softDelete(id: string, deletedById: string): Promise<Customer> {
    return this.prisma.tenantScoped.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
  }

  private scope(filters: CustomerFilters): Prisma.CustomerWhereInput {
    return {
      deletedAt: null,
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { documentNumber: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
