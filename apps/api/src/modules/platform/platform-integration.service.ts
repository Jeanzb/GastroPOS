import { Injectable } from '@nestjs/common';
import type {
  PlatformHealthCheckDto,
  PlatformIntegrationLogDto,
  PlatformIntegrationSummaryDto,
} from '@gastroai/contracts';
import { IntegrationTelemetryService } from '../integrations/integration-telemetry.service';

const HEALTH_CACHE_TTL_MS = 30_000;

@Injectable()
export class PlatformIntegrationService {
  private factusHealthCache: { expiresAt: number; value: PlatformHealthCheckDto } | null = null;

  constructor(private readonly telemetry: IntegrationTelemetryService) {}

  async getFactusHealthCheck(): Promise<PlatformHealthCheckDto> {
    const cached = this.factusHealthCache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const summary = await this.telemetry.getFactusSummary();
    const value: PlatformHealthCheckDto = {
      name: 'factus',
      status: summary.lastErrorAt && (!summary.lastEventAt || summary.lastErrorAt >= summary.lastEventAt)
        ? 'degraded'
        : 'operational',
      message: summary.totalEvents === 0
        ? 'Sin telemetria de Factus todavia.'
        : 'Estado agregado basado en telemetria sanitizada de tenants.',
    };

    this.factusHealthCache = { value, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
    return value;
  }

  getSummary(): Promise<PlatformIntegrationSummaryDto> {
    return this.telemetry.getFactusSummary();
  }

  listLogs(take: number): Promise<PlatformIntegrationLogDto[]> {
    return this.telemetry.listFactusLogs(take);
  }
}
