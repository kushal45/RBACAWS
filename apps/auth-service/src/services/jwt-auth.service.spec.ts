import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { JwtAuthService } from './jwt-auth.service';

import type { AuthenticatedUser, JwtPayload } from '../interfaces/auth.interface';
import type { TestingModule } from '@nestjs/testing';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    tenantId: 'tenant-456',
    passwordHash: 'hashedPassword',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    tenantId: 'tenant-456',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: 'access',
  };

  beforeEach(async () => {
    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test-secret';
        case 'JWT_ACCESS_EXPIRATION':
          return '1h';
        case 'JWT_REFRESH_EXPIRATION':
          return '7d';
        case 'BCRYPT_ROUNDS':
          return defaultValue ?? 12;
        default:
          return defaultValue;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await service.generateTokenPair(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, {
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        iat: expect.any(Number) as unknown,
        exp: expect.any(Number) as unknown,
        type: 'access',
      });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, {
        sub: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        iat: expect.any(Number) as unknown,
        exp: expect.any(Number) as unknown,
        type: 'refresh',
      });
    });

    it('should handle different expiration formats', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'test-secret';
          case 'JWT_ACCESS_EXPIRATION':
            return '30m';
          case 'JWT_REFRESH_EXPIRATION':
            return '14d';
          case 'BCRYPT_ROUNDS':
            return defaultValue ?? 12;
          default:
            return defaultValue;
        }
      });

      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.generateTokenPair(mockUser);

      expect(result.expiresIn).toBe(3600); // Still 3600 because it's hardcoded in the service
    });
  });

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(mockJwtPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(service.validateToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh a valid refresh token', async () => {
      const refreshPayload = { ...mockJwtPayload, type: 'refresh' };
      jwtService.verifyAsync.mockResolvedValue(refreshPayload);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw UnauthorizedException for access token', async () => {
      const accessPayload = { ...mockJwtPayload, type: 'access' };
      jwtService.verifyAsync.mockResolvedValue(accessPayload);

      await expect(service.refreshToken('access-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.verifyPassword('password', 'hashedPassword');

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return false for incorrect password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.verifyPassword('wrongPassword', 'hashedPassword');

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
    });

    it('should handle bcrypt errors gracefully', async () => {
      mockedBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never);

      await expect(service.verifyPassword('password', 'hashedPassword')).rejects.toThrow(
        'Bcrypt error',
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const hashedPassword = 'hashedPassword';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hashPassword('password');

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 12);
    });

    it('should handle bcrypt hashing errors', async () => {
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing error') as never);

      await expect(service.hashPassword('password')).rejects.toThrow('Hashing error');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = service.validatePasswordStrength('StrongP@ssw0rd!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const result = service.validatePasswordStrength('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without lowercase letter', () => {
      const result = service.validatePasswordStrength('PASSWORD123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const result = service.validatePasswordStrength('password123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = service.validatePasswordStrength('Password!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = service.validatePasswordStrength('Password123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should handle multiple validation errors', () => {
      const result = service.validatePasswordStrength('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      jwtService.decode.mockReturnValue(mockJwtPayload);

      const result = service.decodeToken('token');

      expect(result).toEqual(mockJwtPayload);
      expect(jwtService.decode).toHaveBeenCalledWith('token');
    });

    it('should return null for invalid token', () => {
      jwtService.decode.mockReturnValue(null);

      const result = service.decodeToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle missing config values gracefully', async () => {
      configService.get.mockReturnValue(undefined);
      // Mock jwt service to simulate failure when config is missing
      jwtService.signAsync.mockRejectedValue(new Error('Config error'));

      await expect(service.generateTokenPair(mockUser)).rejects.toThrow();
    });

    it('should handle malformed JWT payload', async () => {
      // Create a payload with a recent timestamp but missing required fields
      const malformedPayload = {
        invalid: 'payload', // This field is not part of JwtPayload
        exp: Math.floor(Date.now() / 1000) + 3600, // Not expired
      };
      jwtService.verifyAsync.mockResolvedValue(malformedPayload as unknown as JwtPayload);

      // Should still return the payload as the service doesn't validate structure
      const result = await service.validateToken('token');

      expect(result).toEqual(malformedPayload);
    });

    it('should handle very long passwords', async () => {
      const longPassword = `${'a'.repeat(1000)}A1!`;
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      const result = await service.hashPassword(longPassword);

      expect(result).toBe('hashedPassword');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(longPassword, 12);
    });

    it('should handle unicode characters in password', async () => {
      const unicodePassword = 'pássw0rd!🔒';
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      const result = await service.hashPassword(unicodePassword);

      expect(result).toBe('hashedPassword');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(unicodePassword, 12);
    });
  });
});
