import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@sentinel/shared-types';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.VIEWER;

  @IsOptional()
  @IsUUID('4')
  organizationId?: string;
}
