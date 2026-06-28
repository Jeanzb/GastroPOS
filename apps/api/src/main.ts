import 'reflect-metadata';
import {
  BadRequestException,
  Logger,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  const globalPrefix = config.get('API_GLOBAL_PREFIX', { infer: true });
  app.setGlobalPrefix(globalPrefix);

  // Security headers.
  app.use(helmet());

  // CORS limited to known origins.
  const corsOrigins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Reject unknown/invalid payload shapes everywhere.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // OpenAPI / Swagger docs — exposed only outside production unless explicitly enabled.
  const enableSwagger =
    config.get('ENABLE_SWAGGER', { infer: true }) ??
    config.get('NODE_ENV', { infer: true }) !== 'production';
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GastroAI API')
      .setDescription('Operational core API for restaurants and food businesses.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port, '0.0.0.0');

  Logger.log(
    `GastroAI API ready at http://localhost:${port}/${globalPrefix}`,
    'Bootstrap',
  );
  if (enableSwagger) {
    Logger.log(
      `Swagger docs at http://localhost:${port}/${globalPrefix}/docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();

function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fields = collectValidationFields(errors);
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Validation failed.',
    details: {
      fields,
      validation: Object.entries(fields).flatMap(([field, messages]) =>
        messages.map((message) => `${field} ${message}`),
      ),
    },
  });
}

function collectValidationFields(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const error of errors) {
    const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];
    if (messages.length > 0) {
      fields[fieldPath] = messages;
    }
    if (error.children?.length) {
      Object.assign(fields, collectValidationFields(error.children, fieldPath));
    }
  }

  return fields;
}
