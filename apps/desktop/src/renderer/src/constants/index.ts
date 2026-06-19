export const API_BASE_URL = 'http://localhost:3000/api/v1';

export const QUERY_KEYS = {
  currentUser: 'current-user',
  categories: 'categories',
  products: 'products',
  fiscalProfile: 'fiscal-profile',
  cashSession: 'cash-session',
  cashMovements: 'cash-movements',
  cashZReport: 'cash-z-report',
  customers: 'customers',
  suppliers: 'suppliers',
  purchases: 'purchases',
  employees: 'employees',
  inventoryItems: 'inventory-items',
  stockMovements: 'stock-movements',
  salesSummary: 'sales-summary',
  diningZones: 'dining-zones',
  tableAccount: 'table-account',
  tableAccountCommand: 'table-account-command',
  tableAccountReceipt: 'table-account-receipt',
} as const;

export const AUTH_STORAGE_KEY = 'gastroai-auth';

export const DEFAULT_PAGE_SIZE = 20;

export * from './operations';
