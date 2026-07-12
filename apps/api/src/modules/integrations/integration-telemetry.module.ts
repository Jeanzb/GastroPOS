import { Module } from '@nestjs/common';
import { IntegrationTelemetryRepository } from './integration-telemetry.repository';
import { IntegrationTelemetryService } from './integration-telemetry.service';

@Module({
  providers: [IntegrationTelemetryRepository, IntegrationTelemetryService],
  exports: [IntegrationTelemetryService],
})
export class IntegrationTelemetryModule {}
