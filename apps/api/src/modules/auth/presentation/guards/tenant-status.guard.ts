import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantAccessCacheService } from '../../../../common/access/tenant-access-cache.service';
import type { AuthenticatedUser } from '../../auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

const BLOCKED_STATUSES = new Set(['SUSPENDED', 'CANCELLED', 'ARCHIVED']);

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly tenantAccessCache: TenantAccessCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      return true;
    }

    const status = await this.tenantAccessCache.getTenantStatus(request.user.tenantId);
    if (!status || BLOCKED_STATUSES.has(status)) {
      throw new ForbiddenException('Tenant is not allowed to operate.');
    }
    return true;
  }
}
