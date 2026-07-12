import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../config/env.schema';
import { REDIS_CLIENT } from './redis.constants';
import { normalizeRedisUrl } from './redis-url';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const logger = new Logger('RedisModule');
        const client = new Redis(normalizeRedisUrl(config.get('REDIS_URL', { infer: true })), {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
        client.on('error', (error) => {
          logger.warn(`Redis cache unavailable: ${error.message}`);
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
