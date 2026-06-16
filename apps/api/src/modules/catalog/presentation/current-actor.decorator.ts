import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import type { CatalogActor } from '../catalog.types';

interface RequestWithUserMeta {
  user?: AuthenticatedUser;
  requestId?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Builds a CatalogActor from the request the JwtAuthGuard authenticated.
 * Combines tenant context (for isolation/ownership) with audit metadata.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CatalogActor => {
    const request = context.switchToHttp().getRequest<RequestWithUserMeta>();
    if (!request.user) {
      throw new UnauthorizedException(
        'Authenticated user was not attached to the request.',
      );
    }

    return {
      tenantId: request.user.tenantId,
      branchId: request.user.branchId,
      actorUserId: request.user.id,
      requestId: request.requestId,
      ipAddress: firstForwardedIp(request.headers['x-forwarded-for']) ?? request.ip,
      userAgent: firstHeader(request.headers['user-agent']),
    };
  },
);

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function firstForwardedIp(
  value: string | string[] | undefined,
): string | undefined {
  return firstHeader(value)?.split(',')[0]?.trim() || undefined;
}
