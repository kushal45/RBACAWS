import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { AuditLog } from './libs/common/src/entities/audit-log.entity';
import { AuthCredential } from './libs/common/src/entities/auth-credential.entity';
import { AuthToken } from './libs/common/src/entities/auth-token.entity';
import { Policy } from './libs/common/src/entities/policy.entity';
import { Resource } from './libs/common/src/entities/resource.entity';
import { Role } from './libs/common/src/entities/role.entity';
import { Tenant } from './libs/common/src/entities/tenant.entity';
import { User } from './libs/common/src/entities/user.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'password',
  database: process.env.DATABASE_NAME ?? 'rbac_dev',
  entities: [Tenant, User, Role, Policy, Resource, AuditLog, AuthCredential, AuthToken],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // Never use synchronize in production-like migrations
  logging: process.env.LOG_LEVEL === 'debug',
});
