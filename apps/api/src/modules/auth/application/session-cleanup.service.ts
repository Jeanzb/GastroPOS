import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthRepository } from '../infrastructure/auth.repository';

/**
 * Forces operational (POS) sessions to close at each tenant's business-day start hour
 * (TenantSettings.businessDayStartsAtHour, in the tenant timezone) so no phantom shift
 * sessions survive into the next day. Runs hourly and only acts on tenants whose local
 * hour currently matches their configured close hour.
 */
@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly authRepository: AuthRepository) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'force-close-pos-sessions' })
  async closeOperationalSessionsAtBusinessDayStart(): Promise<void> {
    const configs = await this.authRepository.findActiveTenantsBusinessDayConfig();

    for (const config of configs) {
      if (currentHourInTimeZone(config.timezone) !== config.businessDayStartsAtHour) {
        continue;
      }

      const closed = await this.authRepository.revokeActivePosSessionsForTenant(config.tenantId);
      if (closed > 0) {
        this.logger.log(
          `Forced close of ${closed} POS session(s) for tenant ${config.tenantId} at business-day start.`,
        );
      }
    }
  }
}

function currentHourInTimeZone(timeZone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    return Number.parseInt(formatted, 10) % 24;
  } catch {
    return new Date().getHours();
  }
}
