export const AUTH_SCOPES = ['TENANT', 'POS', 'PLATFORM'] as const;

export type AuthScope = (typeof AUTH_SCOPES)[number];
