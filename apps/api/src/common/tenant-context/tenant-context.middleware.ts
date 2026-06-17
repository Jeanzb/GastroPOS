import { Injectable, type NestMiddleware } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(_req: unknown, _res: unknown, next: () => void): void {
    this.tenantContext.run(() => next());
  }
}
