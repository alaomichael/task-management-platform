// src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    if (!user) {
      throw new Error('User creation failed');
    }
    return user;
  }

  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
    const cachedUser = await this.cacheManager.get<any>(`user:${email}`);

    if (cachedUser) {
      const match = await bcrypt.compare(password, cachedUser.password);
      if (match) {
        const { password, ...rest } = cachedUser;
        return plainToInstance(UserResponseDto, rest, { excludeExtraneousValues: true });
      }
      return null;
    }

    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const userObj = user.toObject();
      const { password: pwd, ...safeUser } = userObj;

      // ⚠️ Don’t cache password in real-world app; remove it
      await this.cacheManager.set(`user:${email}`, safeUser, 60);

      return plainToInstance(UserResponseDto, safeUser, { excludeExtraneousValues: true });
    }

    return null;
  }

  async login(user: UserResponseDto): Promise<{ access_token: string }> {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
