// dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString({ each: true })
  roles?: Role[];
}