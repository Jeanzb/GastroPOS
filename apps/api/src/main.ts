import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
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
  await app.listen(port);

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
