import { FiscalInvoiceStatus, Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { FactusProviderError } from './factus/factus.types';
import type { FiscalActor } from './fiscal.types';

export function auditBase(actor: FiscalActor) {
  return {
    tenantId: actor.tenantId,
    branchId: actor.branchId,
    actorUserId: actor.actorUserId,
    requestId: actor.requestId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  };
}

export function asJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof FactusProviderError) {
    return 'The fiscal service request could not be completed.';
  }
  return error instanceof Error ? error.message : 'Unexpected fiscal integration error.';
}

export function invoiceNotFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Fiscal document was not found.',
  });
}

export function requireFiscalBranch(actor: FiscalActor): string {
  if (actor.branchId) {
    return actor.branchId;
  }
  throw new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: 'An active branch is required for fiscal document operations.',
  });
}

export function isAcceptedStatus(status: FiscalInvoiceStatus): boolean {
  return status === FiscalInvoiceStatus.ACCEPTED || status === FiscalInvoiceStatus.ACCEPTED_BY_DIAN;
}

export function jobOptions(jobId: string) {
  return {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 500,
    removeOnFail: 2_000,
  };
}

export function nextRetryDate(error: unknown, attempt = 1): Date | null {
  if (error instanceof FactusProviderError && !error.isRetryable) {
    return null;
  }
  if (error instanceof FactusProviderError && error.retryAfterSeconds) {
    return new Date(Date.now() + error.retryAfterSeconds * 1000);
  }

  const baseSeconds = Math.min(30 * 2 ** Math.max(0, attempt - 1), 1_800);
  const jitterSeconds = Math.floor(Math.random() * Math.max(1, baseSeconds * 0.2));
  return new Date(Date.now() + (baseSeconds + jitterSeconds) * 1000);
}
