import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /** Overall health: liveness + basic resource checks. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  /** Liveness probe: the process is up. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness probe: dependencies are reachable (DB check added in tenancy phase). */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([]);
  }
}
