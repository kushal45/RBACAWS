import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { TenantStatus } from '../enums';

import type { AuditLog } from './audit-log.entity';
import type { Resource } from './resource.entity';
import type { Role } from './role.entity';
import type { User } from './user.entity';
import type { TenantConfig } from '../interfaces';

@Entity('tenants') // Unsafe call of a(n) `error` type typed value.
@Index(['status'])
@Index(['slug'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column('jsonb', { nullable: true })
  config: TenantConfig;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany('User', 'tenant')
  users: User[];

  @OneToMany('Role', 'tenant')
  roles: Role[];

  @OneToMany('Resource', 'tenant')
  resources: Resource[];

  @OneToMany('AuditLog', 'tenant')
  auditLogs: AuditLog[];
}
