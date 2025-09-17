import { Module } from '@nestjs/common';
import { AuditLogServiceController } from './audit-log-service.controller';
import { AuditLogServiceService } from './audit-log-service.service';

@Module({
  imports: [],
  controllers: [AuditLogServiceController],
  providers: [AuditLogServiceService],
})
export class AuditLogServiceModule {}
