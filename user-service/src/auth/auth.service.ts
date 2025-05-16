// // src/auth/auth.service.ts

// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Inject } from '@nestjs/common';
// import { Cache } from 'cache-manager';
// import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';
// import { UsersService } from '../users/users.service';
// import { CreateUserDto } from '../users/dto/create-user.dto';
// import { LoginDto } from './dto/login.dto';
// import { UserResponseDto } from '../users/dto/user-response.dto';
// import { plainToInstance } from 'class-transformer';

// @Injectable()
// export class AuthService {
//   constructor(
//     private usersService: UsersService,
//     private jwtService: JwtService,
//     @Inject(CACHE_MANAGER) private cacheManager: Cache,
//   ) {}

//   async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
//     const user = await this.usersService.create(createUserDto);
//     if (!user) {
//       throw new Error('User creation failed');
//     }
//     return user;
//   }

//   async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
//     const cachedUser = await this.cacheManager.get<any>(`user:${email}`);

//     if (cachedUser) {
//       const match = await bcrypt.compare(password, cachedUser.password);
//       if (match) {
//         const { password, ...rest } = cachedUser;
//         return plainToInstance(UserResponseDto, rest, { excludeExtraneousValues: true });
//       }
//       return null;
//     }

//     const user = await this.usersService.findByEmail(email);
//     if (user && await bcrypt.compare(password, user.password)) {
//       const userObj = user.toObject();
//       const { password: pwd, ...safeUser } = userObj;

//       // ⚠️ Don’t cache password in real-world app; remove it
//       await this.cacheManager.set(`user:${email}`, safeUser, 60);

//       return plainToInstance(UserResponseDto, safeUser, { excludeExtraneousValues: true });
//     }

//     return null;
//   }

//   async login(user: UserResponseDto): Promise<{ access_token: string; refresh_token: string }> {
//     const payload = {
//       email: user.email,
//       sub: user._id,
//       roles: user.roles, // include role in token
//     };

//     const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
//     const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

//     // TODO: Save refresh_token to DB or Redis

//     return { access_token, refresh_token };
//   }

//   async refreshToken(token: string): Promise<{ access_token: string }> {
//     try {
//       const decoded = this.jwtService.verify(token);
//       const newAccessToken = this.jwtService.sign({ email: decoded.email, sub: decoded.sub }, { expiresIn: '15m' });
//       return { access_token: newAccessToken };
//     } catch (e) {
//       throw new UnauthorizedException('Invalid refresh token');
//     }
//   }

// }


// src/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  Inject,
  Logger,
  HttpException, 
  HttpStatus,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW = 60; // seconds

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.create(createUserDto);
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error('User creation failed', error.stack);
      throw new UnauthorizedException('User creation failed');
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return null;

    const { password: _, ...safeUser } = user.toObject();

    return plainToInstance(UserResponseDto, safeUser, {
      excludeExtraneousValues: true,
    });
  }

  async login(
    user: UserResponseDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Save refresh token to Redis
    await this.cacheManager.set(`refresh_token:${user._id}`, refresh_token, 7 * 24 * 60 * 60, // 7 days
    );

    this.logger.log(`User ${user.email} logged in`);

    return { access_token, refresh_token };
  }

  async refreshToken(
    token: string,
  ): Promise<{ access_token: string }> {
    try {
      const decoded = this.jwtService.verify(token);

      const storedToken = await this.cacheManager.get<string>(
        `refresh_token:${decoded.sub}`,
      );

      if (storedToken !== token) {
        this.logger.warn(`Invalid refresh token for user ${decoded.email}`);
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const newAccessToken = this.jwtService.sign(
        { sub: decoded.sub, email: decoded.email, roles: decoded.roles },
        { expiresIn: '15m' },
      );

      this.logger.log(`Access token refreshed for ${decoded.email}`);
      return { access_token: newAccessToken };
    } catch (error) {
      this.logger.warn('Invalid or expired refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async handleLoginAttempt(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const attempts = (await this.cacheManager.get<number>(key)) || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.cacheManager.set(key, attempts + 1, this.ATTEMPT_WINDOW,
   );
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await this.cacheManager.del(`login_attempts:${email}`);
  }
}
