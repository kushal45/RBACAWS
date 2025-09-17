import { v4 as uuidv4 } from 'uuid';

import { Tenant } from '@lib/common';
import { TenantStatus, UserType } from '@lib/common/enums';

import type { TenantConfig } from '@lib/common';
import type { DataSource } from 'typeorm';

/**
 * Test Data Factory
 *
 * Provides factory methods for creating consistent test data
 * for admin registration and related testing scenarios.
 */
export class TestDataFactory {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create system admin registration data
   */
  createSystemAdminRegistrationData() {
    const uniqueId = uuidv4().slice(0, 8);

    return {
      email: `systemadmin.${uniqueId}@rbactest.com`,
      password: 'SecurePassword123!',
      firstName: 'System',
      lastName: 'Administrator',
      userType: UserType.SYSTEM_ADMIN,
    };
  }

  /**
   * Create tenant admin registration data
   */
  createTenantAdminRegistrationData(tenantId?: string) {
    const uniqueId = uuidv4().slice(0, 8);
    return {
      email: `tenantadmin.${uniqueId}@rbactest.com`,
      password: 'SecurePassword123!',
      firstName: 'Tenant',
      lastName: 'Administrator',
      userType: UserType.TENANT_ADMIN,
      tenantId,
    };
  }

  /**
   * Create regular user registration data
   */
  createRegularUserRegistrationData(tenantId: string) {
    const uniqueId = uuidv4().slice(0, 8);

    return {
      email: `user.${uniqueId}@rbactest.com`,
      password: 'SecurePassword123!',
      firstName: 'Regular',
      lastName: 'User',
      userType: UserType.REGULAR_USER,
      tenantId,
    };
  }

  /**
   * Create service account registration data
   */
  createServiceAccountRegistrationData(tenantId?: string) {
    const uniqueId = uuidv4().slice(0, 8);

    const baseData = {
      email: `service.${uniqueId}@rbactest.com`,
      password: 'SecurePassword123!',
      firstName: 'Service',
      lastName: 'Account',
      userType: UserType.SERVICE_ACCOUNT,
    };

    if (tenantId) {
      return {
        ...baseData,
        tenantId,
      };
    }

    return baseData;
  }

  /**
   * Create test tenant
   */
  async createTestTenant() {
    const uniqueId = uuidv4().slice(0, 8);
    const tenantRepository = this.dataSource.getRepository(Tenant);
    const tenant = tenantRepository.create({
      name: `Test Tenant ${uniqueId}`,
      slug: `test-tenant-${uniqueId}`,
      description: `Test tenant for e2e testing - ${uniqueId}`,
      status: TenantStatus.ACTIVE,
      config: {
        allowedDomains: ['rbactest.com'],
        maxUsers: 100,
        features: ['basic', 'advanced'],
      } as TenantConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return tenantRepository.save(tenant);
  }

  /**
   * Create login data for existing user
   */
  createLoginData(email: string, password: string = 'SecurePassword123!') {
    return {
      email,
      password,
    };
  }

  /**
   * Create invalid registration data for testing validation
   */
  createInvalidRegistrationData() {
    return {
      // Missing required fields
      incomplete: {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      },

      // Invalid email formats
      invalidEmail: {
        email: 'invalid-email-format',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.SYSTEM_ADMIN,
      },

      // Weak password
      weakPassword: {
        email: 'test@example.com',
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.SYSTEM_ADMIN,
      },

      // Empty fields
      emptyFields: {
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        userType: UserType.SYSTEM_ADMIN,
      },

      // Invalid user type
      invalidUserType: {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'invalid_type' as unknown as UserType,
      },
    };
  }

  /**
   * Create test data with special characters
   */
  createSpecialCharacterData() {
    const uniqueId = uuidv4().slice(0, 8);

    return {
      email: `test+special.${uniqueId}@rbac-test.com`,
      password: 'Sp3c!al@Ch4rs#123',
      firstName: "O'Connor",
      lastName: 'Smith-Jones',
      userType: UserType.SYSTEM_ADMIN,
    };
  }

  /**
   * Create bulk test users for performance testing
   */
  createBulkUserData(
    count: number,
    userType: UserType = UserType.REGULAR_USER,
    tenantId?: string,
  ): unknown[] {
    const users: unknown[] = [];

    for (let i = 0; i < count; i++) {
      const uniqueId = uuidv4().slice(0, 8);
      const userData = {
        email: `bulkuser${i}.${uniqueId}@rbactest.com`,
        password: 'SecurePassword123!',
        firstName: `User${i}`,
        lastName: `Test${i}`,
        userType,
      };

      if (tenantId && userType !== UserType.SYSTEM_ADMIN) {
        Object.assign(userData, { tenantId });
      }

      users.push(userData);
    }

    return users;
  }

  /**
   * Create concurrent registration data for race condition testing
   */
  createConcurrentRegistrationData(baseEmail: string = 'concurrent@rbactest.com') {
    return {
      email: baseEmail,
      password: 'SecurePassword123!',
      firstName: 'Concurrent',
      lastName: 'User',
      userType: UserType.SYSTEM_ADMIN,
    };
  }

  /**
   * Create test data with boundary values
   */
  createBoundaryValueData() {
    return {
      // Maximum length values
      maxLength: {
        email: `${'a'.repeat(250)}@example.com`, // Close to email limit
        password: `${'A'.repeat(72)}!1a`, // bcrypt max length
        firstName: 'A'.repeat(255),
        lastName: 'B'.repeat(255),
        userType: UserType.SYSTEM_ADMIN,
      },

      // Minimum valid values
      minLength: {
        email: 'a@b.co', // Shortest valid email
        password: 'Pass123!', // 8 characters minimum
        firstName: 'A',
        lastName: 'B',
        userType: UserType.SYSTEM_ADMIN,
      },
    };
  }

  /**
   * Create data for security testing
   */
  createSecurityTestData() {
    return {
      // SQL Injection attempts
      sqlInjection: {
        email: "test'; DROP TABLE users; --@example.com",
        password: "'; UPDATE users SET password='hacked' WHERE '1'='1",
        firstName: "Robert'; DROP TABLE students; --",
        lastName: 'Test',
        userType: UserType.SYSTEM_ADMIN,
      },

      // XSS attempts
      xssAttempt: {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: '<img src=x onerror=alert("xss")>',
        userType: UserType.SYSTEM_ADMIN,
      },

      // Large payload
      largePayload: {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'A'.repeat(10000),
        lastName: 'B'.repeat(10000),
        userType: UserType.SYSTEM_ADMIN,
      },
    };
  }

  /**
   * Generate random valid email
   */
  generateRandomEmail(domain: string = 'rbactest.com'): string {
    const uniqueId = uuidv4().slice(0, 8);
    return `user.${uniqueId}@${domain}`;
  }

  /**
   * Generate random valid password
   */
  generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each required character type
    password += 'A'; // Uppercase
    password += 'a'; // Lowercase
    password += '1'; // Number
    password += '!'; // Special character

    // Fill remaining length with random characters
    for (let i = 4; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    // Clean up any test-specific data
    // This could be expanded to remove specific test records
    const userRepository = this.dataSource.getRepository('User');
    await userRepository.delete({ email: { $like: '%@rbactest.com' } as unknown as string });

    const tenantRepository = this.dataSource.getRepository('Tenant');
    await tenantRepository.delete({ slug: { $like: 'test-tenant-%' } as unknown as string });
  }
}
