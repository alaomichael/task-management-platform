import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis/redis.service';
import { RedisController } from './redis/redis.controller';
import { RedisMonitorService } from './redis/redis-monitor.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
   CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        ttl: configService.get<number>('CACHE_TTL', 60), // seconds
        reconnectOnError: () => true, // always try to reconnect
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`🔄 Redis reconnect attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
      }),
    }),
    UsersModule,
    AuthModule,
  ],
  providers: [RedisService,RedisMonitorService],
  controllers: [RedisController],
})
export class AppModule {}