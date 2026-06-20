import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantAccessCacheService } from '../../../../common/access/tenant-access-cache.service';
import type { AuthenticatedUser } from '../../auth.types';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantAccessCache: TenantAccessCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureCode = this.reflector.getAllAndOverride<string>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new ForbiddenException('Authenticated user is required.');
    }

    const features = await this.tenantAccessCache.getTenantFeatures(request.user.tenantId);
    const enabled = features?.[featureCode];
    if (enabled === true) {
      return true;
    }
    if (enabled === false) {
      throw new ForbiddenException('Feature is disabled for this tenant.');
    }
    throw new ForbiddenException('Feature is not included for this tenant.');
  }
}
