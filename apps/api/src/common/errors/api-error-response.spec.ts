import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { ApplicationException } from './application.exception';
import { ApiErrorCode } from './api-error-code';
import { buildApiErrorEnvelope } from './api-error-response';

describe('buildApiErrorEnvelope', () => {
  it('wraps validation exceptions in the standard envelope', () => {
    const result = buildApiErrorEnvelope(
      new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      { requestId: 'req-1' },
    );

    expect(result).toEqual({
      status: 400,
      body: {
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Validation failed.',
          details: {
            requestId: 'req-1',
            validation: ['email must be an email'],
          },
        },
      },
    });
  });

  it('preserves application exception codes and details', () => {
    const result = buildApiErrorEnvelope(
      new ApplicationException(409, {
        code: 'PRODUCT_SKU_ALREADY_EXISTS',
        message: 'Product SKU already exists.',
        details: { sku: 'ABC' },
      }),
    );

    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          code: 'PRODUCT_SKU_ALREADY_EXISTS',
          message: 'Product SKU already exists.',
          details: { sku: 'ABC' },
        },
      },
    });
  });

  it('maps built-in HTTP exceptions to default API codes', () => {
    const result = buildApiErrorEnvelope(new ConflictException('Conflict.'));

    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          code: ApiErrorCode.CONFLICT,
          message: 'Conflict.',
          details: {},
        },
      },
    });
  });

  it('maps a Prisma unique violation (P2002) to a 409 conflict', () => {
    const result = buildApiErrorEnvelope(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['tenantId', 'sku'] },
      }),
      { requestId: 'req-9' },
    );

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe(ApiErrorCode.CONFLICT);
    expect(result.body.error.details).toEqual({
      requestId: 'req-9',
      target: ['tenantId', 'sku'],
    });
  });

  it('maps a Prisma missing record (P2025) to a 404 not found', () => {
    const result = buildApiErrorEnvelope(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    );

    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe(ApiErrorCode.NOT_FOUND);
  });

  it('hides unknown exceptions behind an internal error envelope', () => {
    const result = buildApiErrorEnvelope(new Error('database password leaked'));

    expect(result).toEqual({
      status: 500,
      body: {
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error.',
          details: {},
        },
      },
    });
  });
});
