import { FactusAdapter } from './factus.adapter';
import type { FactusRuntime } from './factus.types';

describe('FactusAdapter authentication', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refreshes the access token with form-urlencoded body and bearer authorization', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'access_1', refresh_token: 'refresh_1', expires_in: 60 }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'access_2', refresh_token: 'refresh_2', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new FactusAdapter();

    await adapter.testConnection(runtime());
    jest.advanceTimersByTime(31_000);
    await adapter.testConnection(runtime());

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api-sandbox.factus.com.co/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: expect.any(URLSearchParams),
      }),
    );
    expect(readBody(fetchMock.mock.calls[0][1].body)).toMatchObject({
      grant_type: 'password',
      client_id: 'client_id',
      client_secret: 'client_secret',
      username: 'user@example.com',
      password: 'secret',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api-sandbox.factus.com.co/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer access_1',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: expect.any(URLSearchParams),
      }),
    );
    expect(readBody(fetchMock.mock.calls[2][1].body)).toMatchObject({
      grant_type: 'refresh_token',
      client_id: 'client_id',
      client_secret: 'client_secret',
      refresh_token: 'refresh_1',
    });
  });

  it('uses Factus V2 path-variable endpoints for fiscal artifacts and delete by reference', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'access_1', refresh_token: 'refresh_1', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse({ pdf_base_64_encoded: 'PDF' }))
      .mockResolvedValueOnce(jsonResponse({ xml_base_64_encoded: 'XML' }))
      .mockResolvedValueOnce(jsonResponse({ xml_base_64_encoded: 'ATTACHED_XML' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'deleted' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new FactusAdapter();

    await adapter.downloadPdf(runtime(), 'SETP990000550');
    await adapter.downloadXml(runtime(), 'SETP990000550');
    await adapter.downloadAttachedDocumentXml(runtime(), 'SETP990000550');
    await adapter.deleteBillByReference(runtime(), 'sale:tenant_1:sale_1:v1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api-sandbox.factus.com.co/v2/bills/SETP990000550/download-pdf',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api-sandbox.factus.com.co/v2/bills/SETP990000550/download-xml',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://api-sandbox.factus.com.co/v2/bills/SETP990000550/download-attached-document-xml',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'https://api-sandbox.factus.com.co/v2/bills/destroy/reference/sale%3Atenant_1%3Asale_1%3Av1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

function runtime(): FactusRuntime {
  return {
    tenantId: 'tenant_1', environment: 'SANDBOX', baseUrl: 'https://api-sandbox.factus.com.co',
    clientId: 'client_id', clientSecret: 'client_secret', username: 'user@example.com',
    password: 'secret', timeoutMs: 15_000,
  };
}

function jsonResponse(payload: unknown): Response {
  return {
    status: 200,
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as unknown as Response;
}

function readBody(value: unknown): Record<string, string> {
  if (!(value instanceof URLSearchParams)) {
    throw new Error('Expected URLSearchParams request body.');
  }
  return Object.fromEntries(value.entries());
}
