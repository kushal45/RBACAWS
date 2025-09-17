import { Test } from '@nestjs/testing';

import { AuditLogServiceController } from './audit-log-service.controller';
import { AuditLogServiceService } from './audit-log-service.service';

import type { TestingModule } from '@nestjs/testing';

describe('AuditLogServiceController', () => {
  let auditLogServiceController: AuditLogServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogServiceController],
      providers: [AuditLogServiceService],
    }).compile();

    auditLogServiceController = app.get<AuditLogServiceController>(AuditLogServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(auditLogServiceController.getHello()).toBe('Hello World!');
    });
  });
});
