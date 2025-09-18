import { Test } from '@nestjs/testing';

import { RbacCoreController } from './rbac-core.controller';
import { RbacCoreService } from './rbac-core.service';

import type { TestingModule } from '@nestjs/testing';

describe('RbacCoreController', () => {
  let rbacCoreController: RbacCoreController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RbacCoreController],
      providers: [RbacCoreService],
    }).compile();

    rbacCoreController = app.get<RbacCoreController>(RbacCoreController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(rbacCoreController.getHello()).toBe('Hello World!');
    });
  });
});
