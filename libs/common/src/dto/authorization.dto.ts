import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class AuthorizationRequestDto {
  @ApiProperty({ description: 'User ID requesting access' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Action being performed' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ description: 'Resource being accessed' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiPropertyOptional({ description: 'Additional context for authorization' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class AuthorizationResponseDto {
  @ApiProperty({ description: 'Whether the action is allowed' })
  allowed: boolean;

  @ApiProperty({ description: 'Reason for the decision' })
  reason: string;

  @ApiProperty({
    type: [String],
    description: 'List of policies that were evaluated',
  })
  evaluatedPolicies: string[];

  @ApiProperty({
    description: 'Final decision (Allow/Deny)',
    enum: ['Allow', 'Deny'],
  })
  decision: string;
}

export class PolicySimulationRequestDto {
  @ApiProperty({ description: 'User ID to simulate for' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    type: [String],
    description: 'Actions to test',
  })
  @IsArray()
  @IsString({ each: true })
  actions: string[];

  @ApiProperty({
    type: [String],
    description: 'Resources to test against',
  })
  @IsArray()
  @IsString({ each: true })
  resources: string[];

  @ApiPropertyOptional({ description: 'Additional context for simulation' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class PolicySimulationResultDto {
  @ApiProperty()
  request: PolicySimulationRequestDto;

  @ApiProperty({
    type: [Object],
    description: 'Results for each action-resource combination',
  })
  results: {
    action: string;
    resource: string;
    allowed: boolean;
    reason: string;
    matchedPolicies: string[];
  }[];
}
