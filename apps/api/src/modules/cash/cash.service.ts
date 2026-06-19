import { Injectable } from '@nestjs/common';
import type {
  CashMovementDto,
  CashSessionDto,
  CashZReportDto,
  CashZReportMovementDto,
  CashZReportPaymentMethod,
  CashZReportPaymentMethodDto,
  CashZReportTopProductDto,
} from '@gastroai/contracts';
import {
  CashMovementType,
  type CashMovement,
  type CashSession,
  type Prisma,
} from '../../../generated/prisma';
import { assertBranchAccess } from '../../common/access/branch-access';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CashRepository } from './cash.repository';
import type { CashZSaleRecord, CashZSessionRecord } from './cash.repository';
import { toCashMovementDto, toCashSessionDto } from './cash.mapper';
import type { CloseCashSessionDto } from './dto/close-cash-session.dto';
import type { OpenCashSessionDto } from './dto/open-cash-session.dto';
import type { RegisterCashMovementDto } from './dto/register-cash-movement.dto';

const MOVEMENT_SIGN: Record<CashMovementType, 1 | -1> = {
  OPENING_BALANCE: 1,
  CASH_IN: 1,
  SALE_PAYMENT: 1,
  TIP: 1,
  ADJUSTMENT: 1,
  CASH_OUT: -1,
  REFUND: -1,
};

@Injectable()
export class CashService {
  constructor(
    private readonly repository: CashRepository,
    private readonly auditService: AuditService,
  ) {}

  async openSession(ctx: TenantRequestContext, dto: OpenCashSessionDto): Promise<CashSessionDto> {
    const branchId = assertBranchAccess(ctx, dto.branchId);
    if (!branchId) {
      throw branchRequired();
    }
    await this.assertBranchBelongsToTenant(ctx.tenantId, branchId);

    const active = await this.repository.findActiveByBranch(branchId);
    if (active) {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'This branch already has an open cash session.',
      });
    }

    const session = await this.repository.openSession({
      branchId,
      openingBalance: dto.openingBalance,
      currency: 'COP',
      notes: dto.notes?.trim() || null,
      openedById: ctx.actorUserId,
    });

    const result = toCashSessionDto(session);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CASH_SESSION_OPENED',
      entityType: 'CashSession',
      entityId: session.id,
      after: asJson(result),
    });

    return result;
  }

  async getActiveSession(ctx: TenantRequestContext, branchId?: string): Promise<CashSessionDto> {
    const resolvedBranchId = assertBranchAccess(ctx, branchId);
    if (!resolvedBranchId) {
      throw branchRequired();
    }
    await this.assertBranchBelongsToTenant(ctx.tenantId, resolvedBranchId);

    const session = await this.repository.findActiveByBranch(resolvedBranchId);
    if (!session) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'There is no open cash session for this branch.',
      });
    }

    return toCashSessionDto(session);
  }

  async listMovements(ctx: TenantRequestContext, sessionId: string): Promise<CashMovementDto[]> {
    await this.requireSession(ctx, sessionId);
    const movements = await this.repository.listMovements(sessionId);
    return movements.map(toCashMovementDto);
  }

  async registerMovement(
    ctx: TenantRequestContext,
    sessionId: string,
    dto: RegisterCashMovementDto,
  ): Promise<CashMovementDto> {
    const session = await this.requireOpenSession(ctx, sessionId);

    const movement = await this.repository.createMovement({
      cashSessionId: session.id,
      branchId: session.branchId,
      type: dto.type,
      amount: dto.amount,
      reference: dto.reference?.trim() || null,
      notes: dto.notes?.trim() || null,
      createdById: ctx.actorUserId,
    });

    const result = toCashMovementDto(movement);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CASH_MOVEMENT_REGISTERED',
      entityType: 'CashMovement',
      entityId: movement.id,
      after: asJson(result),
    });

    return result;
  }

  async closeSession(
    ctx: TenantRequestContext,
    sessionId: string,
    dto: CloseCashSessionDto,
  ): Promise<CashSessionDto> {
    const session = await this.requireOpenSession(ctx, sessionId);
    const movements = await this.repository.listMovements(session.id);
    const expectedAmount = movements.reduce(
      (total, movement) => total + MOVEMENT_SIGN[movement.type] * movement.amount,
      0,
    );
    const difference = dto.countedAmount - expectedAmount;

    const closed = await this.repository.closeSession(session.id, {
      expectedAmount,
      countedAmount: dto.countedAmount,
      difference,
      notes: dto.notes?.trim() || null,
      closedById: ctx.actorUserId,
    });

    const result = toCashSessionDto(closed);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CASH_SESSION_CLOSED',
      entityType: 'CashSession',
      entityId: session.id,
      after: asJson(result),
      metadata: { expectedAmount, countedAmount: dto.countedAmount, difference },
    });

    return result;
  }

  async getZReport(ctx: TenantRequestContext, sessionId: string): Promise<CashZReportDto> {
    const session = await this.requireZSession(ctx, sessionId);
    if (session.status !== 'CLOSED') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'The Z report is available after the cash session is closed.',
      });
    }

    const closedAt = session.closedAt ?? new Date();
    const sales = await this.repository.findClosedSalesForShift(
      ctx.tenantId,
      session.branchId,
      session.openedAt,
      closedAt,
    );

    return buildZReport(session, sales);
  }

  private async requireOpenSession(
    ctx: TenantRequestContext,
    sessionId: string,
  ): Promise<CashSession> {
    const session = await this.requireSession(ctx, sessionId);
    if (session.status !== 'OPEN') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'The cash session is already closed.',
      });
    }
    return session;
  }

  private async requireSession(
    ctx: TenantRequestContext,
    sessionId: string,
  ): Promise<CashSession> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Cash session was not found.',
      });
    }
    assertBranchAccess(ctx, session.branchId);
    await this.assertBranchBelongsToTenant(ctx.tenantId, session.branchId);
    return session;
  }

  private async requireZSession(
    ctx: TenantRequestContext,
    sessionId: string,
  ): Promise<CashZSessionRecord> {
    const session = await this.repository.findZSessionById(sessionId);
    if (!session) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Cash session was not found.',
      });
    }
    assertBranchAccess(ctx, session.branchId);
    await this.assertBranchBelongsToTenant(ctx.tenantId, session.branchId);
    return session;
  }

  private async assertBranchBelongsToTenant(tenantId: string, branchId: string): Promise<void> {
    const exists = await this.repository.branchExists(tenantId, branchId);
    if (!exists) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Branch was not found for this tenant.',
      });
    }
  }
}

function auditBase(ctx: TenantRequestContext) {
  return {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    actorUserId: ctx.actorUserId,
  };
}

function branchRequired(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'A branch is required to operate the cash register.',
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildZReport(session: CashZSessionRecord, sales: CashZSaleRecord[]): CashZReportDto {
  const methodMap = new Map<CashZReportPaymentMethod, CashZReportPaymentMethodDto>();
  const productMap = new Map<string, CashZReportTopProductDto>();
  let totalSales = 0;
  let itemsSold = 0;
  let invoicedCount = 0;
  let currency = session.currency;

  for (const sale of sales) {
    totalSales += sale.grandTotal;
    if (sale.currency) {
      currency = sale.currency;
    }
    if (sale.requiresInvoice) {
      invoicedCount += 1;
    }

    for (const payment of sale.payments) {
      const method = payment.method as CashZReportPaymentMethod;
      const entry = methodMap.get(method) ?? { method, amount: 0, count: 0 };
      entry.amount += payment.amount;
      entry.count += 1;
      methodMap.set(method, entry);
    }

    for (const item of sale.items) {
      itemsSold += item.quantity;
      const entry = productMap.get(item.nameSnapshot) ?? {
        name: item.nameSnapshot,
        quantity: 0,
        total: 0,
      };
      entry.quantity += item.quantity;
      entry.total += item.lineTotal;
      productMap.set(item.nameSnapshot, entry);
    }
  }

  const expectedAmount =
    session.expectedAmount ??
    session.movements.reduce(
      (total, movement) => total + MOVEMENT_SIGN[movement.type] * movement.amount,
      0,
    );

  const movements = session.movements
    .filter(
      (movement) =>
        movement.type !== CashMovementType.OPENING_BALANCE &&
        movement.type !== CashMovementType.SALE_PAYMENT,
    )
    .map<CashZReportMovementDto>((movement) => ({
      id: movement.id,
      type: movement.type as CashZReportMovementDto['type'],
      amount: movement.amount,
      signedAmount: MOVEMENT_SIGN[movement.type] * movement.amount,
      reference: movement.reference,
      notes: movement.notes,
      createdAt: movement.createdAt.toISOString(),
    }));

  const ticketCount = sales.length;

  return {
    id: session.id,
    branchId: session.branchId,
    branchName: session.branch.name,
    branchCode: session.branch.code,
    status: session.status,
    currency,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openedById: session.openedById,
    closedById: session.closedById,
    openingBalance: session.openingBalance,
    expectedAmount,
    countedAmount: session.countedAmount,
    difference: session.difference,
    totalSales,
    ticketCount,
    averageTicket: ticketCount > 0 ? Math.round(totalSales / ticketCount) : 0,
    itemsSold,
    invoicedCount,
    byMethod: [...methodMap.values()].sort((a, b) => b.amount - a.amount),
    movements,
    topProducts: [...productMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
