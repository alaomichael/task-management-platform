// src/users/dto/user-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { Role } from 'src/common/enums/role.enum';

export class UserResponseDto {
  @Expose()
  readonly _id: string;

  @Expose()
  readonly email: string;

  @Expose()
  readonly name: string;

  @Expose()
  readonly createdAt: Date;

  @Expose()
  readonly updatedAt: Date;

  @Expose()
  readonly roles: Role[];

  @Exclude()
  readonly password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
