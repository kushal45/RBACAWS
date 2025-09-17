import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthServiceService } from './auth-service.service';
import { UserRepository, AuthCredentialRepository, AuthTokenRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

import type {
  LoginRequestDto,
  RefreshTokenRequestDto,
  ValidateTokenRequestDto,
  LogoutRequestDto,
} from './dto/auth.dto';
import type { AuthenticatedUser, JwtPayload } from './interfaces/auth.interface';
import type { TestingModule } from '@nestjs/testing';

describe('AuthServiceService', () => {
  let service: AuthServiceService;
  let jwtAuthService: jest.Mocked<JwtAuthService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-789',
    email: 'john.doe@acme.com',
    tenantId: 'tenant-123',
    passwordHash: 'hashedPassword',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
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

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findBy: jest.fn(),
    };

    const mockAuthCredentialRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockAuthTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

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
      // Mock password hashing for the findUser method
      jwtAuthService.hashPassword.mockResolvedValue('hashedPassword');
      jwtAuthService.verifyPassword.mockResolvedValue(true);
      jwtAuthService.generateTokenPair.mockResolvedValue(mockTokens);

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
      // First, logout to blacklist the token
      service.logout({ token: refreshDto.refreshToken });

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
      // First, logout to blacklist the token
      service.logout({ token: validateDto.token });

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
      const result = service.logout(logoutDto);

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
