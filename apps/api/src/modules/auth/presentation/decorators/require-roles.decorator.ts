import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../auth.types';

export const REQUIRED_ROLES_KEY = 'auth:required_roles';

export const RequireRoles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
