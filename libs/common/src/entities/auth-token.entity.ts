import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { User } from './user.entity';

export enum TokenType {
  INVITATION = 'invitation',
  ACTIVATION = 'activation',
  PASSWORD_RESET = 'password_reset',
  REFRESH = 'refresh',
  TWO_FACTOR = 'two_factor',
}

@Entity('auth_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId', 'tokenType'])
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'token_type',
    type: 'enum',
    enum: TokenType,
  })
  tokenType: TokenType;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne('User', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return !!this.usedAt;
  }

  get isRevoked(): boolean {
    return !!this.revokedAt;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isUsed && !this.isRevoked;
  }
}
