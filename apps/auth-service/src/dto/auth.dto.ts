import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

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
