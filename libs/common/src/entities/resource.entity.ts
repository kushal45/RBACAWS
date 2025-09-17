import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { ResourceType } from '../enums';
import { Tenant } from './tenant.entity';
import { Policy } from './policy.entity';

@Entity('resources')
@Index(['tenantId', 'name'], { unique: true })
@Index(['tenantId', 'type'])
@Index(['tenantId', 'arn'], { unique: true })
@Index(['parentResourceId'])
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
    default: ResourceType.DATA_OBJECT,
  })
  type: ResourceType;

  @Column({ unique: true })
  arn: string; // Amazon Resource Name-like identifier

  @Column({ nullable: true })
  parentResourceId: string;

  @Column({ default: '/' })
  path: string;

  @Column({ default: 0 })
  level: number;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.resources)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'parentResourceId' })
  parentResource: Resource;

  @OneToMany(() => Resource, (resource) => resource.parentResource)
  childResources: Resource[];

  @OneToMany(() => Policy, (policy) => policy.resource)
  policies: Policy[];
}