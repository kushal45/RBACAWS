import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { LoggingModule, LoggingInterceptor } from '../../../libs/common/src';

import { AuditLogServiceController } from './audit-log-service.controller';
import { AuditLogServiceService } from './audit-log-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot('audit-log-service'),
  ],
  controllers: [AuditLogServiceController],
  providers: [
    AuditLogServiceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AuditLogServiceModule {}
