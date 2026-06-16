import { BadRequestException, ConflictException } from '@nestjs/common';
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
