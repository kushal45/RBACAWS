import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { AuditLogAction, AuditLogResult } from '../enums';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['tenantId', 'action'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'result'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditLogAction,
  })
  action: AuditLogAction;

  @Column({ nullable: true })
  resource: string;

  @Column({
    type: 'enum',
    enum: AuditLogResult,
  })
  result: AuditLogResult;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column('text', { nullable: true })
  details: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.auditLogs)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}