import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonService } from './common.service';
import { AuditLog } from './entities/audit-log.entity';
import { Policy } from './entities/policy.entity';
import { Resource } from './entities/resource.entity';
import { Role } from './entities/role.entity';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';

// Import all entities

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Tenant, User, Role, Policy, Resource, AuditLog]),
  ],
  providers: [CommonService],
  exports: [CommonService, TypeOrmModule],
})
export class CommonModule {}
