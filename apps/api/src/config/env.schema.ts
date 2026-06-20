import { z } from 'zod';

/**
 * Single source of truth for environment configuration.
 * Validation happens once at startup so the app fails fast on misconfiguration.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_GLOBAL_PREFIX: z.string().min(1).default('api/v1'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1_209_600),
  JWT_ISSUER: z.string().min(1).default('gastroai-api'),
  JWT_AUDIENCE: z.string().min(1).default('gastroai-app'),

  TENANT_JWT_ACCESS_SECRET: z.string().min(1).optional(),
  TENANT_JWT_ISSUER: z.string().min(1).optional(),
  PLATFORM_JWT_ACCESS_SECRET: z.string().min(1).optional(),
  PLATFORM_JWT_ISSUER: z.string().min(1).optional(),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // When unset, Swagger is served only outside production.
  ENABLE_SWAGGER: z.stringbool().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const normalizedConfig = {
    ...config,
    TENANT_JWT_ACCESS_SECRET: config.TENANT_JWT_ACCESS_SECRET ?? config.JWT_ACCESS_SECRET,
    TENANT_JWT_ISSUER: config.TENANT_JWT_ISSUER ?? config.JWT_ISSUER ?? 'gastroai-api',
    PLATFORM_JWT_ACCESS_SECRET:
      config.PLATFORM_JWT_ACCESS_SECRET ?? config.JWT_ACCESS_SECRET,
    PLATFORM_JWT_ISSUER: config.PLATFORM_JWT_ISSUER ?? 'gastroai-platform-api',
  };
  const result = envSchema.safeParse(normalizedConfig);

  if (!result.success) {
    const message = z.prettifyError(result.error);
    throw new Error(`Invalid environment variables:\n${message}`);
  }

  return result.data;
}
