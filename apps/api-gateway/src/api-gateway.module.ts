import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { LoggingModule, LoggingInterceptor } from '../../../libs/common/src';

import { GatewayController } from './controllers/gateway.controller';
import { ProxyService } from './services/proxy.service';
import { ServiceRegistryService } from './services/service-registry.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggingModule.forRoot('api-gateway'),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('THROTTLE_TTL', 60) * 1000,
            limit: configService.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
  ],
  controllers: [GatewayController],
  providers: [
    ServiceRegistryService,
    ProxyService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [ServiceRegistryService, ProxyService],
})
export class ApiGatewayModule {}
