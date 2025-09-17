import { Test } from '@nestjs/testing';

import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';

import type { TestingModule } from '@nestjs/testing';

describe('AuthServiceController', () => {
  let authServiceController: AuthServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthServiceController],
      providers: [AuthServiceService],
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
