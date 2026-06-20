import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { TenantRequestContext } from '../../modules/auth/auth.types';
import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationException } from '../errors/application.exception';
import { assertBranchAccess } from './branch-access';

@Injectable()
export class BranchScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    ctx: TenantRequestContext,
    requestedBranchId?: string | null,
  ): Promise<string | undefined> {
    const branchId = assertBranchAccess(ctx, requestedBranchId);
    if (branchId) {
      await this.assertBranchBelongsToTenant(ctx.tenantId, branchId);
    }
    return branchId;
  }

  async require(
    ctx: TenantRequestContext,
    requestedBranchId?: string | null,
  ): Promise<string> {
    const branchId = await this.resolve(ctx, requestedBranchId);
    if (!branchId) {
      throw new ApplicationException(400, {
        code: ApiErrorCode.BAD_REQUEST,
        message: 'A branch is required for this operation.',
      });
    }
    return branchId;
  }

  async assertResourceBranch(ctx: TenantRequestContext, branchId: string): Promise<void> {
    assertBranchAccess(ctx, branchId);
    await this.assertBranchBelongsToTenant(ctx.tenantId, branchId);
  }

  private async assertBranchBelongsToTenant(tenantId: string, branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!branch) {
      throw new ApplicationException(404, {
        code: ApiErrorCode.NOT_FOUND,
        message: 'Branch was not found.',
      });
    }
  }
}
