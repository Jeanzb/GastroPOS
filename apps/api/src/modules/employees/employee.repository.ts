import { Injectable } from '@nestjs/common';
import { Prisma, type Branch, type UserRole } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { EmployeeWithBranch } from './employee.mapper';

export interface EmployeeFilters {
  tenantId: string;
  role?: UserRole;
  isActive?: boolean;
  branchId?: string;
  search?: string;
}

export interface CreateEmployeeData {
  tenantId: string;
  branchId: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdById: string;
}

export interface UpdateEmployeeData {
  branchId?: string | null;
  email?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  updatedById: string;
}

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    filters: EmployeeFilters,
    pagination: { skip: number; take: number },
  ): Promise<EmployeeWithBranch[]> {
    return this.prisma.user.findMany({
      where: this.scope(filters),
      include: this.includeBranch(),
      orderBy: [{ fullName: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });
  }

  count(filters: EmployeeFilters): Promise<number> {
    return this.prisma.user.count({ where: this.scope(filters) });
  }

  findById(tenantId: string, id: string): Promise<EmployeeWithBranch | null> {
    return this.prisma.user.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: this.includeBranch(),
    });
  }

  findByEmail(tenantId: string, email: string): Promise<EmployeeWithBranch | null> {
    return this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
      include: this.includeBranch(),
    });
  }

  findBranchById(tenantId: string, branchId: string): Promise<Branch | null> {
    return this.prisma.branch.findFirst({
      where: { tenantId, id: branchId, deletedAt: null, isActive: true },
    });
  }

  create(data: CreateEmployeeData): Promise<EmployeeWithBranch> {
    return this.prisma.user.create({
      data,
      include: this.includeBranch(),
    });
  }

  update(
    tenantId: string,
    id: string,
    data: UpdateEmployeeData,
  ): Promise<EmployeeWithBranch> {
    return this.prisma.user.update({
      where: { id, tenantId },
      data,
      include: this.includeBranch(),
    });
  }

  /** Active employees in a branch that already have a PIN (for uniqueness checks). */
  findPinnedInBranch(
    tenantId: string,
    branchId: string,
    excludeUserId?: string,
  ): Promise<Array<{ id: string; pinHash: string }>> {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
        isActive: true,
        pinHash: { not: null },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, pinHash: true },
    }) as Promise<Array<{ id: string; pinHash: string }>>;
  }

  setPin(
    tenantId: string,
    id: string,
    pinHash: string,
    actorUserId: string,
  ): Promise<EmployeeWithBranch> {
    return this.prisma.user.update({
      where: { id, tenantId },
      data: {
        pinHash,
        pinUpdatedAt: new Date(),
        failedPinAttempts: 0,
        pinLockedUntil: null,
        updatedById: actorUserId,
      },
      include: this.includeBranch(),
    });
  }

  softDelete(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<EmployeeWithBranch> {
    return this.prisma.user.update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedById: actorUserId,
      },
      include: this.includeBranch(),
    });
  }

  private includeBranch() {
    return {
      branch: { select: { id: true, name: true } },
    } satisfies Prisma.UserInclude;
  }

  private scope(filters: EmployeeFilters): Prisma.UserWhereInput {
    return {
      tenantId: filters.tenantId,
      deletedAt: null,
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
