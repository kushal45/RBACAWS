import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../';
import type { UserProfile } from '../';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'User profile information' })
  @IsOptional()
  @IsObject()
  profile?: UserProfile;

  @ApiPropertyOptional({
    enum: UserStatus,
    default: UserStatus.PENDING_INVITATION,
    description: 'User status',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role IDs to assign to user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  roleIds?: string[];
}

export class InviteUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'User profile information' })
  @IsOptional()
  @IsObject()
  profile?: UserProfile;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role IDs to assign to user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User profile information' })
  @IsOptional()
  @IsObject()
  profile?: UserProfile;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'User status',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role IDs to assign to user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  roleIds?: string[];
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiPropertyOptional()
  profile?: UserProfile;

  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [String] })
  roles?: string[];
}