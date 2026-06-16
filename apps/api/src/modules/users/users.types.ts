import type { UserRole } from '../../../generated/prisma';

export interface LoginUserRecord {
  id: string;
  tenantId: string;
  branchId: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
}
