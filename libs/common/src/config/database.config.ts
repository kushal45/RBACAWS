import { AuditLog } from '../entities/audit-log.entity';
import { Policy } from '../entities/policy.entity';
import { Resource } from '../entities/resource.entity';
import { Role } from '../entities/role.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';

import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: configService.get('DATABASE_PORT', 5432),
    username: configService.get('DATABASE_USERNAME', 'postgres'),
    password: configService.get('DATABASE_PASSWORD', 'password'),
    database: configService.get('DATABASE_NAME', 'rbac_dev'),
    // Explicitly list all entities for reliable loading
    entities: [Tenant, User, Role, Policy, Resource, AuditLog],
    synchronize: !isProduction, // Only sync in development
    logging: configService.get('LOG_LEVEL') === 'debug' ? 'all' : false,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    extra: {
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
};
