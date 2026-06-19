import { Injectable } from '@nestjs/common';
import { SaleStatus, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

const SALE_SUMMARY_INCLUDE = {
  items: true,
  payments: true,
} satisfies Prisma.SaleInclude;

export type SaleSummaryRecord = Prisma.SaleGetPayload<{
  include: typeof SALE_SUMMARY_INCLUDE;
}>;

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTenantTimezone(tenantId: string): Promise<string | null> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });

    return settings?.timezone ?? null;
  }

  findClosedSales(
    tenantId: string,
    branchId: string | undefined,
    from: Date,
    to: Date,
  ): Promise<SaleSummaryRecord[]> {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        status: SaleStatus.CLOSED,
        closedAt: { gte: from, lte: to },
      },
      include: SALE_SUMMARY_INCLUDE,
      orderBy: { closedAt: 'asc' },
    });
  }
}
