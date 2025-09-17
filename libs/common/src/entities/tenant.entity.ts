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
import type { TenantConfig } from '../interfaces';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Resource } from './resource.entity';
import { AuditLog } from './audit-log.entity';

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
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Role, (role) => role.tenant)
  roles: Role[];

  @OneToMany(() => Resource, (resource) => resource.tenant)
  resources: Resource[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.tenant)
  auditLogs: AuditLog[];
}
