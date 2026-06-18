import { Injectable } from '@nestjs/common';
import type { CashMovementDto, CashSessionDto } from '@gastroai/contracts';
import {
  CashMovementType,
  type CashMovement,
  type CashSession,
  type Prisma,
} from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CashRepository } from './cash.repository';
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
    const branchId = dto.branchId ?? ctx.branchId;
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
    const resolvedBranchId = branchId ?? ctx.branchId;
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

  async listMovements(_ctx: TenantRequestContext, sessionId: string): Promise<CashMovementDto[]> {
    await this.requireSession(sessionId);
    const movements = await this.repository.listMovements(sessionId);
    return movements.map(toCashMovementDto);
  }

  async registerMovement(
    ctx: TenantRequestContext,
    sessionId: string,
    dto: RegisterCashMovementDto,
  ): Promise<CashMovementDto> {
    const session = await this.requireOpenSession(sessionId);

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
    const session = await this.requireOpenSession(sessionId);
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

  private async requireOpenSession(sessionId: string): Promise<CashSession> {
    const session = await this.requireSession(sessionId);
    if (session.status !== 'OPEN') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'The cash session is already closed.',
      });
    }
    return session;
  }

  private async requireSession(sessionId: string): Promise<CashSession> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Cash session was not found.',
      });
    }
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
