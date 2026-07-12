import type { IntegrationTelemetryService } from '../integrations/integration-telemetry.service';
import { PlatformIntegrationService } from './platform-integration.service';

describe('PlatformIntegrationService', () => {
  it('caches aggregate fiscal health without accessing tenant credentials', async () => {
    const telemetry = {
      getFactusSummary: jest.fn().mockResolvedValue({
        provider: 'FACTUS', totalEvents: 2, successfulEvents: 2, warningEvents: 0,
        failedEvents: 0, lastEventAt: '2026-07-10T00:00:00.000Z', lastErrorAt: null,
      }),
      listFactusLogs: jest.fn(),
    };
    const service = new PlatformIntegrationService(telemetry as unknown as IntegrationTelemetryService);

    const first = await service.getFactusHealthCheck();
    const second = await service.getFactusHealthCheck();

    expect(first).toMatchObject({ name: 'factus', status: 'operational' });
    expect(second).toEqual(first);
    expect(telemetry.getFactusSummary).toHaveBeenCalledTimes(1);
  });

  it('returns a degraded health check when the external service fails', async () => {
    const service = new PlatformIntegrationService({
      getFactusSummary: jest.fn().mockResolvedValue({
        provider: 'FACTUS', totalEvents: 2, successfulEvents: 0, warningEvents: 0,
        failedEvents: 2, lastEventAt: '2026-07-10T00:00:00.000Z',
        lastErrorAt: '2026-07-10T00:00:00.000Z',
      }),
      listFactusLogs: jest.fn(),
    } as unknown as IntegrationTelemetryService);

    await expect(service.getFactusHealthCheck()).resolves.toMatchObject({
      name: 'factus',
      status: 'degraded',
    });
  });
});
