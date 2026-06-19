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

export type CashZReportPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export interface CashZReportPaymentMethodDto {
  method: CashZReportPaymentMethod;
  amount: number;
  count: number;
}

export interface CashZReportMovementDto {
  id: string;
  type: Exclude<CashMovementType, 'OPENING_BALANCE' | 'SALE_PAYMENT'>;
  amount: number;
  signedAmount: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CashZReportTopProductDto {
  name: string;
  quantity: number;
  total: number;
}

export interface CashZReportDto {
  id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  status: CashSessionStatus;
  currency: string;
  timezone: string;
  operationalDate: string;
  businessDayStartsAtHour: number;
  openedAt: string;
  closedAt: string | null;
  openedById: string;
  closedById: string | null;
  openingBalance: number;
  expectedAmount: number;
  countedAmount: number | null;
  difference: number | null;
  totalSales: number;
  ticketCount: number;
  averageTicket: number;
  itemsSold: number;
  invoicedCount: number;
  byMethod: CashZReportPaymentMethodDto[];
  movements: CashZReportMovementDto[];
  topProducts: CashZReportTopProductDto[];
  generatedAt: string;
}
