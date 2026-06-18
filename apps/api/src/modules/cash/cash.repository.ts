import { Injectable } from '@nestjs/common';
import {
  CashMovementType,
  CashSessionStatus,
  Prisma,
  type CashMovement,
  type CashSession,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

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
