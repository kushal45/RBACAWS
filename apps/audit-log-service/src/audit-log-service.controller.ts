import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { AuditLogServiceService } from './audit-log-service.service';

@ApiTags('Audit Logs')
@Controller()
export class AuditLogServiceController {
  constructor(private readonly auditLogServiceService: AuditLogServiceService) {}

  @Get()
  getHello(): string {
    return this.auditLogServiceService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for Audit Log service' })
  healthCheck(): { status: string; service: string; timestamp: string; version: string } {
    return {
      status: 'healthy',
      service: 'audit-log-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
