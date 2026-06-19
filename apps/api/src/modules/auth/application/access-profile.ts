import {
  getAvailableRoleProfilesForRole,
  getPermissionsForRole,
  type AppPermission,
  type RoleProfile,
  type UserRole as ContractUserRole,
} from '@gastroai/contracts';
import type { UserRole } from '../../../../generated/prisma';

export interface AccessProfile {
  permissions: AppPermission[];
  availableRoles: RoleProfile[];
}

export function buildAccessProfile(role: UserRole): AccessProfile {
  const contractRole = role as ContractUserRole;

  return {
    permissions: getPermissionsForRole(contractRole),
    availableRoles: getAvailableRoleProfilesForRole(contractRole),
  };
}
