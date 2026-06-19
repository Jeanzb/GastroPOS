import { Injectable } from '@nestjs/common';
import type {
  ReportPaymentMethod,
  SalesSummaryByMethod,
  SalesSummaryDto,
  SalesSummaryHourPoint,
  SalesSummaryTopProduct,
} from '@gastroai/contracts';
import type { Prisma } from '../../../generated/prisma';
import { assertBranchAccess } from '../../common/access/branch-access';
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
    const now = new Date();
    const from = query.from ? parseReportDate(query.from, 'from') : startOfDay(now);
    const to = query.to ? parseReportDate(query.to, 'to') : now;

    if (from > to) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'Report start date must be before the end date.',
        details: {
          from: from.toISOString(),
          to: to.toISOString(),
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

      const hour = (sale.closedAt ?? sale.createdAt).getHours();
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
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const byHour: SalesSummaryHourPoint[] = [...hourMap.entries()]
      .map(([hour, amount]) => ({ hour, amount }))
      .sort((a, b) => a.hour - b.hour);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
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

function parseReportDate(value: string, field: 'from' | 'to'): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApplicationException(400, {
      code: ApiErrorCode.BAD_REQUEST,
      message: `Invalid report ${field} date.`,
      details: { [field]: value } as Prisma.InputJsonObject,
    });
  }

  return date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
