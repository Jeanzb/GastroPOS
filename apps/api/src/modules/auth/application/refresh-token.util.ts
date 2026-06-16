import { randomBytes } from 'node:crypto';

const REFRESH_TOKEN_SEPARATOR = '.';
const REFRESH_TOKEN_SECRET_BYTES = 32;

export interface ParsedRefreshToken {
  id: string;
  secret: string;
}

export function createRefreshTokenSecret(): string {
  return randomBytes(REFRESH_TOKEN_SECRET_BYTES).toString('base64url');
}

export function formatRefreshToken(id: string, secret: string): string {
  return `${id}${REFRESH_TOKEN_SEPARATOR}${secret}`;
}

export function parseRefreshToken(token: string): ParsedRefreshToken | null {
  const [id, secret, extra] = token.split(REFRESH_TOKEN_SEPARATOR);

  if (extra !== undefined || !id || !secret) {
    return null;
  }

  return { id, secret };
}

