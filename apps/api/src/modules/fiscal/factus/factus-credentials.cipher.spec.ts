import type { ConfigService } from '@nestjs/config';
import { FactusEnvironment } from '../../../../generated/prisma';
import type { Env } from '../../../config/env.schema';
import { normalizeFactusBaseUrl } from './factus-connection.service';
import { FactusCredentialsCipher } from './factus-credentials.cipher';

describe('Factus credential protection', () => {
  it('encrypts opaque token cache values with authenticated encryption', () => {
    const key = Buffer.alloc(32, 7).toString('base64url');
    const config = { get: jest.fn().mockReturnValue(key) };
    const cipher = new FactusCredentialsCipher(config as unknown as ConfigService<Env, true>);
    const token = JSON.stringify({ accessToken: 'access-secret', refreshToken: 'refresh-secret' });

    const encrypted = cipher.encryptOpaque(token);

    expect(encrypted).not.toContain('access-secret');
    expect(encrypted).not.toContain('refresh-secret');
    expect(cipher.decryptOpaque(encrypted)).toBe(token);
  });

  it('only accepts the official Factus host for each environment', () => {
    expect(normalizeFactusBaseUrl(undefined, FactusEnvironment.SANDBOX)).toBe(
      'https://api-sandbox.factus.com.co',
    );
    expect(() =>
      normalizeFactusBaseUrl('https://127.0.0.1/internal', FactusEnvironment.SANDBOX),
    ).toThrow();
    expect(() =>
      normalizeFactusBaseUrl('https://api.factus.com.co', FactusEnvironment.SANDBOX),
    ).toThrow();
  });
});
