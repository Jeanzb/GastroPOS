import type { PlatformRole } from '@gastroai/contracts';

export interface AuthenticatedPlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  sessionId: string;
}

export interface PlatformAccessTokenPayload {
  sub: string;
  authScope: 'PLATFORM';
  platformRole: PlatformRole;
  sessionId: string;
}

export interface PlatformAuthRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}
