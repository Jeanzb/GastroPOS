import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPlatformUser } from '../platform.types';

interface RequestWithPlatformUser {
  platformUser?: AuthenticatedPlatformUser;
}

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPlatformUser => {
    const request = context.switchToHttp().getRequest<RequestWithPlatformUser>();
    if (!request.platformUser) {
      throw new UnauthorizedException('Platform user was not attached to the request.');
    }
    return request.platformUser;
  },
);
