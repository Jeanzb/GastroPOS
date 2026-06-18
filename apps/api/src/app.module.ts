import { MiddlewareConsumer, Module, RequestMethod, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { RequestIdMiddleware } from './common/request-context/request-id.middleware';
import { TenantContextMiddleware, TenantContextModule } from './common/tenant-context';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashModule } from './modules/cash/cash.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
    TenantContextModule,
    PrismaModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    AuditModule,
    AuthModule,
    CashModule,
    CatalogModule,
    FiscalModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // Global rate limiting (per AGENTS.md security rules).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, TenantContextMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
