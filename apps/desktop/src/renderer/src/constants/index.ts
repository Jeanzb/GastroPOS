export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const QUERY_KEYS = {
  currentUser: 'current-user',
  branches: 'branches',
  categories: 'categories',
  products: 'products',
  fiscalProfile: 'fiscal-profile',
  fiscalDocuments: 'fiscal-documents',
  fiscalDocument: 'fiscal-document',
  fiscalNumberingRanges: 'fiscal-numbering-ranges',
  cashSession: 'cash-session',
  cashMovements: 'cash-movements',
  cashZReport: 'cash-z-report',
  customers: 'customers',
  suppliers: 'suppliers',
  purchases: 'purchases',
  purchasePeriods: 'purchase-periods',
  employees: 'employees',
  inventoryItems: 'inventory-items',
  inventoryCategories: 'inventory-categories',
  stockMovements: 'stock-movements',
  salesSummary: 'sales-summary',
  diningZones: 'dining-zones',
  tableAccount: 'table-account',
  tableAccountCommand: 'table-account-command',
  tableAccountReceipt: 'table-account-receipt',
  platformOverview: 'platform-overview',
  platformTenants: 'platform-tenants',
  platformTenant: 'platform-tenant',
  platformPlans: 'platform-plans',
  platformFeatures: 'platform-features',
  platformTenantFeatures: 'platform-tenant-features',
  platformHealth: 'platform-health',
  platformIntegrationSummary: 'platform-integration-summary',
  platformIntegrationLogs: 'platform-integration-logs',
} as const;

export const AUTH_STORAGE_KEY = 'gastroai-auth';
export const PLATFORM_AUTH_STORAGE_KEY = 'gastroai-platform-auth';

export const DEFAULT_PAGE_SIZE = 20;

export * from './operations';
