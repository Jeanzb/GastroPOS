import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Env } from '../../../config/env.schema';
import { FactusProviderError, type FactusProviderCredentials } from './factus.types';

const CIPHER = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

@Injectable()
export class FactusCredentialsCipher {
  constructor(private readonly config: ConfigService<Env, true>) {}

  encrypt(credentials: FactusProviderCredentials): string {
    return this.encryptOpaque(JSON.stringify(credentials));
  }

  encryptOpaque(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(CIPHER, key, iv, { authTagLength: AUTH_TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): FactusProviderCredentials {
    const plaintext = this.decryptOpaque(value);
    try {
      const parsed = JSON.parse(plaintext) as Partial<FactusProviderCredentials>;
      if (!parsed.clientId || !parsed.clientSecret || !parsed.username || !parsed.password) {
        throw invalidCiphertext();
      }
      return {
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        username: parsed.username,
        password: parsed.password,
      };
    } catch (error) {
      if (error instanceof FactusProviderError) {
        throw error;
      }
      throw invalidCiphertext();
    }
  }

  decryptOpaque(value: string): string {
    const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
    if (!encodedIv || !encodedTag || !encodedCiphertext) {
      throw invalidCiphertext();
    }

    try {
      const decipher = createDecipheriv(
        CIPHER,
        this.getKey(),
        Buffer.from(encodedIv, 'base64url'),
        { authTagLength: AUTH_TAG_BYTES },
      );
      decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      if (error instanceof FactusProviderError) {
        throw error;
      }
      throw invalidCiphertext();
    }
  }

  private getKey(): Buffer {
    const configured = this.config.get('FACTUS_CREDENTIALS_ENCRYPTION_KEY', { infer: true });
    if (!configured) {
      throw new FactusProviderError({
        message:
          'FACTUS_CREDENTIALS_ENCRYPTION_KEY must be configured before saving tenant credentials.',
        isRetryable: false,
      });
    }

    const key = decodeKey(configured);
    if (key.length !== 32) {
      throw new FactusProviderError({
        message:
          'FACTUS_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte base64url, base64, or hexadecimal key.',
        isRetryable: false,
      });
    }
    return key;
  }
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();
  if (/^[a-f\d]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'base64url');
}

function invalidCiphertext(): FactusProviderError {
  return new FactusProviderError({
    message:
      'Stored Factus credentials cannot be decrypted. Rotate the tenant connection credentials.',
    isRetryable: false,
  });
}
