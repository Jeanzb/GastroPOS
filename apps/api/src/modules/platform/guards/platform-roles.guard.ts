import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '@gastroai/contracts';
import type { AuthenticatedPlatformUser } from '../platform.types';
import { REQUIRED_PLATFORM_ROLES_KEY } from '../decorators/require-platform-roles.decorator';

interface RequestWithPlatformUser {
  platformUser?: AuthenticatedPlatformUser;
}

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      REQUIRED_PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPlatformUser>();
    if (!request.platformUser) {
      throw new ForbiddenException('Authenticated platform user is required.');
    }
    if (requiredRoles.includes(request.platformUser.role)) {
      return true;
    }
    throw new ForbiddenException('Insufficient platform role.');
  }
}
