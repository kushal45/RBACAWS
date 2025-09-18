import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule, getDatabaseConfig, LoggingModule, LoggingInterceptor } from '@lib/common';

import { AuthorizationController } from './controllers/authorization.controller';
import { TenantController } from './controllers/tenant.controller';
import { RbacCoreController } from './rbac-core.controller';
import { RbacCoreService } from './rbac-core.service';
import { AuthorizationService } from './services/authorization.service';
import { TenantService } from './services/tenant.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggingModule.forRoot('rbac-core'),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('THROTTLE_TTL', 60) * 1000, // Convert to milliseconds
            limit: configService.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    CommonModule,
  ],
  controllers: [RbacCoreController, TenantController, AuthorizationController],
  providers: [
    RbacCoreService,
    TenantService,
    AuthorizationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class RbacCoreModule {}
