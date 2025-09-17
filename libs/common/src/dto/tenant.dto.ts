import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../';
import type { TenantConfig } from '../';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Tenant slug (URL-safe identifier)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Tenant description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
    description: 'Tenant status',
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Tenant configuration' })
  @IsOptional()
  @IsObject()
  config?: TenantConfig;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Tenant name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Tenant description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: TenantStatus,
    description: 'Tenant status',
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Tenant configuration' })
  @IsOptional()
  @IsObject()
  config?: TenantConfig;
}

export class TenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TenantStatus })
  status: TenantStatus;

  @ApiPropertyOptional()
  config?: TenantConfig;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}