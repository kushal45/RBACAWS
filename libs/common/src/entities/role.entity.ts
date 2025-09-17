import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';

import { RoleType } from '../enums';

import type { Policy } from './policy.entity';
import type { Tenant } from './tenant.entity';
import type { User } from './user.entity';

@Entity('roles')
@Index(['tenantId', 'name'], { unique: true })
@Index(['tenantId', 'type'])
@Index(['systemRole'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  tenantId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CUSTOM,
  })
  type!: RoleType;

  @Column({ default: false })
  systemRole!: boolean; // For built-in system roles

  @Column('simple-array', { nullable: true })
  permissions?: string[]; // Direct permissions attached to role

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne('Tenant', 'roles')
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToMany('User', 'roles')
  users!: User[];

  @OneToMany('Policy', 'role')
  policies!: Policy[];
}
