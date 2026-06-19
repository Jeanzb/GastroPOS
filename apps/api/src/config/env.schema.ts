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

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // When unset, Swagger is served only outside production.
  ENABLE_SWAGGER: z.stringbool().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const message = z.prettifyError(result.error);
    throw new Error(`Invalid environment variables:\n${message}`);
  }

  return result.data;
}
