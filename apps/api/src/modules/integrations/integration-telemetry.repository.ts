import { Injectable } from '@nestjs/common';
import {
  IntegrationLogStatus,
  IntegrationOperation,
  IntegrationProvider,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

export interface CreateIntegrationLogInput {
  provider: IntegrationProvider;
  operation: IntegrationOperation;
  status: IntegrationLogStatus;
  httpStatus?: number | null;
  errorCode?: string | null;
  message?: string | null;
  latencyMs?: number | null;
}

@Injectable()
export class IntegrationTelemetryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateIntegrationLogInput) {
    return this.prisma.platformIntegrationLog.create({ data: input });
  }

  listRecent(provider: IntegrationProvider, take: number) {
    return this.prisma.platformIntegrationLog.findMany({
      where: { provider },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async summarize(provider: IntegrationProvider) {
    const [totalEvents, successfulEvents, warningEvents, failedEvents, lastEvent, lastError] =
      await Promise.all([
        this.prisma.platformIntegrationLog.count({ where: { provider } }),
        this.prisma.platformIntegrationLog.count({
          where: { provider, status: IntegrationLogStatus.SUCCESS },
        }),
        this.prisma.platformIntegrationLog.count({
          where: { provider, status: IntegrationLogStatus.WARNING },
        }),
        this.prisma.platformIntegrationLog.count({
          where: { provider, status: IntegrationLogStatus.ERROR },
        }),
        this.prisma.platformIntegrationLog.findFirst({
          where: { provider },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.platformIntegrationLog.findFirst({
          where: { provider, status: IntegrationLogStatus.ERROR },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    return {
      totalEvents,
      successfulEvents,
      warningEvents,
      failedEvents,
      lastEventAt: lastEvent?.createdAt ?? null,
      lastErrorAt: lastError?.createdAt ?? null,
    };
  }
}
