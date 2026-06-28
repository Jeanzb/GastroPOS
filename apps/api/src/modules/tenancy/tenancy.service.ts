import { Injectable } from '@nestjs/common';
import type { BranchDto } from '@gastroai/contracts';
import type { UserRole } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import type { TenantRequestContext } from '../auth/auth.types';
import { TenancyRepository } from './tenancy.repository';

const TENANT_WIDE_BRANCH_ROLES = new Set<UserRole>(['OWNER', 'ADMIN', 'ACCOUNTANT']);

@Injectable()
export class TenancyService {
  constructor(private readonly tenancyRepository: TenancyRepository) {}

  async listBranches(ctx: TenantRequestContext): Promise<BranchDto[]> {
    if (!TENANT_WIDE_BRANCH_ROLES.has(ctx.role) && !ctx.branchId) {
      throw new ApplicationException(403, {
        code: ApiErrorCode.FORBIDDEN,
        message: 'This user does not have an assigned branch.',
      });
    }

    const scopedBranchId = TENANT_WIDE_BRANCH_ROLES.has(ctx.role)
      ? undefined
      : (ctx.branchId ?? undefined);

    return this.tenancyRepository.listBranches(ctx.tenantId, scopedBranchId);
  }
}
