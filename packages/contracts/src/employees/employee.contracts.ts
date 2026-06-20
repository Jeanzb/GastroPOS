import type { UserRole } from '../enums/user-role';

export interface EmployeeDto {
  id: string;
  branchId: string | null;
  branchName: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  branchId?: string;
}

export interface CreateEmployeePayload {
  email: string;
  fullName: string;
  role: UserRole;
  temporaryPassword: string;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UpdateEmployeePayload {
  email?: string;
  fullName?: string;
  role?: UserRole;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UpdateEmployeeAccessPayload {
  isActive: boolean;
}

/** Sets/replaces the numeric PIN used for fast POS terminal login. */
export interface SetEmployeePinPayload {
  /** 4–6 digit numeric PIN. Stored hashed; unique per branch. */
  pin: string;
}
