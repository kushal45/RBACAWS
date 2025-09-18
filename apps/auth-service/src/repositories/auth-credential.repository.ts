import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthCredential, AuthStatus } from '../../../../libs/common/src';

@Injectable()
export class AuthCredentialRepository {
  private readonly logger = new Logger(AuthCredentialRepository.name);

  constructor(
    @InjectRepository(AuthCredential)
    private readonly repository: Repository<AuthCredential>,
  ) {}

  /**
   * Find auth credential by email
   */
  async findByEmail(email: string): Promise<AuthCredential | null> {
    try {
      this.logger.debug(`Finding auth credential for email: ${email}`);

      const credential = await this.repository.findOne({
        where: { email },
        relations: ['user'],
      });

      return credential;
    } catch (error) {
      this.logger.error(`Error finding auth credential by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Find auth credential by user ID
   */
  async findByUserId(userId: string): Promise<AuthCredential | null> {
    try {
      this.logger.debug(`Finding auth credential for user ID: ${userId}`);

      const credential = await this.repository.findOne({
        where: { userId },
        relations: ['user'],
      });

      return credential;
    } catch (error) {
      this.logger.error(`Error finding auth credential by user ID: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Create new auth credential
   */
  async createCredential(data: {
    userId: string;
    email: string;
    passwordHash: string;
    status?: AuthStatus;
  }): Promise<AuthCredential> {
    try {
      this.logger.debug(`Creating auth credential for user: ${data.userId}`);

      const credential = this.repository.create({
        userId: data.userId,
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status ?? AuthStatus.PENDING,
        failedLoginAttempts: 0,
        passwordResetRequired: false,
        twoFactorEnabled: false,
      });

      const savedCredential = await this.repository.save(credential);
      this.logger.debug(`Auth credential created with ID: ${savedCredential.id}`);

      return savedCredential;
    } catch (error) {
      this.logger.error(`Error creating auth credential for user: ${data.userId}`, error);
      throw error;
    }
  }

  /**
   * Update password hash
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      this.logger.debug(`Updating password for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          passwordHash,
          passwordResetRequired: false,
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`Password updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating password for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      this.logger.debug(`Updating last login for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          lastLogin: new Date(),
          failedLoginAttempts: 0, // Reset failed attempts on successful login
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`Last login updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating last login for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(userId: string): Promise<number> {
    try {
      this.logger.debug(`Incrementing failed login attempts for user: ${userId}`);

      const credential = await this.findByUserId(userId);
      if (!credential) {
        throw new Error('Auth credential not found');
      }

      const newAttempts = credential.failedLoginAttempts + 1;

      await this.repository.update(
        { userId },
        {
          failedLoginAttempts: newAttempts,
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`Failed login attempts updated to ${newAttempts} for user: ${userId}`);
      return newAttempts;
    } catch (error) {
      this.logger.error(`Error incrementing failed attempts for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update credential status
   */
  async updateStatus(userId: string, status: AuthStatus): Promise<void> {
    try {
      this.logger.debug(`Updating status to ${status} for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          status,
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`Status updated to ${status} for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating status for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Lock credential due to too many failed attempts
   */
  async lockCredential(userId: string): Promise<void> {
    try {
      this.logger.warn(`Locking credential for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          status: AuthStatus.LOCKED,
          updatedAt: new Date(),
        },
      );

      this.logger.warn(`Credential locked for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error locking credential for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string): Promise<void> {
    try {
      this.logger.debug(`Enabling 2FA for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          twoFactorEnabled: true,
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`2FA enabled for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error enabling 2FA for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId: string): Promise<void> {
    try {
      this.logger.debug(`Disabling 2FA for user: ${userId}`);

      await this.repository.update(
        { userId },
        {
          twoFactorEnabled: false,
          updatedAt: new Date(),
        },
      );

      this.logger.debug(`2FA disabled for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error disabling 2FA for user: ${userId}`, error);
      throw error;
    }
  }
}
