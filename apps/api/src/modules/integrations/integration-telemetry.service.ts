import { Injectable } from '@nestjs/common';
import type { PlatformIntegrationLogDto, PlatformIntegrationSummaryDto } from '@gastroai/contracts';
import {
  IntegrationLogStatus,
  IntegrationOperation,
  IntegrationProvider,
} from '../../../generated/prisma';
import { IntegrationTelemetryRepository } from './integration-telemetry.repository';

@Injectable()
export class IntegrationTelemetryService {
  constructor(private readonly repository: IntegrationTelemetryRepository) {}

  async tryRecord(input: {
    provider: IntegrationProvider;
    operation: IntegrationOperation;
    status: IntegrationLogStatus;
    httpStatus?: number | null;
    errorCode?: string | null;
    message?: string | null;
    latencyMs?: number | null;
  }): Promise<void> {
    try {
      await this.repository.create({
        ...input,
        message: sanitizeMessage(input.message),
      });
    } catch {
      // Telemetry must never make fiscal operations fail.
    }
  }

  async listFactusLogs(take = 50): Promise<PlatformIntegrationLogDto[]> {
    const items = await this.repository.listRecent(IntegrationProvider.FACTUS, take);
    return items.map((item) => ({
      id: item.id,
      provider: 'FACTUS',
      operation: item.operation,
      status: item.status,
      httpStatus: item.httpStatus,
      errorCode: item.errorCode,
      message: item.message,
      latencyMs: item.latencyMs,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async getFactusSummary(): Promise<PlatformIntegrationSummaryDto> {
    const summary = await this.repository.summarize(IntegrationProvider.FACTUS);
    return {
      provider: 'FACTUS',
      ...summary,
      lastEventAt: summary.lastEventAt?.toISOString() ?? null,
      lastErrorAt: summary.lastErrorAt?.toISOString() ?? null,
    };
  }
}

function sanitizeMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[endpoint redacted]')
    .slice(0, 240);
}
