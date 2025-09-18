import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserType, UserStatus } from '@lib/common';

import { AuthStatus } from '../../../libs/common/src/entities/auth-credential.entity';
import { TokenType } from '../../../libs/common/src/entities/auth-token.entity';

import { AuthServiceService } from './auth-service.service';
import { UserRepository, AuthCredentialRepository, AuthTokenRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

import type {
  LoginRequestDto,
  RefreshTokenRequestDto,
  ValidateTokenRequestDto,
  LogoutRequestDto,
} from './dto/auth.dto';
import type { JwtPayload } from './interfaces/auth.interface';
import type { User } from '@lib/common';
import type { TestingModule } from '@nestjs/testing';

describe('AuthServiceService', () => {
  let service: AuthServiceService;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAuthCredentialRepository: jest.Mocked<AuthCredentialRepository>;
  let mockAuthTokenRepository: jest.Mocked<AuthTokenRepository>;

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    status: UserStatus.ACTIVE,
    userType: UserType.REGULAR_USER,
    tenantId: 'tenant-123',
    lastLoginAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    profile: {
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      email: 'test@example.com',
    },
    roles: [],
    auditLogs: [],
    authTokens: [],
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockJwtPayload: JwtPayload = {
    sub: 'user-789',
    email: 'john.doe@acme.com',
    tenantId: 'tenant-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: 'access',
  };

  beforeEach(async () => {
    const mockJwtAuthService = {
      generateTokenPair: jest.fn(),
      validateToken: jest.fn(),
      refreshToken: jest.fn(),
      verifyPassword: jest.fn(),
      hashPassword: jest.fn(),
      validatePasswordStrength: jest.fn(),
      decodeToken: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailAndTenant: jest.fn(),
      findSystemAdminByEmail: jest.fn(),
      createUser: jest.fn(),
      updateStatus: jest.fn(),
      updateProfile: jest.fn(),
      updateLastLogin: jest.fn(),
      activateUser: jest.fn(),
      suspendUser: jest.fn(),
      findUsersByTenant: jest.fn(),
      countUsersByTenant: jest.fn(),
      findSystemAdmins: jest.fn(),
      emailExistsInTenant: jest.fn(),
      systemAdminEmailExists: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockAuthCredentialRepository = {
      findByEmail: jest.fn(),
      findByUserId: jest.fn(),
      createCredential: jest.fn(),
      updatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      updateStatus: jest.fn(),
      lockCredential: jest.fn(),
      enableTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
    } as unknown as jest.Mocked<AuthCredentialRepository>;

    mockAuthTokenRepository = {
      createToken: jest.fn(),
      findValidToken: jest.fn(),
      findUserTokensByType: jest.fn(),
      markTokenAsUsed: jest.fn(),
      revokeToken: jest.fn(),
      revokeUserTokensByType: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
      cleanupOldTokens: jest.fn(),
      hasValidRefreshToken: jest.fn(),
      getTokenStats: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceService,
        { provide: JwtAuthService, useValue: mockJwtAuthService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: AuthCredentialRepository, useValue: mockAuthCredentialRepository },
        { provide: AuthTokenRepository, useValue: mockAuthTokenRepository },
      ],
    }).compile();

    service = module.get<AuthServiceService>(AuthServiceService);
    jwtAuthService = module.get(JwtAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginRequestDto = {
      email: 'john.doe@acme.com',
      password: 'SecurePassword123!',
      tenantId: 'tenant-123',
    };

    it('should successfully login with valid credentials', async () => {
      // Mock user repository to return a user when findByEmail is called
      mockUserRepository.findByEmail.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        userType: UserType.TENANT_ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        profile: null,
        roles: [],
        auditLogs: [],
        authTokens: [],
      });

      // Mock auth credential repository to return password hash
      mockAuthCredentialRepository.findByUserId.mockResolvedValue({
        id: 'auth-cred-id',
        userId: mockUser.id,
        email: mockUser.email,
        passwordHash: 'hashedPassword123',
        status: AuthStatus.ACTIVE,
        failedLoginAttempts: 0,
        passwordResetRequired: false,
        twoFactorEnabled: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: null,
      });

      // Mock updateLastLogin to resolve successfully
      mockAuthCredentialRepository.updateLastLogin.mockResolvedValue(undefined);

      // Mock createToken to resolve successfully
      mockAuthTokenRepository.createToken.mockResolvedValue({
        id: 'token-123',
        userId: mockUser.id,
        tokenType: TokenType.REFRESH,
        tokenHash: 'hashedRefreshToken',
        expiresAt: new Date(),
        createdAt: new Date(),
        isExpired: false,
        isUsed: false,
        isRevoked: false,
        isValid: true,
        user: null,
      });

      // Mock password verification and token generation
      jwtAuthService.verifyPassword.mockResolvedValue(true);
      jwtAuthService.generateTokenPair.mockResolvedValue(mockTokens);
      jwtAuthService.hashPassword.mockResolvedValue('hashedRefreshToken');

      const result = await service.login(loginDto, '192.168.1.1', 'test-agent');

      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: mockTokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          tenantId: mockUser.tenantId,
        },
      });

      expect(jwtAuthService.verifyPassword).toHaveBeenCalledWith(
        loginDto.password,
        expect.any(String),
      );
      expect(jwtAuthService.generateTokenPair).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const invalidLoginDto = { ...loginDto, email: 'invalid@example.com' };

      await expect(service.login(invalidLoginDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jwtAuthService.hashPassword.mockResolvedValue('hashedPassword');
      jwtAuthService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw BadRequestException for too many failed attempts', async () => {
      jwtAuthService.hashPassword.mockResolvedValue('hashedPassword');
      jwtAuthService.verifyPassword.mockResolvedValue(false);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await service.login({ ...loginDto, password: 'wrong' }, '192.168.1.1', 'test-agent');
        } catch {
          // Expected to fail
        }
      }

      await expect(service.login(loginDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle different tenant contexts', async () => {
      const differentTenantDto = { ...loginDto, tenantId: 'different-tenant' };

      await expect(service.login(differentTenantDto, '192.168.1.1', 'test-agent')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('refreshToken', () => {
    const refreshDto: RefreshTokenRequestDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should successfully refresh token', async () => {
      jwtAuthService.refreshToken.mockResolvedValue(mockTokens);
      jwtAuthService.decodeToken.mockReturnValue(mockJwtPayload);

      const result = await service.refreshToken(refreshDto);

      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        expiresIn: mockTokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: mockJwtPayload.sub,
          email: mockJwtPayload.email,
          tenantId: mockJwtPayload.tenantId,
        },
      });

      expect(jwtAuthService.refreshToken).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      // Mock JWT validation for logout
      jwtAuthService.validateToken.mockResolvedValue(mockJwtPayload);

      // First, logout to blacklist the token
      await service.logout({ token: refreshDto.refreshToken });

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtAuthService.refreshToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('validateToken', () => {
    const validateDto: ValidateTokenRequestDto = {
      token: 'valid-access-token',
    };

    it('should successfully validate valid token', async () => {
      jwtAuthService.validateToken.mockResolvedValue(mockJwtPayload);

      const result = await service.validateToken(validateDto);

      expect(result).toEqual({
        valid: true,
        user: {
          id: mockJwtPayload.sub,
          email: mockJwtPayload.email,
          tenantId: mockJwtPayload.tenantId,
        },
      });

      expect(jwtAuthService.validateToken).toHaveBeenCalledWith(validateDto.token);
    });

    it('should return invalid for blacklisted token', async () => {
      // Mock JWT validation for logout
      jwtAuthService.validateToken.mockResolvedValue(mockJwtPayload);

      // First, logout to blacklist the token
      await service.logout({ token: validateDto.token });

      const result = await service.validateToken(validateDto);

      expect(result).toEqual({
        valid: false,
        error: 'Token has been revoked',
      });
    });

    it('should return invalid for expired/invalid token', async () => {
      jwtAuthService.validateToken.mockRejectedValue(new Error('Token expired'));

      const result = await service.validateToken(validateDto);

      expect(result).toEqual({
        valid: false,
        error: 'Token expired',
      });
    });
  });

  describe('logout', () => {
    const logoutDto: LogoutRequestDto = {
      token: 'access-token-to-logout',
    };

    it('should successfully logout user', async () => {
      const result = await service.logout(logoutDto);

      expect(result).toEqual({
        message: 'Successfully logged out',
      });

      // Verify token is blacklisted
      const validateResult = await service.validateToken({
        token: logoutDto.token,
      });
      expect(validateResult.valid).toBe(false);
      expect(validateResult.error).toBe('Token has been revoked');
    });
  });

  describe('changePassword', () => {
    const userId = 'user-789';
    const currentPassword = 'OldPassword123!';
    const newPassword = 'NewPassword456!';

    it('should successfully change password', async () => {
      // Mock userRepository.findById to return a user
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        status: UserStatus.ACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        userType: UserType.REGULAR_USER,
        profile: null,
        roles: [],
        auditLogs: [],
        authTokens: [],
      });

      // Mock authCredentialRepository.findByUserId to return auth credentials
      mockAuthCredentialRepository.findByUserId.mockResolvedValue({
        userId,
        passwordHash: 'hashedOldPassword',
        status: AuthStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        id: 'auth-cred-id',
        email: mockUser.email,
        failedLoginAttempts: 0,
        passwordResetRequired: false,
        twoFactorEnabled: false,
        user: null,
      });

      jwtAuthService.validatePasswordStrength.mockReturnValue({
        valid: true,
        errors: [],
      });
      jwtAuthService.hashPassword.mockResolvedValue('hashedPassword');
      jwtAuthService.verifyPassword.mockResolvedValue(true);

      const result = await service.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({
        message: 'Password changed successfully',
      });

      expect(jwtAuthService.validatePasswordStrength).toHaveBeenCalledWith(newPassword);
      expect(jwtAuthService.verifyPassword).toHaveBeenCalledWith(
        currentPassword,
        expect.any(String),
      );
      expect(jwtAuthService.hashPassword).toHaveBeenCalledWith(newPassword);
    });

    it('should throw BadRequestException for weak password', async () => {
      jwtAuthService.validatePasswordStrength.mockReturnValue({
        valid: false,
        errors: ['Password too weak'],
      });

      await expect(service.changePassword(userId, currentPassword, 'weak')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for invalid current password', async () => {
      // Mock userRepository.findById to return a user
      mockUserRepository.findById.mockResolvedValue({
        id: userId,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        status: UserStatus.ACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        userType: UserType.REGULAR_USER,
        profile: null,
        roles: [],
        auditLogs: [],
        authTokens: [],
      });

      // Mock authCredentialRepository.findByUserId to return auth credentials
      mockAuthCredentialRepository.findByUserId.mockResolvedValue({
        userId,
        passwordHash: 'hashedOldPassword',
        status: AuthStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        id: 'auth-cred-id',
        email: mockUser.email,
        failedLoginAttempts: 0,
        passwordResetRequired: false,
        twoFactorEnabled: false,
        user: null,
      });

      jwtAuthService.validatePasswordStrength.mockReturnValue({
        valid: true,
        errors: [],
      });
      jwtAuthService.hashPassword.mockResolvedValue('hashedPassword');
      jwtAuthService.verifyPassword.mockResolvedValue(false);

      await expect(service.changePassword(userId, 'wrongPassword', newPassword)).rejects.toThrow(
        new UnauthorizedException('Current password is incorrect'),
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      jwtAuthService.validatePasswordStrength.mockReturnValue({
        valid: true,
        errors: [],
      });

      await expect(
        service.changePassword('non-existent-user', currentPassword, newPassword),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });
  });

  describe('rate limiting', () => {
    it('should allow login attempts within rate limit', async () => {
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
        tenantId: 'tenant-123',
      };

      // Make 4 failed attempts (should be allowed)
      for (let i = 0; i < 4; i++) {
        try {
          await service.login(loginDto, '192.168.1.100', 'test-agent');
        } catch {
          // Expected to fail
        }
      }

      // 5th attempt should still be processed (not rate limited yet)
      await expect(service.login(loginDto, '192.168.1.100', 'test-agent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should rate limit after too many failed attempts', async () => {
      const loginDto: LoginRequestDto = {
        email: 'ratelimit@example.com',
        password: 'wrongpassword',
        tenantId: 'tenant-123',
      };

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await service.login(loginDto, '192.168.1.200', 'test-agent');
        } catch {
          // Expected to fail
        }
      }

      // 6th attempt should be rate limited
      await expect(service.login(loginDto, '192.168.1.200', 'test-agent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
