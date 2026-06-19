import { Injectable } from '@nestjs/common';
import type {
  ReportPaymentMethod,
  SalesSummaryByMethod,
  SalesSummaryDto,
  SalesSummaryHourPoint,
  SalesSummaryTopProduct,
} from '@gastroai/contracts';
import { assertBranchAccess } from '../../common/access/branch-access';
import {
  BUSINESS_DAY_START_HOUR,
  getLocalHour,
  getOperationalDate,
  getOperationalDateRange,
  normalizeTimezone,
  parseDateBoundary,
  toIsoString,
} from '../../common/date-time/operational-date';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import type { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  async getSalesSummary(
    ctx: TenantRequestContext,
    query: SalesSummaryQueryDto,
  ): Promise<SalesSummaryDto> {
    const branchId = assertBranchAccess(ctx, query.branchId);
    const timezone = normalizeTimezone(await this.repository.findTenantTimezone(ctx.tenantId));
    const now = new Date();
    const defaultRange = getOperationalDateRange(now, timezone);
    const from = query.from ? parseDateBoundary(query.from, 'from', timezone) : defaultRange.from;
    const to = query.to ? parseDateBoundary(query.to, 'to', timezone) : now;

    if (from > to) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'Report start date must be before the end date.',
        details: {
          from: toIsoString(from),
          to: toIsoString(to),
        },
      });
    }

    const sales = await this.repository.findClosedSales(ctx.tenantId, branchId, from, to);

    const methodMap = new Map<ReportPaymentMethod, SalesSummaryByMethod>();
    const productMap = new Map<string, SalesSummaryTopProduct>();
    const hourMap = new Map<number, number>();
    let totalSales = 0;
    let itemsSold = 0;
    let invoicedCount = 0;
    let currency = 'COP';

    for (const sale of sales) {
      totalSales += sale.grandTotal;
      if (sale.requiresInvoice) {
        invoicedCount += 1;
      }
      if (sale.currency) {
        currency = sale.currency;
      }

      const hour = getLocalHour(sale.closedAt ?? sale.createdAt, timezone);
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + sale.grandTotal);

      for (const item of sale.items) {
        itemsSold += item.quantity;
        const product = productMap.get(item.nameSnapshot) ?? {
          name: item.nameSnapshot,
          quantity: 0,
          total: 0,
        };
        product.quantity += item.quantity;
        product.total += item.lineTotal;
        productMap.set(item.nameSnapshot, product);
      }

      for (const payment of sale.payments) {
        const method = payment.method as ReportPaymentMethod;
        const entry = methodMap.get(method) ?? { method, amount: 0, count: 0 };
        entry.amount += payment.amount;
        entry.count += 1;
        methodMap.set(method, entry);
      }
    }

    const ticketCount = sales.length;
    const averageTicket = ticketCount > 0 ? Math.round(totalSales / ticketCount) : 0;
    const byMethod = [...methodMap.values()].sort((a, b) => b.amount - a.amount);
    const topProducts = [...productMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    const byHour: SalesSummaryHourPoint[] = [...hourMap.entries()]
      .map(([hour, amount]) => ({ hour, amount }))
      .sort((a, b) => a.hour - b.hour);

    return {
      from: toIsoString(from),
      to: toIsoString(to),
      timezone,
      operationalDate: resolveOperationalDate(query.from, from, now, timezone),
      businessDayStartsAtHour: BUSINESS_DAY_START_HOUR,
      currency,
      totalSales,
      ticketCount,
      averageTicket,
      itemsSold,
      invoicedCount,
      byMethod,
      topProducts,
      byHour,
    };
  }
}

function resolveOperationalDate(
  requestedFrom: string | undefined,
  from: Date,
  now: Date,
  timezone: string,
): string {
  if (requestedFrom && /^\d{4}-\d{2}-\d{2}$/.test(requestedFrom)) {
    return requestedFrom;
  }

  return getOperationalDate(requestedFrom ? from : now, timezone);
}
