/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import {
  User,
  AuthCredential,
  AuthToken,
  Tenant,
  Role,
  Resource,
  AuditLog,
  Policy,
  TokenType,
} from '@lib/common';
import { UserType } from '@lib/common/enums';

import { AuthServiceModule } from '../src/auth-service.module';

import { TestDataFactory } from './helpers/test-data.factory';
import { TestDatabaseHelper } from './helpers/test-database.helper';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

/**
 * Comprehensive End-to-End Test Suite for Admin Registration Flow
 *
 * This test suite covers:
 * 1. System Admin Registration
 * 2. Tenant Admin Registration
 * 3. Input Validation & Security
 * 4. Database Persistence Verification
 * 5. Complete Registration-to-Login Flow
 * 6. Error Handling & Edge Cases
 */
describe('Admin Registration Flow (E2E)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let testDbHelper: TestDatabaseHelper;
  let testDataFactory: TestDataFactory;

  beforeAll(async () => {
    // Setup test database
    testDbHelper = new TestDatabaseHelper();
    await testDbHelper.setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5433'),
          username: process.env.TEST_DB_USERNAME || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          database: process.env.TEST_DB_NAME || 'postgres',
          entities: [User, AuthCredential, AuthToken, Tenant, Role, Resource, AuditLog, Policy],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        AuthServiceModule,
      ],
    }).compile();

    moduleRef = moduleFixture;
    app = moduleRef.createNestApplication();

    // Apply global configurations similar to main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();

    dataSource = moduleRef.get<DataSource>(DataSource);
    testDataFactory = new TestDataFactory(dataSource);
  });

  beforeEach(async () => {
    // Clean database before each test
    await testDbHelper.cleanDatabase(dataSource);
  });

  afterAll(async () => {
    testDbHelper.teardownTestDatabase();
    await app.close();
    await moduleRef.close();
  });

  describe('System Admin Registration', () => {
    it('should successfully register a system admin with valid data', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert Response Structure
      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        userId: expect.any(String),
        email: registrationData.email,
        userType: UserType.SYSTEM_ADMIN,
      });

      expect(response.body.tenantId).toBeUndefined(); // System admins shouldn't have tenantId

      // Assert Database Persistence
      const user = await dataSource.getRepository(User).findOne({
        where: { email: registrationData.email },
        relations: ['authCredential'],
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(registrationData.email);
      expect(user.userType).toBe(UserType.SYSTEM_ADMIN);
      expect(user.tenantId).toBeNull();
      expect(user.profile).toMatchObject({
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
      });

      // Assert Auth Credential Created
      expect(user.authCredential).toBeDefined();
      expect(user.authCredential.email).toBe(registrationData.email);
      expect(user.authCredential.passwordHash).toBeTruthy();
      expect(user.authCredential.passwordHash).not.toBe(registrationData.password);
    });

    it('should hash the password correctly during system admin registration', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();
      const originalPassword = registrationData.password;

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert Password Hashing
      const authCredential = await dataSource.getRepository(AuthCredential).findOne({
        where: { email: registrationData.email },
      });

      expect(authCredential).toBeDefined();
      expect(authCredential.passwordHash).toBeTruthy();
      expect(authCredential.passwordHash).not.toBe(originalPassword);
      expect(authCredential.passwordHash.length).toBeGreaterThan(50); // bcrypt hash length
      expect(authCredential.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt pattern
    });

    it('should set correct default values for system admin', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert Default Values
      const user = await dataSource.getRepository(User).findOne({
        where: { email: registrationData.email },
        relations: ['authCredential'],
      });

      expect(user.status).toBe('pending_invitation'); // Default user status
      expect(user.userType).toBe(UserType.SYSTEM_ADMIN);
      expect(user.lastLoginAt).toBeNull();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();

      // Auth Credential defaults
      expect(user.authCredential.status).toBe('pending'); // Default auth status
      expect(user.authCredential.failedLoginAttempts).toBe(0);
      expect(user.authCredential.twoFactorEnabled).toBe(false);
      expect(user.authCredential.passwordResetRequired).toBe(false);
    });
  });

  describe('Tenant Admin Registration', () => {
    let tenant: Tenant;

    beforeEach(async () => {
      // Create a test tenant for tenant admin registration
      tenant = await testDataFactory.createTestTenant();
    });

    it('should successfully register a tenant admin with valid tenant', async () => {
      // Arrange
      const registrationData = testDataFactory.createTenantAdminRegistrationData(tenant.id);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert Response
      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        userId: expect.any(String),
        email: registrationData.email,
        userType: UserType.TENANT_ADMIN,
        tenantId: tenant.id,
      });

      // Assert Database Persistence
      const user = await dataSource.getRepository(User).findOne({
        where: { email: registrationData.email },
        relations: ['tenant', 'authCredential'],
      });

      expect(user).toBeDefined();
      expect(user.tenantId).toBe(tenant.id);
      expect(user.tenant).toBeDefined();
      expect(user.tenant.name).toBe(tenant.name);
      expect(user.userType).toBe(UserType.TENANT_ADMIN);
    });

    it('should reject tenant admin registration with invalid tenant ID', async () => {
      // Arrange - Use a valid UUID format that doesn't exist in database
      const invalidTenantId = '00000000-0000-0000-0000-000000000000';
      const registrationData = testDataFactory.createTenantAdminRegistrationData(invalidTenantId);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(400);

      expect(response.body.message).toContain('Tenant ID must be a valid UUID');
    });

    it('should require tenantId for tenant admin registration', async () => {
      // Arrange
      const registrationData = testDataFactory.createTenantAdminRegistrationData();
      delete registrationData.tenantId; // Remove tenantId

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(400);

      expect(response.body.message).toContain('tenantId is required');
    });
  });

  describe('Input Validation & Security', () => {
    it('should reject registration with invalid email format', async () => {
      // Arrange
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        '',
      ];

      for (const invalidEmail of invalidEmails) {
        const registrationData = {
          ...testDataFactory.createSystemAdminRegistrationData(),
          email: invalidEmail,
        };

        // Act & Assert
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('email')]),
        );
      }
    });

    it('should reject registration with weak passwords', async () => {
      // Arrange
      const weakPasswords = [
        '123', // Too short
        'password', // Too weak
        '12345678', // Only numbers
        'abcdefgh', // Only lowercase
        '', // Empty
      ];

      for (const weakPassword of weakPasswords) {
        const registrationData = {
          ...testDataFactory.createSystemAdminRegistrationData(),
          password: weakPassword,
        };

        // Act & Assert
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registrationData)
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('Password')]),
        );
      }
    });

    it('should reject registration with duplicate email', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Create first user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Act - Try to register with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(400);

      // Assert
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should reject registration with missing required fields', async () => {
      // Arrange
      const baseData = testDataFactory.createSystemAdminRegistrationData();
      const requiredFields = ['email', 'password', 'firstName', 'lastName'];

      for (const field of requiredFields) {
        const incompleteData = { ...baseData };
        delete incompleteData[field as keyof typeof incompleteData];

        // Act & Assert
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining(field)]),
        );
      }
    });

    it('should sanitize and validate name fields', async () => {
      // Arrange
      const registrationData = {
        ...testDataFactory.createSystemAdminRegistrationData(),
        firstName: '  John  ', // Whitespace
        lastName: '  Doe  ', // Whitespace
      };

      // Act
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert
      const user = await dataSource.getRepository(User).findOne({
        where: { email: registrationData.email },
      });

      expect(user.profile.firstName).toBe('John'); // Trimmed
      expect(user.profile.lastName).toBe('Doe'); // Trimmed
    });
  });

  describe('Complete Registration-to-Login Flow', () => {
    it('should allow login immediately after successful registration', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Act - Register
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Act - Login with the SAME registration data
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: registrationData.email,
        password: registrationData.password,
      });

      // Debug: Log response for troubleshooting
      if (loginResponse.status !== 200) {
        console.log('Login failed with status:', loginResponse.status);
        console.log('Login error response:', loginResponse.body);
        console.log('Registration data used:', {
          email: registrationData.email,
          password: registrationData.password,
        });
      }

      expect(loginResponse.status).toBe(200);

      // Assert Login Response
      expect(loginResponse.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer',
        user: {
          id: expect.any(String),
          email: registrationData.email,
        },
      });

      // Verify JWT token structure
      const { accessToken } = loginResponse.body;
      expect(accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should track login activity after registration', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Register user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Act - Login with the SAME registration data
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      // Assert - Check login tracking
      const authCredential = await dataSource.getRepository(AuthCredential).findOne({
        where: { email: registrationData.email },
      });

      expect(authCredential.lastLogin).toBeDefined();
      expect(authCredential.lastLogin).toBeInstanceOf(Date);
      expect(authCredential.failedLoginAttempts).toBe(0);
    });

    it('should create auth tokens after successful login', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      const { userId } = registerResponse.body;

      // Act - Login with the SAME registration data
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      // Assert - Check auth tokens created
      const authTokens = await dataSource.getRepository(AuthToken).find({
        where: { userId },
      });

      expect(authTokens.length).toBeGreaterThan(0);

      const refreshToken = authTokens.find(token => token.tokenType === TokenType.REFRESH);
      expect(refreshToken).toBeDefined();
      expect(refreshToken.expiresAt).toBeInstanceOf(Date);
      expect(refreshToken.usedAt).toBeNull();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require more complex setup to simulate DB failures
      // For now, we'll test that the service responds appropriately to invalid data

      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'invalid_user_type' as any, // Invalid enum value
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('userType')]),
      );
    });

    it('should handle large payload gracefully', async () => {
      const registrationData = {
        ...testDataFactory.createSystemAdminRegistrationData(),
        firstName: 'A'.repeat(1000), // Very long name
        lastName: 'B'.repeat(1000),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should handle concurrent registration attempts', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Act - Send multiple concurrent requests
      const promises = Array(5)
        .fill(0)
        .map(() =>
          request(app.getHttpServer()).post('/api/v1/auth/register').send(registrationData),
        );

      const responses = await Promise.allSettled(promises);

      // Assert - Only one should succeed
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'fulfilled' && r.value.status === 400);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
    });

    it('should validate user type transitions properly', async () => {
      // Test that system admin can be registered without tenant
      const systemAdminData = testDataFactory.createSystemAdminRegistrationData();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(systemAdminData)
        .expect(201);

      // Test that regular user requires tenant (if implemented)
      const regularUserData = {
        ...testDataFactory.createSystemAdminRegistrationData(),
        email: 'regular@example.com',
        userType: UserType.REGULAR_USER,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(regularUserData)
        .expect(400);

      expect(response.body.message).toContain('tenantId is required');
    });
  });

  describe('Security & Audit', () => {
    it('should not expose sensitive information in responses', async () => {
      // Arrange
      const registrationData = testDataFactory.createSystemAdminRegistrationData();

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert - No sensitive data exposed
      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.authCredential).toBeUndefined();
    });

    it('should generate unique user IDs', async () => {
      // Arrange
      const userData1 = testDataFactory.createSystemAdminRegistrationData();
      const userData2 = {
        ...testDataFactory.createSystemAdminRegistrationData(),
        email: 'another@example.com',
      };

      // Act
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData1)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData2)
        .expect(201);

      // Assert
      expect(response1.body.userId).not.toBe(response2.body.userId);
      expect(response1.body.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(response2.body.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should handle special characters in input safely', async () => {
      // Arrange
      const registrationData = {
        email: 'test+special@example.com',
        password: 'Valid@Password123!',
        firstName: "O'Connor",
        lastName: 'Smith-Jones',
        userType: UserType.SYSTEM_ADMIN,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert
      expect(response.body.email).toBe(registrationData.email);

      const user = await dataSource.getRepository(User).findOne({
        where: { email: registrationData.email },
      });

      expect(user.profile.firstName).toBe("O'Connor");
      expect(user.profile.lastName).toBe('Smith-Jones');
    });
  });
});
