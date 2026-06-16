import { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from './api-error-code';

export interface ApplicationExceptionBody {
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApplicationException extends HttpException {
  constructor(status: number, body: ApplicationExceptionBody) {
    super(body, status);
  }
}
