import { Inject, Injectable, Optional } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  IntegrationLogStatus,
  IntegrationOperation,
  IntegrationProvider,
} from '../../../../generated/prisma';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { IntegrationTelemetryService } from '../../integrations/integration-telemetry.service';
import { FactusCredentialsCipher } from './factus-credentials.cipher';
import type {
  FactusAdjustmentNotePayload,
  FactusArtifactResult,
  FactusBillPayload,
  FactusCreditNotePayload,
  FactusHttpResult,
  FactusRadianEventPayload,
  FactusRuntime,
  FactusSupportDocumentPayload,
} from './factus.types';
import { FactusProviderError } from './factus.types';

interface FactusTokenCache {
  accessToken: string;
  refreshToken: string | null;
  expiresAtMs: number;
}

interface FactusTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

type RequiredAccessToken = FactusTokenResponse & { access_token: string };
type FactusHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FactusRequestOptions {
  method?: FactusHttpMethod;
  body?: unknown;
  rawBody?: URLSearchParams | FormData;
  retryAuth?: boolean;
  operation?: IntegrationOperation;
}

/**
 * Provider boundary for the confirmed Factus V2 contract. Every call receives
 * a decrypted tenant runtime explicitly; the adapter has no global issuer or
 * fallback credentials and cannot accidentally cross tenant boundaries.
 */
@Injectable()
export class FactusAdapter {
  private readonly localTokens = new Map<string, FactusTokenCache>();
  private readonly tokenLocks = new Map<string, Promise<string>>();
  private readonly breakers = new Map<string, { failures: number; openUntil: number }>();

  constructor(
    @Optional() private readonly telemetry?: IntegrationTelemetryService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
    @Optional() private readonly cipher?: FactusCredentialsCipher,
  ) {}

  testConnection(runtime: FactusRuntime): Promise<FactusHttpResult> {
    return this.listDianNumberingRanges(runtime);
  }

  listNumberingRanges(runtime: FactusRuntime): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/numbering-ranges', { method: 'GET' });
  }

  listDianNumberingRanges(runtime: FactusRuntime): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/numbering-ranges/dian', {
      method: 'GET',
      operation: IntegrationOperation.HEALTH_CHECK,
    });
  }

  lookupAcquirer(
    runtime: FactusRuntime,
    identificationDocumentCode: string,
    identificationNumber: string,
  ): Promise<FactusHttpResult> {
    const query = new URLSearchParams({
      identification_document_code: identificationDocumentCode,
      identification_number: identificationNumber,
    });
    return this.request(runtime, `/v2/dian/acquirer?${query.toString()}`, { method: 'GET' });
  }

  getCompany(runtime: FactusRuntime): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/companies', { method: 'GET' });
  }

  updateCompany(runtime: FactusRuntime, payload: unknown): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/companies', { method: 'PUT', body: payload });
  }

  uploadCompanyLogo(runtime: FactusRuntime, form: FormData): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/companies/logo', { method: 'POST', rawBody: form });
  }

  getSubscriptions(runtime: FactusRuntime): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/subscriptions', { method: 'GET' });
  }

  createAndValidateBill(
    runtime: FactusRuntime,
    payload: FactusBillPayload,
  ): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/bills/validate', { method: 'POST', body: payload });
  }

  createAndValidateCreditNote(
    runtime: FactusRuntime,
    payload: FactusCreditNotePayload,
  ): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/credit-notes/validate', { method: 'POST', body: payload });
  }

  createAndValidateSupportDocument(
    runtime: FactusRuntime,
    payload: FactusSupportDocumentPayload,
  ): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/support-documents/validate', {
      method: 'POST',
      body: payload,
    });
  }

  createAndValidateAdjustmentNote(
    runtime: FactusRuntime,
    payload: FactusAdjustmentNotePayload,
  ): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/adjustment-notes/validate', {
      method: 'POST',
      body: payload,
    });
  }

  uploadReception(runtime: FactusRuntime, trackId: string): Promise<FactusHttpResult> {
    return this.request(runtime, '/v2/receptions/upload', {
      method: 'POST',
      body: { track_id: trackId },
    });
  }

  emitRadianEvent(
    runtime: FactusRuntime,
    billId: string | number,
    eventType: string,
    payload: FactusRadianEventPayload,
  ): Promise<FactusHttpResult> {
    return this.request(
      runtime,
      `/v2/receptions/bills/${encodeURIComponent(String(billId))}/radian/events/${encodeURIComponent(eventType)}`,
      { method: 'PATCH', body: payload },
    );
  }

  getBill(runtime: FactusRuntime, factusNumber: string): Promise<FactusHttpResult> {
    return this.request(runtime, `/v2/bills/${encodeURIComponent(factusNumber)}`, {
      method: 'GET',
    });
  }

  getCreditNote(runtime: FactusRuntime, factusNumber: string): Promise<FactusHttpResult> {
    return this.request(runtime, `/v2/credit-notes/${encodeURIComponent(factusNumber)}`, {
      method: 'GET',
    });
  }

  deleteBillByReference(runtime: FactusRuntime, referenceCode: string): Promise<FactusHttpResult> {
    return this.request(
      runtime,
      `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`,
      {
        method: 'DELETE',
      },
    );
  }

  deleteCreditNoteByReference(
    runtime: FactusRuntime,
    referenceCode: string,
  ): Promise<FactusHttpResult> {
    return this.request(
      runtime,
      `/v2/credit-notes/reference/${encodeURIComponent(referenceCode)}`,
      {
        method: 'DELETE',
      },
    );
  }

  sendBillEmail(runtime: FactusRuntime, factusNumber: string): Promise<FactusHttpResult> {
    return this.request(runtime, `/v2/bills/${encodeURIComponent(factusNumber)}/send-email`, {
      method: 'POST',
    });
  }

  sendCreditNoteEmail(runtime: FactusRuntime, factusNumber: string): Promise<FactusHttpResult> {
    return this.request(
      runtime,
      `/v2/credit-notes/${encodeURIComponent(factusNumber)}/send-email`,
      {
        method: 'POST',
      },
    );
  }

  downloadPdf(runtime: FactusRuntime, factusNumber: string): Promise<FactusArtifactResult> {
    return this.downloadArtifact(
      runtime,
      `/v2/bills/${encodeURIComponent(factusNumber)}/download-pdf`,
    );
  }

  downloadXml(runtime: FactusRuntime, factusNumber: string): Promise<FactusArtifactResult> {
    return this.downloadArtifact(
      runtime,
      `/v2/bills/${encodeURIComponent(factusNumber)}/download-xml`,
    );
  }

  downloadAttachedDocumentXml(
    runtime: FactusRuntime,
    factusNumber: string,
  ): Promise<FactusArtifactResult> {
    return this.downloadArtifact(
      runtime,
      `/v2/bills/${encodeURIComponent(factusNumber)}/download-attached-document-xml`,
    );
  }

  private async downloadArtifact(
    runtime: FactusRuntime,
    path: string,
  ): Promise<FactusArtifactResult> {
    const result = await this.request(runtime, path, { method: 'GET' });
    return { fileName: null, base64: null, payload: result.payload };
  }

  private async request(
    runtime: FactusRuntime,
    path: string,
    options: FactusRequestOptions,
  ): Promise<FactusHttpResult> {
    this.assertCircuitClosed(runtime);
    const startedAt = Date.now();
    const operation = options.operation ?? IntegrationOperation.API_REQUEST;
    const endpoint = `${trimTrailingSlash(runtime.baseUrl)}${path}`;
    let tracked = false;

    try {
      const token = await this.getAccessToken(runtime);
      const response = await this.fetchJson(endpoint, {
        method: options.method ?? 'GET',
        timeoutMs: runtime.timeoutMs,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body,
        rawBody: options.rawBody,
      });

      if (response.httpStatus === 401 && options.retryAuth !== false) {
        this.clearToken(runtime);
        return this.request(runtime, path, { ...options, retryAuth: false });
      }

      if (response.httpStatus < 200 || response.httpStatus >= 300) {
        this.recordCircuitFailure(runtime, response.httpStatus);
        tracked = true;
        await this.track({
          operation,
          status: statusForHttp(response.httpStatus),
          httpStatus: response.httpStatus,
          errorCode: `FACTUS_HTTP_${response.httpStatus}`,
          message: 'The fiscal service returned an unsuccessful response.',
          latencyMs: elapsedMs(startedAt),
        });
        throw new FactusProviderError({
          message: `Factus request failed with HTTP ${response.httpStatus}.`,
          httpStatus: response.httpStatus,
          endpoint,
          responsePayload: response.payload,
          retryAfterSeconds: response.retryAfterSeconds,
        });
      }

      this.recordCircuitSuccess(runtime);
      tracked = true;
      await this.track({
        operation,
        status: IntegrationLogStatus.SUCCESS,
        httpStatus: response.httpStatus,
        message: 'Fiscal service request completed.',
        latencyMs: elapsedMs(startedAt),
      });
      return { endpoint, ...response };
    } catch (error) {
      const providerError = error instanceof FactusProviderError ? error : null;
      if (!tracked) {
        this.recordCircuitFailure(runtime, providerError?.httpStatus);
        await this.track({
          operation,
          status: IntegrationLogStatus.ERROR,
          httpStatus: providerError?.httpStatus ?? null,
          errorCode: providerError?.httpStatus
            ? `FACTUS_HTTP_${providerError.httpStatus}`
            : 'FACTUS_NETWORK_OR_CONFIG',
          message: 'Fiscal service request could not be completed.',
          latencyMs: elapsedMs(startedAt),
        });
      }
      throw error;
    }
  }

  private async getAccessToken(runtime: FactusRuntime): Promise<string> {
    const key = this.tokenKey(runtime);
    const cached = await this.readToken(runtime);
    const now = Date.now();
    if (cached?.expiresAtMs && cached.expiresAtMs > now + 30_000) {
      return cached.accessToken;
    }

    const inFlight = this.tokenLocks.get(key);
    if (inFlight) {
      return inFlight;
    }

    const renewal = this.obtainToken(runtime, cached).finally(() => this.tokenLocks.delete(key));
    this.tokenLocks.set(key, renewal);
    return renewal;
  }

  private async obtainToken(
    runtime: FactusRuntime,
    cached: FactusTokenCache | null,
  ): Promise<string> {
    if (cached?.refreshToken) {
      try {
        const payload = await this.requestToken(
          runtime,
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: runtime.clientId,
            client_secret: runtime.clientSecret,
            refresh_token: cached.refreshToken,
          }),
          cached.accessToken,
        );
        await this.cacheToken(runtime, payload);
        return payload.access_token;
      } catch {
        await this.clearToken(runtime);
      }
    }

    const payload = await this.requestToken(
      runtime,
      new URLSearchParams({
        grant_type: 'password',
        client_id: runtime.clientId,
        client_secret: runtime.clientSecret,
        username: runtime.username,
        password: runtime.password,
      }),
    );
    await this.cacheToken(runtime, payload);
    return payload.access_token;
  }

  private async requestToken(
    runtime: FactusRuntime,
    body: URLSearchParams,
    authorizationToken?: string,
  ): Promise<RequiredAccessToken> {
    const endpoint = `${trimTrailingSlash(runtime.baseUrl)}/oauth/token`;
    const response = await this.fetchJson(endpoint, {
      method: 'POST',
      timeoutMs: runtime.timeoutMs,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(authorizationToken ? { Authorization: `Bearer ${authorizationToken}` } : {}),
      },
      rawBody: body,
    });
    if (response.httpStatus < 200 || response.httpStatus >= 300) {
      throw new FactusProviderError({
        message: `Factus authentication failed with HTTP ${response.httpStatus}.`,
        httpStatus: response.httpStatus,
        endpoint,
        responsePayload: response.payload,
        retryAfterSeconds: response.retryAfterSeconds,
      });
    }
    const tokenPayload = response.payload as FactusTokenResponse;
    if (!tokenPayload.access_token) {
      throw new FactusProviderError({
        message: 'Factus authentication response did not include an access token.',
        endpoint,
        responsePayload: response.payload,
        isRetryable: false,
      });
    }
    return tokenPayload as RequiredAccessToken;
  }

  private async readToken(runtime: FactusRuntime): Promise<FactusTokenCache | null> {
    const key = this.tokenKey(runtime);
    const local = this.localTokens.get(key);
    if (local) {
      return local;
    }
    if (!this.redis || !this.cipher) {
      return null;
    }
    try {
      const serialized = await this.redis.get(key);
      if (!serialized) {
        return null;
      }
      const parsed = JSON.parse(this.cipher.decryptOpaque(serialized)) as FactusTokenCache;
      if (!parsed.accessToken || !parsed.expiresAtMs) {
        return null;
      }
      this.localTokens.set(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private async cacheToken(runtime: FactusRuntime, payload: RequiredAccessToken): Promise<void> {
    const expiresInSeconds = Math.max(60, payload.expires_in ?? 600);
    const cached: FactusTokenCache = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAtMs: Date.now() + Math.max(1, expiresInSeconds - 60) * 1000,
    };
    const key = this.tokenKey(runtime);
    this.localTokens.set(key, cached);
    if (!this.redis || !this.cipher) {
      return;
    }
    try {
      await this.redis.set(
        key,
        this.cipher.encryptOpaque(JSON.stringify(cached)),
        'PX',
        expiresInSeconds * 1000,
      );
    } catch {
      // Redis is a resilience optimization; an in-process cache is still safe.
    }
  }

  private async clearToken(runtime: FactusRuntime): Promise<void> {
    const key = this.tokenKey(runtime);
    this.localTokens.delete(key);
    try {
      await this.redis?.del(key);
    } catch {
      // The next token request will overwrite a stale remote cache entry.
    }
  }

  private tokenKey(runtime: FactusRuntime): string {
    return `gastroai:factus:token:${runtime.tenantId}:${runtime.environment}`;
  }

  private assertCircuitClosed(runtime: FactusRuntime): void {
    const breaker = this.breakers.get(this.tokenKey(runtime));
    if (breaker && breaker.openUntil > Date.now()) {
      throw new FactusProviderError({
        message: 'Factus circuit is temporarily open for this tenant.',
        retryAfterSeconds: Math.ceil((breaker.openUntil - Date.now()) / 1000),
      });
    }
  }

  private recordCircuitSuccess(runtime: FactusRuntime): void {
    this.breakers.delete(this.tokenKey(runtime));
  }

  private recordCircuitFailure(runtime: FactusRuntime, httpStatus?: number): void {
    if (httpStatus && httpStatus < 500 && httpStatus !== 429) {
      return;
    }
    const key = this.tokenKey(runtime);
    const previous = this.breakers.get(key) ?? { failures: 0, openUntil: 0 };
    const failures = previous.failures + 1;
    this.breakers.set(key, {
      failures,
      openUntil: failures >= 5 ? Date.now() + 30_000 : 0,
    });
  }

  private async fetchJson(
    endpoint: string,
    input: {
      method: FactusHttpMethod;
      timeoutMs: number;
      headers: Record<string, string>;
      body?: unknown;
      rawBody?: URLSearchParams | FormData;
    },
  ): Promise<Omit<FactusHttpResult, 'endpoint'>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: input.method,
        headers: input.headers,
        signal: controller.signal,
        body: input.rawBody ?? (input.body === undefined ? undefined : JSON.stringify(input.body)),
      });
      const text = await response.text();
      return {
        httpStatus: response.status,
        payload: parseJson(text),
        retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')),
      };
    } catch (error) {
      throw new FactusProviderError({
        message: error instanceof Error ? error.message : 'Factus request failed.',
        endpoint,
        isRetryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private track(input: {
    operation: IntegrationOperation;
    status: IntegrationLogStatus;
    httpStatus?: number | null;
    errorCode?: string | null;
    message?: string | null;
    latencyMs?: number | null;
  }): Promise<void> {
    return (
      this.telemetry?.tryRecord({ provider: IntegrationProvider.FACTUS, ...input }) ??
      Promise.resolve()
    );
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function statusForHttp(status: number): IntegrationLogStatus {
  return status === 408 || status === 409 || status === 429 || status >= 500
    ? IntegrationLogStatus.WARNING
    : IntegrationLogStatus.ERROR;
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
