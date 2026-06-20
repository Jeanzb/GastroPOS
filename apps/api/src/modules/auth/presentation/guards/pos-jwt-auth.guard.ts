import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class PosJwtAuthGuard extends JwtAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.authScope !== 'POS') {
      throw new UnauthorizedException('POS auth scope is required.');
    }
    return true;
  }
}
