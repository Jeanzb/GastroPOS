import { Injectable } from '@nestjs/common';
import { Prisma, type PurchaseStatus, type Supplier } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { PurchaseWithDetails } from './purchase.mapper';

export interface PurchaseFilters {
  status?: PurchaseStatus;
  supplierId?: string;
  search?: string;
}

export interface CreatePurchaseItemData {
  productId: string | null;
  nameSnapshot: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface CreatePurchaseData {
  tenantId: string;
  branchId: string | null;
  supplierId: string;
  status: PurchaseStatus;
  currency: string;
  reference: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdById: string;
  items: CreatePurchaseItemData[];
}

@Injectable()
export class PurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: PurchaseFilters,
    pagination: { skip: number; take: number },
  ): Promise<PurchaseWithDetails[]> {
    return this.prisma.tenantScoped.purchase.findMany({
      where: this.scope(filters),
      include: this.includeDetails(),
      orderBy: [{ createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: PurchaseFilters): Promise<number> {
    return this.prisma.tenantScoped.purchase.count({ where: this.scope(filters) });
  }

  findById(id: string): Promise<PurchaseWithDetails | null> {
    return this.prisma.tenantScoped.purchase.findFirst({
      where: { id, deletedAt: null },
      include: this.includeDetails(),
    });
  }

  findSupplierById(id: string): Promise<Supplier | null> {
    return this.prisma.tenantScoped.supplier.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
  }

  countProductsByIds(ids: string[]): Promise<number> {
    return this.prisma.tenantScoped.product.count({
      where: { id: { in: ids }, deletedAt: null },
    });
  }

  create(data: CreatePurchaseData): Promise<PurchaseWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          supplierId: data.supplierId,
          status: data.status,
          currency: data.currency,
          reference: data.reference,
          notes: data.notes,
          subtotal: data.subtotal,
          taxTotal: data.taxTotal,
          total: data.total,
          createdById: data.createdById,
          items: {
            create: data.items.map((item) => ({
              tenantId: data.tenantId,
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: this.includeDetails(),
      });

      return created;
    });
  }

  receive(id: string): Promise<PurchaseWithDetails> {
    return this.prisma.tenantScoped.purchase.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
      },
      include: this.includeDetails(),
    });
  }

  cancel(id: string): Promise<PurchaseWithDetails> {
    return this.prisma.tenantScoped.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.includeDetails(),
    });
  }

  private includeDetails() {
    return {
      supplier: { select: { id: true, name: true } },
      items: { orderBy: { createdAt: 'asc' } },
    } satisfies Prisma.PurchaseInclude;
  }

  private scope(filters: PurchaseFilters): Prisma.PurchaseWhereInput {
    return {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: 'insensitive' } },
              { notes: { contains: filters.search, mode: 'insensitive' } },
              {
                supplier: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }
}
