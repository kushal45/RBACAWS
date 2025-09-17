import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
  IsUUID,
} from 'class-validator';

import { UserType } from '../../../../libs/common/src/enums';

export class LoginRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@acme.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Tenant ID for multi-tenant isolation',
    example: 'tenant-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 'user-789',
      email: 'john.doe@acme.com',
      tenantId: 'tenant-123',
    },
  })
  user: {
    id: string;
    email: string;
    tenantId: string;
  };
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ValidateTokenRequestDto {
  @ApiProperty({
    description: 'JWT token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'User information if token is valid',
    example: {
      id: 'user-789',
      email: 'john.doe@acme.com',
      tenantId: 'tenant-123',
    },
    required: false,
  })
  user?: {
    id: string;
    email: string;
    tenantId: string;
  };

  @ApiProperty({
    description: 'Error message if token is invalid',
    example: 'Token expired',
    required: false,
  })
  error?: string;
}

export class LogoutRequestDto {
  @ApiProperty({
    description: 'JWT token to invalidate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Logout success message',
    example: 'Successfully logged out',
  })
  message: string;
}

export class UserRegistrationRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) as string)
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) as string)
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @ApiProperty({
    description: 'User type',
    example: 'system_admin',
    enum: UserType,
    required: false,
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiProperty({
    description: 'Tenant ID for non-system admin users',
    example: 'tenant-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsUUID(4, { message: 'Tenant ID must be a valid UUID' })
  tenantId?: string;
}

export class UserRegistrationResponseDto {
  @ApiProperty({
    description: 'Registration success message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User type',
    example: 'system_admin',
    enum: UserType,
  })
  userType: UserType;

  @ApiProperty({
    description: 'Tenant ID if applicable',
    example: 'tenant-uuid-123',
    required: false,
  })
  tenantId?: string;
}
