import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from './user.entity';

export enum AuthStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
}

@Entity('auth_credentials')
@Index(['email'], { unique: true })
export class AuthCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: AuthStatus,
    default: AuthStatus.PENDING,
  })
  status: AuthStatus;

  @Column({ name: 'failed_login_attempts', type: 'integer', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @Column({ name: 'password_reset_required', type: 'boolean', default: false })
  passwordResetRequired: boolean;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne('User', { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
