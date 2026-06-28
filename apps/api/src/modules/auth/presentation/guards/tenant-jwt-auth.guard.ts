import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Like JwtAuthGuard but rejects POS-scoped tokens, so terminal sessions (even for
 * privileged roles that log in by cédula) cannot reach back-office endpoints such as
 * employee/credential management.
 */
@Injectable()
export class TenantJwtAuthGuard extends JwtAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.authScope !== 'TENANT') {
      throw new UnauthorizedException('Back-office (TENANT) auth scope is required.');
    }
    return true;
  }
}
