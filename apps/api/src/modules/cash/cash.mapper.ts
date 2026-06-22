import type {
  CashMovementDto,
  CashSessionDto,
  CashZReportPaymentMethodDto,
} from '@gastroai/contracts';
import type { CashMovement, CashSession } from '../../../generated/prisma';

export interface CashSessionTotals {
  cashExpectedAmount: number;
  bankedExpectedAmount: number;
  totalExpectedAmount: number;
  paymentsByMethod: CashZReportPaymentMethodDto[];
}

const EMPTY_TOTALS: CashSessionTotals = {
  cashExpectedAmount: 0,
  bankedExpectedAmount: 0,
  totalExpectedAmount: 0,
  paymentsByMethod: [],
};

export function toCashSessionDto(
  session: CashSession,
  totals: CashSessionTotals = EMPTY_TOTALS,
): CashSessionDto {
  const cashExpectedAmount =
    totals === EMPTY_TOTALS ? (session.expectedAmount ?? 0) : totals.cashExpectedAmount;

  return {
    id: session.id,
    branchId: session.branchId,
    status: session.status,
    currency: session.currency,
    openingBalance: session.openingBalance,
    expectedAmount: session.expectedAmount,
    cashExpectedAmount,
    bankedExpectedAmount: totals.bankedExpectedAmount,
    totalExpectedAmount: totals.totalExpectedAmount || cashExpectedAmount,
    paymentsByMethod: totals.paymentsByMethod,
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
