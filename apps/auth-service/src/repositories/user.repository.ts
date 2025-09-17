import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';

import { User, UserStatus, UserType } from '../../../../libs/common/src';

export interface CreateUserData {
  email: string;
  userType: UserType;
  tenantId?: string;
  profile: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  status?: UserStatus;
}

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by ID: ${id}`);

      const user = await this.repository.findOne({
        where: { id },
        relations: ['tenant', 'roles', 'authCredential'],
      });

      return user;
    } catch (error) {
      this.logger.error(`Error finding user by ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by email: ${email}`);

      const user = await this.repository.findOne({
        where: { email },
        relations: ['tenant', 'roles', 'authCredential'],
      });

      return user;
    } catch (error) {
      this.logger.error(`Error finding user by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Find user by email and tenant
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding user by email: ${email} and tenant: ${tenantId}`);

      const user = await this.repository.findOne({
        where: { email, tenantId },
        relations: ['tenant', 'roles', 'authCredential'],
      });

      return user;
    } catch (error) {
      this.logger.error(`Error finding user by email and tenant: ${email}, ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Find system admin by email
   */
  async findSystemAdminByEmail(email: string): Promise<User | null> {
    try {
      this.logger.debug(`Finding system admin by email: ${email}`);

      const user = await this.repository.findOne({
        where: {
          email,
          userType: UserType.SYSTEM_ADMIN,
        },
        relations: ['authCredential'],
      });

      return user;
    } catch (error) {
      this.logger.error(`Error finding system admin by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    try {
      this.logger.debug(`Creating user with email: ${data.email}`);

      const user = this.repository.create({
        email: data.email,
        userType: data.userType,
        tenantId: data.tenantId,
        profile: data.profile,
        status: data.status ?? UserStatus.PENDING_INVITATION,
      });

      const savedUser = await this.repository.save(user);
      this.logger.debug(`User created with ID: ${savedUser.id}`);

      return savedUser;
    } catch (error) {
      this.logger.error(`Error creating user with email: ${data.email}`, error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      this.logger.debug(`Updating status to ${status} for user: ${userId}`);

      await this.repository.update(userId, {
        status,
        updatedAt: new Date(),
      });

      this.logger.debug(`Status updated to ${status} for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating status for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profile: Partial<{ firstName: string; lastName: string; fullName: string }>,
  ): Promise<void> {
    try {
      this.logger.debug(`Updating profile for user: ${userId}`);

      const user = await this.repository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const updatedProfile = { ...user.profile, ...profile };

      await this.repository.update(userId, {
        profile: updatedProfile,
        updatedAt: new Date(),
      });

      this.logger.debug(`Profile updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating profile for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      this.logger.debug(`Updating last login for user: ${userId}`);

      await this.repository.update(userId, {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.debug(`Last login updated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error updating last login for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Mark user as activated
   */
  async activateUser(userId: string): Promise<void> {
    try {
      this.logger.debug(`Activating user: ${userId}`);

      await this.repository.update(userId, {
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.debug(`User activated: ${userId}`);
    } catch (error) {
      this.logger.error(`Error activating user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string): Promise<void> {
    try {
      this.logger.debug(`Suspending user: ${userId}`);

      await this.repository.update(userId, {
        status: UserStatus.SUSPENDED,
        updatedAt: new Date(),
      });

      this.logger.debug(`User suspended: ${userId}`);
    } catch (error) {
      this.logger.error(`Error suspending user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Find users by tenant
   */
  async findUsersByTenant(
    tenantId: string,
    options?: {
      status?: UserStatus;
      userType?: UserType;
      limit?: number;
      offset?: number;
    },
  ): Promise<User[]> {
    try {
      this.logger.debug(`Finding users for tenant: ${tenantId}`);

      const whereClause: FindOptionsWhere<User> = { tenantId };

      if (options?.status) {
        whereClause.status = options.status;
      }

      if (options?.userType) {
        whereClause.userType = options.userType;
      }

      const users = await this.repository.find({
        where: whereClause,
        relations: ['roles', 'authCredential'],
        take: options?.limit,
        skip: options?.offset,
        order: { createdAt: 'DESC' },
      });

      return users;
    } catch (error) {
      this.logger.error(`Error finding users for tenant: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Count users by tenant
   */
  async countUsersByTenant(
    tenantId: string,
    options?: {
      status?: UserStatus;
      userType?: UserType;
    },
  ): Promise<number> {
    try {
      this.logger.debug(`Counting users for tenant: ${tenantId}`);

      const whereClause: FindOptionsWhere<User> = { tenantId };

      if (options?.status) {
        whereClause.status = options.status;
      }

      if (options?.userType) {
        whereClause.userType = options.userType;
      }

      const count = await this.repository.count({ where: whereClause });

      return count;
    } catch (error) {
      this.logger.error(`Error counting users for tenant: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Find system admins
   */
  async findSystemAdmins(): Promise<User[]> {
    try {
      this.logger.debug('Finding system administrators');

      const admins = await this.repository.find({
        where: { userType: UserType.SYSTEM_ADMIN },
        relations: ['authCredential'],
        order: { createdAt: 'ASC' },
      });

      return admins;
    } catch (error) {
      this.logger.error('Error finding system administrators', error);
      throw error;
    }
  }

  /**
   * Check if email exists in tenant
   */
  async emailExistsInTenant(email: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if email exists in tenant: ${email}, ${tenantId}`);

      const count = await this.repository.count({
        where: { email, tenantId },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking email existence: ${email}, ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Check if system admin email exists
   */
  async systemAdminEmailExists(email: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking if system admin email exists: ${email}`);

      const count = await this.repository.count({
        where: {
          email,
          userType: UserType.SYSTEM_ADMIN,
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking system admin email existence: ${email}`, error);
      throw error;
    }
  }
}
