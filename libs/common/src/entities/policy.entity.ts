import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import type { PolicyDocument } from '../interfaces';
import { Tenant } from './tenant.entity';
import { Role } from './role.entity';
import { User } from './user.entity';
import { Resource } from './resource.entity';

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
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Role, (role) => role.policies, { nullable: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;
}