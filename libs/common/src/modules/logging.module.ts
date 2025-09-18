import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';

import { LoggingConfigService } from '../config/logging.config';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => {
        const serviceName = process.env.SERVICE_NAME || 'rbac-service';
        return LoggingConfigService.createWinstonOptions(serviceName);
      },
    }),
  ],
  providers: [EnterpriseLoggerService],
  exports: [EnterpriseLoggerService, WinstonModule],
})
export class LoggingModule {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static forRoot(serviceName?: string) {
    return {
      module: LoggingModule,
      imports: [
        WinstonModule.forRootAsync({
          useFactory: () => {
            const service = serviceName || process.env.SERVICE_NAME || 'rbac-service';
            return LoggingConfigService.createWinstonOptions(service);
          },
        }),
      ],
      providers: [EnterpriseLoggerService],
      exports: [EnterpriseLoggerService, WinstonModule],
    };
  }
}
