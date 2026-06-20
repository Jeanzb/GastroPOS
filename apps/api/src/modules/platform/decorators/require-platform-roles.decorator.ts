import { SetMetadata } from '@nestjs/common';
import type { PlatformRole } from '@gastroai/contracts';

export const REQUIRED_PLATFORM_ROLES_KEY = Symbol('requiredPlatformRoles');

export const RequirePlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(REQUIRED_PLATFORM_ROLES_KEY, roles);
