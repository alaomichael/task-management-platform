import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisMonitorService implements OnModuleInit {
  private client: Redis;
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error', err.message);
    });

    this.client.on('reconnecting', () => {
      console.warn('🔁 Redis reconnecting...');
    });

    this.client.on('end', () => {
      console.warn('🚫 Redis connection closed');
    });
  }
}
