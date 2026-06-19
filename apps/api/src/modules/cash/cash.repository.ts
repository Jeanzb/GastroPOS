import { Injectable } from '@nestjs/common';
import {
  CashMovementType,
  CashSessionStatus,
  Prisma,
  SaleStatus,
  type CashMovement,
  type CashSession,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

const CASH_Z_SESSION_INCLUDE = {
  branch: {
    select: { id: true, name: true, code: true },
  },
  movements: {
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.CashSessionInclude;

const CASH_Z_SALE_INCLUDE = {
  items: true,
  payments: true,
} satisfies Prisma.SaleInclude;

export type CashZSessionRecord = Prisma.CashSessionGetPayload<{
  include: typeof CASH_Z_SESSION_INCLUDE;
}>;

export type CashZSaleRecord = Prisma.SaleGetPayload<{
  include: typeof CASH_Z_SALE_INCLUDE;
}>;

export interface CreateSessionData {
  branchId: string;
  openingBalance: number;
  currency: string;
  notes: string | null;
  openedById: string;
}

export interface CreateMovementData {
  cashSessionId: string;
  branchId: string;
  type: CashMovementType;
  amount: number;
  reference: string | null;
  notes: string | null;
  createdById: string;
}

export interface CloseSessionData {
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  notes: string | null;
  closedById: string;
}

@Injectable()
export class CashRepository {
  constructor(private readonly prisma: PrismaService) {}

  async branchExists(tenantId: string, branchId: string): Promise<boolean> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return Boolean(branch);
  }

  findActiveByBranch(branchId: string): Promise<CashSession | null> {
    return this.prisma.tenantScoped.cashSession.findFirst({
      where: { branchId, status: CashSessionStatus.OPEN },
    });
  }

  findById(id: string): Promise<CashSession | null> {
    return this.prisma.tenantScoped.cashSession.findFirst({ where: { id } });
  }

  findZSessionById(id: string): Promise<CashZSessionRecord | null> {
    return this.prisma.tenantScoped.cashSession.findFirst({
      where: { id },
      include: CASH_Z_SESSION_INCLUDE,
    });
  }

  findClosedSalesForShift(
    tenantId: string,
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<CashZSaleRecord[]> {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        status: SaleStatus.CLOSED,
        closedAt: { gte: from, lte: to },
      },
      include: CASH_Z_SALE_INCLUDE,
      orderBy: { closedAt: 'asc' },
    });
  }

  listMovements(cashSessionId: string): Promise<CashMovement[]> {
    return this.prisma.tenantScoped.cashMovement.findMany({
      where: { cashSessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async openSession(data: CreateSessionData): Promise<CashSession> {
    return this.prisma.tenantScoped.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          branchId: data.branchId,
          openingBalance: data.openingBalance,
          currency: data.currency,
          notes: data.notes,
          openedById: data.openedById,
        } as Prisma.CashSessionUncheckedCreateInput,
      });

      await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          branchId: data.branchId,
          type: CashMovementType.OPENING_BALANCE,
          amount: data.openingBalance,
          createdById: data.openedById,
        } as Prisma.CashMovementUncheckedCreateInput,
      });

      return session;
    });
  }

  createMovement(data: CreateMovementData): Promise<CashMovement> {
    return this.prisma.tenantScoped.cashMovement.create({
      data: data as Prisma.CashMovementUncheckedCreateInput,
    });
  }

  closeSession(id: string, data: CloseSessionData): Promise<CashSession> {
    return this.prisma.tenantScoped.cashSession.update({
      where: { id },
      data: {
        status: CashSessionStatus.CLOSED,
        expectedAmount: data.expectedAmount,
        countedAmount: data.countedAmount,
        difference: data.difference,
        notes: data.notes,
        closedById: data.closedById,
        closedAt: new Date(),
      },
    });
  }
}
