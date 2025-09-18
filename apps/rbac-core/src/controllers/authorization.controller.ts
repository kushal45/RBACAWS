import { Controller, Post, Body, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import {
  AuthorizationRequestDto,
  AuthorizationResponseDto,
  PolicySimulationRequestDto,
  PolicySimulationResultDto,
  TenantGuard,
  // TenantId,
} from '@lib/common';

import { AuthorizationService } from '../services/authorization.service';

@ApiTags('Authorization')
@ApiBearerAuth()
@Controller('authorization')
@UseGuards(TenantGuard)
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Post('authorize')
  @ApiOperation({
    summary: 'Check if a user is authorized to perform an action on a resource',
    description:
      'Evaluates user permissions against all applicable policies and returns authorization decision',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorization decision made successfully',
    type: AuthorizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async authorize(
    // @TenantId() tenantId: string,
    @Body() request: AuthorizationRequestDto,
  ): Promise<AuthorizationResponseDto> {
    const authorizationRequest = {
      ...request,
      tenantId: 'temp-tenant-id', // TODO: Fix tenant ID extraction
    };

    return this.authorizationService.authorize(authorizationRequest);
  }

  @Post('simulate')
  @ApiOperation({
    summary: 'Simulate policy evaluation for testing',
    description:
      'Test multiple action-resource combinations against user policies without making actual authorization decisions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Policy simulation completed successfully',
    type: PolicySimulationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid simulation request parameters',
  })
  async simulatePolicy(
    // @TenantId() tenantId: string,
    @Body() request: PolicySimulationRequestDto,
  ): Promise<PolicySimulationResultDto> {
    const simulationRequest = {
      ...request,
      tenantId: 'temp-tenant-id', // TODO: Fix tenant ID extraction
    };

    return this.authorizationService.simulatePolicy(simulationRequest);
  }
}
