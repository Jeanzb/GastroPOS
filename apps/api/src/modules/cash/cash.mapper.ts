import type { CashMovementDto, CashSessionDto } from '@gastroai/contracts';
import type { CashMovement, CashSession } from '../../../generated/prisma';

export function toCashSessionDto(session: CashSession): CashSessionDto {
  return {
    id: session.id,
    branchId: session.branchId,
    status: session.status,
    currency: session.currency,
    openingBalance: session.openingBalance,
    expectedAmount: session.expectedAmount,
    countedAmount: session.countedAmount,
    difference: session.difference,
    notes: session.notes,
    openedById: session.openedById,
    closedById: session.closedById,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
  };
}

export function toCashMovementDto(movement: CashMovement): CashMovementDto {
  return {
    id: movement.id,
    cashSessionId: movement.cashSessionId,
    type: movement.type,
    amount: movement.amount,
    reference: movement.reference,
    notes: movement.notes,
    createdAt: movement.createdAt.toISOString(),
  };
}
