import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService implements OnModuleInit {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async onModuleInit() {
    try {
      // Try setting a test key
      await this.cache.set('redis_health_check', 'ok', 10);
      const value = await this.cache.get('redis_health_check');

      if (value !== 'ok') {
        throw new Error('Redis connection check failed: unexpected value');
      }

      console.log('✅ Redis connection validated successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      // optionally rethrow or exit process for critical error
      // process.exit(1);
    }
  }
}
