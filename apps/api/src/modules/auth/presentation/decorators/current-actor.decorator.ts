import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, RequestActor } from '../../auth.types';

interface RequestWithUserMeta {
  user?: AuthenticatedUser;
  requestId?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestActor => {
    const request = context.switchToHttp().getRequest<RequestWithUserMeta>();
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user was not attached to the request.');
    }

    return {
      tenantId: request.user.tenantId,
      branchId: request.user.branchId,
      actorUserId: request.user.id,
      fullName: request.user.fullName,
      role: request.user.role,
      authScope: request.user.authScope,
      requestId: request.requestId,
      ipAddress: firstForwardedIp(request.headers['x-forwarded-for']) ?? request.ip,
      userAgent: firstHeader(request.headers['user-agent']),
    };
  },
);

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function firstForwardedIp(value: string | string[] | undefined): string | undefined {
  return firstHeader(value)?.split(',')[0]?.trim() || undefined;
}
