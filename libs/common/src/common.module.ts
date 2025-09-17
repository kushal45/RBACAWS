import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CommonService } from './common.service';
import { TenantGuard } from './guards/tenant.guard';

// Import all entities
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Policy } from './entities/policy.entity';
import { Resource } from './entities/resource.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Tenant, User, Role, Policy, Resource, AuditLog]),
  ],
  providers: [CommonService],
  exports: [CommonService, TypeOrmModule],
})
export class CommonModule {}
