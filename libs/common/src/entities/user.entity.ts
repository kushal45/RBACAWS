import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';

import { UserStatus } from '../enums';

import type { AuditLog } from './audit-log.entity';
import type { Role } from './role.entity';
import type { Tenant } from './tenant.entity';
import type { UserProfile } from '../interfaces';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  email: string;

  @Column({ select: false }) // Don't select by default for security
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_INVITATION,
  })
  status: UserStatus;

  @Column('jsonb', { nullable: true })
  profile: UserProfile;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  invitedAt: Date;

  @Column({ nullable: true })
  invitedBy: string;

  @Column({ nullable: true })
  invitationToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne('Tenant', 'users')
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToMany('Role', 'users')
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany('AuditLog', 'user')
  auditLogs: AuditLog[];
}
