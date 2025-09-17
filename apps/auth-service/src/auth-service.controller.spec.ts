import { Test } from '@nestjs/testing';

import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { UserRepository, AuthCredentialRepository, AuthTokenRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

import type { TestingModule } from '@nestjs/testing';

describe('AuthServiceController', () => {
  let authServiceController: AuthServiceController;

  beforeEach(async () => {
    const mockJwtAuthService = {
      generateTokenPair: jest.fn(),
      validateToken: jest.fn(),
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

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthServiceController],
      providers: [
        AuthServiceService,
        { provide: JwtAuthService, useValue: mockJwtAuthService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: AuthCredentialRepository, useValue: mockAuthCredentialRepository },
        { provide: AuthTokenRepository, useValue: mockAuthTokenRepository },
      ],
    }).compile();

    authServiceController = app.get<AuthServiceController>(AuthServiceController);
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = authServiceController.getHealth();
      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
