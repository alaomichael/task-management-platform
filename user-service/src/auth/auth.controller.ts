import { Controller, Post, Get, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Get('ping')
    ping() {
      return 'pong';
    }


  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    debugger;
    return this.usersService.create(createUserDto);
  }


@UseGuards(LocalAuthGuard)
@Post('login')
async login(@Body() loginDto: LoginDto) {
  await this.authService.handleLoginAttempt(loginDto.email);
  const user = await this.authService.validateUser(loginDto.email, loginDto.password);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  await this.authService.resetLoginAttempts(loginDto.email);
  return this.authService.login(user);
}


  @Post('refresh')
  async refresh(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }

}