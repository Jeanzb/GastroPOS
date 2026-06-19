import type { UserRole } from '../../../generated/prisma';
import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationException } from '../errors/application.exception';

/** Roles allowed to query data outside their own branch. */
const CROSS_BRANCH_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
]);

export interface BranchAccessContext {
  branchId: string | null;
  role: UserRole;
}

/**
 * Resolves which branch a request may read or operate on, enforcing branch isolation.
 *
 * - No branch requested → the caller's own branch. Tenant-wide roles (no branch) get
 *   `undefined`, meaning "all branches of the tenant".
 * - Requested branch === own branch → allowed.
 * - Requested branch ≠ own branch → only OWNER/ADMIN/ACCOUNTANT; everyone else gets 403.
 */
export function assertBranchAccess(
  ctx: BranchAccessContext,
  requestedBranchId?: string | null,
): string | undefined {
  const requested = requestedBranchId?.trim() || undefined;

  if (!requested) {
    if (ctx.branchId) {
      return ctx.branchId;
    }
    if (CROSS_BRANCH_ROLES.has(ctx.role)) {
      return undefined;
    }
    throw branchForbidden();
  }

  if (requested === ctx.branchId) {
    return requested;
  }

  if (CROSS_BRANCH_ROLES.has(ctx.role)) {
    return requested;
  }

  throw branchForbidden();
}

function branchForbidden(): ApplicationException {
  return new ApplicationException(403, {
    code: ApiErrorCode.FORBIDDEN,
    message: 'You do not have access to the requested branch.',
  });
}
