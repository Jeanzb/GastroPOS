import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type { AuthenticatedUser } from '../../auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

const BLOCKED_STATUSES = new Set(['SUSPENDED', 'CANCELLED', 'ARCHIVED']);

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      return true;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: request.user.tenantId, deletedAt: null },
      select: { status: true },
    });
    if (!tenant || BLOCKED_STATUSES.has(tenant.status)) {
      throw new ForbiddenException('Tenant is not allowed to operate.');
    }
    return true;
  }
}
