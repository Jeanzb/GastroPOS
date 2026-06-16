import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser, TenantRequestContext } from '../../auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

export const CurrentTenantContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantRequestContext => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new UnauthorizedException(
        'Authenticated user was not attached to the request.',
      );
    }

    return {
      tenantId: request.user.tenantId,
      branchId: request.user.branchId,
      actorUserId: request.user.id,
      role: request.user.role,
      sessionId: request.user.sessionId,
    };
  },
);
