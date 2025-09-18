import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { RbacCoreService } from './rbac-core.service';

@ApiTags('RBAC Core')
@Controller()
export class RbacCoreController {
  constructor(private readonly rbacCoreService: RbacCoreService) {}

  @Get()
  getHello(): string {
    return this.rbacCoreService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for RBAC Core service' })
  healthCheck(): { status: string; service: string; timestamp: string; version: string } {
    return {
      status: 'healthy',
      service: 'rbac-core',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
