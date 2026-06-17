import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import {
  ApiErrorCode,
  defaultErrorCodeForStatus,
} from './api-error-code';

interface PrismaErrorMapping {
  status: number;
  code: string;
  message: string;
}

const PRISMA_ERROR_MAP: Record<string, PrismaErrorMapping> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: ApiErrorCode.CONFLICT,
    message: 'A record with these values already exists.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: ApiErrorCode.NOT_FOUND,
    message: 'The requested record was not found.',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    code: ApiErrorCode.CONFLICT,
    message: 'The operation conflicts with a related record.',
  },
};

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

interface HttpExceptionResponseObject {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  details?: unknown;
}

export interface ApiErrorContext {
  requestId?: string;
}

export function buildApiErrorEnvelope(
  exception: unknown,
  context: ApiErrorContext = {},
): { status: number; body: ApiErrorEnvelope } {
  if (exception instanceof HttpException) {
    return fromHttpException(exception, context);
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return fromPrismaError(exception, context);
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error.',
        details: withRequestId({}, context.requestId),
      },
    },
  };
}

function fromHttpException(
  exception: HttpException,
  context: ApiErrorContext,
): { status: number; body: ApiErrorEnvelope } {
  const status = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      status,
      body: {
        error: {
          code: defaultErrorCodeForStatus(status),
          message: response,
          details: withRequestId({}, context.requestId),
        },
      },
    };
  }

  const objectResponse = asExceptionResponseObject(response);
  const validationMessages = Array.isArray(objectResponse.message)
    ? objectResponse.message
    : undefined;

  const details = mergeDetails(objectResponse.details, {
    validation:
      validationMessages && validationMessages.length > 0
        ? validationMessages
        : undefined,
  });

  const message = validationMessages
    ? 'Validation failed.'
    : getString(objectResponse.message) ??
      getString(objectResponse.error) ??
      exception.message;

  return {
    status,
    body: {
      error: {
        code:
          getString(objectResponse.code) ??
          (validationMessages
            ? ApiErrorCode.VALIDATION_ERROR
            : defaultErrorCodeForStatus(status)),
        message,
        details: withRequestId(details, context.requestId),
      },
    },
  };
}

function fromPrismaError(
  exception: Prisma.PrismaClientKnownRequestError,
  context: ApiErrorContext,
): { status: number; body: ApiErrorEnvelope } {
  const mapping = PRISMA_ERROR_MAP[exception.code];
  if (!mapping) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error.',
          details: withRequestId({}, context.requestId),
        },
      },
    };
  }

  const details = mergeDetails({}, { target: exception.meta?.target });
  return {
    status: mapping.status,
    body: {
      error: {
        code: mapping.code,
        message: mapping.message,
        details: withRequestId(details, context.requestId),
      },
    },
  };
}

function asExceptionResponseObject(
  response: object,
): HttpExceptionResponseObject {
  return response as HttpExceptionResponseObject;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function mergeDetails(
  currentDetails: unknown,
  extraDetails: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    currentDetails &&
    typeof currentDetails === 'object' &&
    !Array.isArray(currentDetails)
      ? { ...(currentDetails as Record<string, unknown>) }
      : {};

  for (const [key, value] of Object.entries(extraDetails)) {
    if (value !== undefined) {
      base[key] = value;
    }
  }

  return base;
}

function withRequestId(
  details: Record<string, unknown>,
  requestId: string | undefined,
): Record<string, unknown> {
  if (!requestId) {
    return details;
  }

  return { ...details, requestId };
}
