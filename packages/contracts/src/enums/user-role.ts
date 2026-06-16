/** Default RBAC roles. Mirrors the UserRole enum in the Prisma schema. */
export const USER_ROLES = [
  'OWNER',
  'ADMIN',
  'CASHIER',
  'WAITER',
  'KITCHEN',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
