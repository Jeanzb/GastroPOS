import type { UserRole } from '../enums/user-role';

export const APP_PERMISSIONS = [
  'dashboard:view',
  'tables:view',
  'tables:manage',
  'pos:view',
  'pos:sell',
  'catalog:view',
  'catalog:manage',
  'cash:view',
  'cash:manage',
  'cash:close',
  'inventory:view',
  'inventory:manage',
  'customers:view',
  'customers:manage',
  'purchases:view',
  'purchases:manage',
  'employees:view',
  'employees:manage',
  'fiscal:view',
  'fiscal:manage',
  'reports:view',
  'onboarding:view',
  'users:manage',
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export interface RoleProfile {
  role: UserRole;
  label: string;
  description: string;
  permissions: AppPermission[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
  INVENTORY_MANAGER: 'Inventario',
  ACCOUNTANT: 'Contador',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  OWNER: 'Control total del negocio, sedes, usuarios y configuracion.',
  ADMIN: 'Administra la operacion diaria y configuracion principal.',
  CASHIER: 'Opera caja, cobra ventas y registra clientes fiscales.',
  WAITER: 'Gestiona mesas, comandas y solicitudes de cuenta.',
  KITCHEN: 'Consulta comandas enviadas a cocina y estados de preparacion.',
  INVENTORY_MANAGER: 'Administra productos, insumos, stock y proveedores.',
  ACCOUNTANT: 'Consulta caja, reportes y configuracion fiscal.',
};

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  OWNER: [...APP_PERMISSIONS],
  ADMIN: [
    'dashboard:view',
    'tables:view',
    'tables:manage',
    'pos:view',
    'pos:sell',
    'catalog:view',
    'catalog:manage',
    'cash:view',
    'cash:manage',
    'cash:close',
    'inventory:view',
    'inventory:manage',
    'customers:view',
    'customers:manage',
    'purchases:view',
    'purchases:manage',
    'employees:view',
    'employees:manage',
    'fiscal:view',
    'fiscal:manage',
    'reports:view',
    'onboarding:view',
    'users:manage',
  ],
  CASHIER: [
    'dashboard:view',
    'tables:view',
    'pos:view',
    'pos:sell',
    'cash:view',
    'cash:manage',
    'cash:close',
    'customers:view',
    'customers:manage',
    'fiscal:view',
    'reports:view',
  ],
  WAITER: ['tables:view', 'pos:view', 'pos:sell'],
  KITCHEN: ['tables:view', 'pos:view'],
  INVENTORY_MANAGER: [
    'dashboard:view',
    'catalog:view',
    'catalog:manage',
    'inventory:view',
    'inventory:manage',
    'purchases:view',
    'purchases:manage',
    'reports:view',
  ],
  ACCOUNTANT: [
    'dashboard:view',
    'cash:view',
    'customers:view',
    'purchases:view',
    'fiscal:view',
    'fiscal:manage',
    'reports:view',
  ],
};

const ADMIN_VIEW_ROLES: UserRole[] = ['WAITER', 'CASHIER', 'ADMIN'];

export function getPermissionsForRole(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function canRole(role: UserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getRoleProfile(role: UserRole): RoleProfile {
  return {
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
    permissions: ROLE_PERMISSIONS[role],
  };
}

export function getAvailableRoleProfilesForRole(role: UserRole): RoleProfile[] {
  if (role === 'OWNER' || role === 'ADMIN') {
    return ADMIN_VIEW_ROLES.map(getRoleProfile);
  }

  return [getRoleProfile(role)];
}
