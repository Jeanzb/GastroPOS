import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';

/**
 * Loads and validates environment variables for the whole app.
 * The root .env (shared with Docker Compose) is resolved relative to the
 * package when run via `bun --watch`, and the local .env when run from root.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
