export type CashSessionStatus = 'OPEN' | 'CLOSED';

export type CashMovementType =
  | 'OPENING_BALANCE'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'SALE_PAYMENT'
  | 'REFUND'
  | 'TIP'
  | 'ADJUSTMENT';

export interface CashMovementDto {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  /** Amount in integer minor units of the session currency. Never float. */
  amount: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CashSessionDto {
  id: string;
  branchId: string;
  status: CashSessionStatus;
  currency: string;
  openingBalance: number;
  expectedAmount: number | null;
  countedAmount: number | null;
  difference: number | null;
  notes: string | null;
  openedById: string;
  closedById: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface OpenCashSessionPayload {
  openingBalance: number;
  branchId?: string;
  notes?: string;
}

export interface RegisterCashMovementPayload {
  type: Exclude<CashMovementType, 'OPENING_BALANCE'>;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CloseCashSessionPayload {
  countedAmount: number;
  notes?: string;
}
