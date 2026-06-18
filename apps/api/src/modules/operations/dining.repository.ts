import { Injectable } from '@nestjs/common';
import type { DiningTable, DiningTableStatus, DiningZone, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { DiningZoneWithTables } from './dining.mapper';

export interface CreateDiningZoneData {
  tenantId: string;
  branchId: string;
  name: string;
  sortOrder: number;
  createdById: string;
}

export interface UpdateDiningZoneData {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedById: string;
}

export interface CreateDiningTableData {
  tenantId: string;
  branchId: string;
  zoneId: string;
  number: string;
  seats: number;
  createdById: string;
}

export interface UpdateDiningTableData {
  number?: string;
  seats?: number;
  zoneId?: string;
  updatedById: string;
}

export interface UpdateDiningTableStatusData {
  status: DiningTableStatus;
  waiterName?: string | null;
  openedAt?: Date | null;
  reservationName?: string | null;
  reservationTime?: string | null;
  notes?: string | null;
  updatedById: string;
}

@Injectable()
export class DiningRepository {
  constructor(private readonly prisma: PrismaService) {}

  findZonesWithTables(tenantId: string, branchId: string): Promise<DiningZoneWithTables[]> {
    return this.prisma.diningZone.findMany({
      where: { tenantId, branchId, deletedAt: null, isActive: true },
      include: {
        tables: {
          where: { deletedAt: null },
          orderBy: [{ number: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findZoneById(tenantId: string, id: string, branchId: string): Promise<DiningZone | null> {
    return this.prisma.diningZone.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
    });
  }

  findZoneByName(tenantId: string, name: string, branchId: string): Promise<DiningZone | null> {
    return this.prisma.diningZone.findFirst({
      where: { name, tenantId, branchId, deletedAt: null },
    });
  }

  createZone(data: CreateDiningZoneData): Promise<DiningZone> {
    return this.prisma.diningZone.create({
      data: data as Prisma.DiningZoneUncheckedCreateInput,
    });
  }

  async updateZone(
    tenantId: string,
    id: string,
    branchId: string,
    data: UpdateDiningZoneData,
  ): Promise<DiningZone | null> {
    const result = await this.prisma.diningZone.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.findZoneById(tenantId, id, branchId);
  }

  findTableById(tenantId: string, id: string, branchId: string): Promise<DiningTable | null> {
    return this.prisma.diningTable.findFirst({
      where: { id, tenantId, branchId, deletedAt: null },
    });
  }

  findTableByNumber(
    tenantId: string,
    number: string,
    branchId: string,
  ): Promise<DiningTable | null> {
    return this.prisma.diningTable.findFirst({
      where: { number, tenantId, branchId, deletedAt: null },
    });
  }

  createTable(data: CreateDiningTableData): Promise<DiningTable> {
    return this.prisma.diningTable.create({
      data: data as Prisma.DiningTableUncheckedCreateInput,
    });
  }

  async updateTable(
    tenantId: string,
    id: string,
    branchId: string,
    data: UpdateDiningTableData,
  ): Promise<DiningTable | null> {
    const result = await this.prisma.diningTable.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.findTableById(tenantId, id, branchId);
  }

  async updateTableStatus(
    tenantId: string,
    id: string,
    branchId: string,
    data: UpdateDiningTableStatusData,
  ): Promise<DiningTable | null> {
    const result = await this.prisma.diningTable.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data,
    });
    if (result.count === 0) {
      return null;
    }
    return this.findTableById(tenantId, id, branchId);
  }

  async softDeleteZone(
    tenantId: string,
    id: string,
    branchId: string,
    deletedById: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.diningZone.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data: { deletedAt: now, isActive: false, updatedById: deletedById },
    });
    if (result.count === 0) {
      return false;
    }
    await this.prisma.diningTable.updateMany({
      where: { zoneId: id, tenantId, branchId, deletedAt: null },
      data: { deletedAt: now, updatedById: deletedById },
    });
    return true;
  }

  async softDeleteTable(
    tenantId: string,
    id: string,
    branchId: string,
    deletedById: string,
  ): Promise<boolean> {
    const result = await this.prisma.diningTable.updateMany({
      where: { id, tenantId, branchId, deletedAt: null },
      data: { deletedAt: new Date(), updatedById: deletedById },
    });
    return result.count > 0;
  }
}
