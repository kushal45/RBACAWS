import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommonModule, getDatabaseConfig } from '@lib/common';

// Controllers
import { RbacCoreController } from './rbac-core.controller';
import { TenantController } from './controllers/tenant.controller';
import { AuthorizationController } from './controllers/authorization.controller';

// Services
import { RbacCoreService } from './rbac-core.service';
import { TenantService } from './services/tenant.service';
import { AuthorizationService } from './services/authorization.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          ttl: configService.get('THROTTLE_TTL', 60) * 1000, // Convert to milliseconds
          limit: configService.get('THROTTLE_LIMIT', 100),
        }],
      }),
    }),
    CommonModule,
  ],
  controllers: [
    RbacCoreController,
    TenantController,
    AuthorizationController,
  ],
  providers: [
    RbacCoreService,
    TenantService,
    AuthorizationService,
  ],
})
export class RbacCoreModule {}
