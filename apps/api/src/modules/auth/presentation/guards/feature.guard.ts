import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../../database/prisma.service';
import type { AuthenticatedUser } from '../../auth.types';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
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

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: request.user.tenantId, deletedAt: null },
      select: {
        featureOverrides: {
          where: { feature: { code: featureCode } },
          select: { enabled: true },
          take: 1,
        },
        plan: {
          select: {
            features: {
              where: { feature: { code: featureCode } },
              select: { enabled: true, feature: { select: { isActive: true } } },
              take: 1,
            },
          },
        },
      },
    });
    const override = tenant?.featureOverrides[0];
    if (override) {
      if (override.enabled) {
        return true;
      }
      throw new ForbiddenException('Feature is disabled for this tenant.');
    }

    const planFeature = tenant?.plan?.features[0];
    if (planFeature?.enabled && planFeature.feature.isActive) {
      return true;
    }
    throw new ForbiddenException('Feature is not included for this tenant.');
  }
}
