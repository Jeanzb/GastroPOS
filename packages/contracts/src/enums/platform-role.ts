export const PLATFORM_ROLES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT'] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
