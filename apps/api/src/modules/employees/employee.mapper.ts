import type { EmployeeDto } from '@gastroai/contracts';
import type { Branch, User } from '../../../generated/prisma';

export type EmployeeWithBranch = User & {
  branch: Pick<Branch, 'id' | 'name'> | null;
};

export function toEmployeeDto(employee: EmployeeWithBranch): EmployeeDto {
  return {
    id: employee.id,
    branchId: employee.branchId,
    branchName: employee.branch?.name ?? null,
    email: employee.email,
    fullName: employee.fullName,
    role: employee.role,
    isActive: employee.isActive,
    lastLoginAt: employee.lastLoginAt?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}
