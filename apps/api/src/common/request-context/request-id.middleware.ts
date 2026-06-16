import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';

export const REQUEST_ID_HEADER = 'x-request-id';

interface RequestWithId {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}

interface ResponseWithHeaders {
  setHeader(name: string, value: string): void;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithId,
    response: ResponseWithHeaders,
    next: () => void,
  ): void {
    const headerValue = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof headerValue === 'string' && headerValue.trim().length > 0
        ? headerValue
        : randomUUID();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
