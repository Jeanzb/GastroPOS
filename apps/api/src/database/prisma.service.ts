import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import {
  applyTenantScope,
  TenantContextService,
  type TenantScopedClient,
} from '../common/tenant-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  readonly tenantScoped: TenantScopedClient;

  constructor(private readonly tenantContext: TenantContextService) {
    super();
    this.tenantScoped = applyTenantScope(this, this.tenantContext);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL');
    } catch (error) {
      // Don't block startup if the DB is not reachable yet; queries connect lazily
      // and the readiness probe will report the database as down.
      this.logger.warn(
        `Database not reachable at startup: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
