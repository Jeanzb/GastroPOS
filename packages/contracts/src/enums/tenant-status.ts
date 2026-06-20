export const TENANT_STATUSES = [
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];
