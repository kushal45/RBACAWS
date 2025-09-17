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
  OneToOne,
  Index,
  JoinColumn,
} from 'typeorm';

import { UserStatus, UserType } from '../enums';

import type { AuditLog } from './audit-log.entity';
import type { AuthCredential } from './auth-credential.entity';
import type { AuthToken } from './auth-token.entity';
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

  @Column({ name: 'tenant_id', nullable: true }) // nullable for system admins
  @Index()
  tenantId?: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_INVITATION,
  })
  status: UserStatus;

  @Column('jsonb', { nullable: true })
  profile: UserProfile;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'invited_at', nullable: true })
  invitedAt?: Date;

  @Column({ name: 'invited_by', nullable: true })
  invitedBy?: string;

  @Column({ name: 'activated_at', nullable: true })
  activatedAt?: Date;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.REGULAR_USER,
  })
  userType: UserType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne('Tenant', 'users', { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @ManyToMany('Role', 'users')
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany('AuditLog', 'user')
  auditLogs: AuditLog[];

  @OneToOne('AuthCredential', 'user', {
    cascade: true,
  })
  authCredential?: AuthCredential;

  @OneToMany('AuthToken', 'user', {
    cascade: true,
  })
  authTokens: AuthToken[];
}
