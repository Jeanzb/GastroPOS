export type ReportPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export interface SalesSummaryByMethod {
  method: ReportPaymentMethod;
  amount: number;
  count: number;
}

export interface SalesSummaryTopProduct {
  name: string;
  quantity: number;
  total: number;
}

export interface SalesSummaryHourPoint {
  hour: number;
  amount: number;
}

export interface SalesSummaryDto {
  from: string;
  to: string;
  timezone: string;
  operationalDate: string;
  businessDayStartsAtHour: number;
  currency: string;
  totalSales: number;
  ticketCount: number;
  averageTicket: number;
  itemsSold: number;
  invoicedCount: number;
  byMethod: SalesSummaryByMethod[];
  topProducts: SalesSummaryTopProduct[];
  byHour: SalesSummaryHourPoint[];
}

export interface SalesSummaryQuery {
  from?: string;
  to?: string;
  branchId?: string;
}
