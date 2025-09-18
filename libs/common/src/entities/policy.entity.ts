import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { Resource } from './resource.entity';
import type { Role } from './role.entity';
import type { Tenant } from './tenant.entity';
import type { User } from './user.entity';
import type { PolicyDocument } from '../interfaces';

@Entity('policies')
@Index(['tenantId', 'name'], { unique: true })
@Index(['tenantId', 'active'])
@Index(['version'])
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  document: PolicyDocument;

  @Column({ default: '1.0.0' })
  version: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  roleId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne('Role', 'policies', { nullable: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne('Resource', { nullable: true })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;
}
