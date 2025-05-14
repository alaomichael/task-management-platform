import { Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    console.log('JWT loaded with secret:', process.env.JWT_SECRET);
  }

  async createUser(createUserDto: any) {
      const user = await this.usersService.create(createUserDto);
      if (!user) {
        throw new Error('User creation failed');
      }  
      return user;    
  }

  async validateUser(email: string, password: string): Promise<any> {
    const cachedUser = await this.cacheManager.get<{ password: string; [key: string]: any }>(`user:${email}`);
    if (cachedUser) {
      if (await bcrypt.compare(password, cachedUser.password)) {
        const { password, ...result } = cachedUser;
        return result;
      }
      return null;
    }

    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      await this.cacheManager.set(`user:${email}`, user.toObject(), 60);
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}