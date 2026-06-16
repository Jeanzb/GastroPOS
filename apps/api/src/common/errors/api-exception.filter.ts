import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { buildApiErrorEnvelope } from './api-error-response';

interface RequestWithContext {
  requestId?: string;
}

interface ResponseLike {
  status(statusCode: number): ResponseLike;
  json(body: unknown): void;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<ResponseLike>();
    const { status, body } = buildApiErrorEnvelope(exception, {
      requestId: request.requestId,
    });

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
