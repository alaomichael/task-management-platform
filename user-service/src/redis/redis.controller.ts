// src/redis/redis.controller.ts
import {
  Controller,
  Get,
  Inject,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('health')
export class RedisController {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  @Get('redis')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('superadmin','admin') // Optional: restrict to superadmin and admin only
  async checkRedis(@Request() req) {
    try {
      await this.cache.set('ping', 'pong', 5);
      const result = await this.cache.get('ping');
      return { status: 'ok', redis: result };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
