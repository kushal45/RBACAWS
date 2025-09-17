import { Controller, Get } from '@nestjs/common';

import { AuditLogServiceService } from './audit-log-service.service';

@Controller()
export class AuditLogServiceController {
  constructor(private readonly auditLogServiceService: AuditLogServiceService) {}

  @Get()
  getHello(): string {
    return this.auditLogServiceService.getHello();
  }
}
