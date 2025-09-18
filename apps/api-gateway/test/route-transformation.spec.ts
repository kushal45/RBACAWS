/* eslint-disable no-console */
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { EnterpriseLoggerService } from '../../../libs/common/src';
import { ServiceRegistryService } from '../src/services/service-registry.service';

import type { TestingModule } from '@nestjs/testing';

describe('ServiceRegistryService - Route Transformation Bug Fix', () => {
  let service: ServiceRegistryService;
  let mockLogger: Partial<EnterpriseLoggerService>;

  beforeEach(async () => {
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          ROUTE_MAPPING_CONFIG_PATH: './config/route-mappings.json',
          SERVICE_REGISTRY_HEALTH_CHECK_INTERVAL: 30000,
          SERVICE_REGISTRY_HEALTH_CHECK_TIMEOUT: 5000,
          NODE_ENV: 'test',
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRegistryService,
        { provide: ConfigService, useValue: mockConfigService },

        { provide: EnterpriseLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ServiceRegistryService>(ServiceRegistryService);
  });

  describe('transformRoute', () => {
    it('should correctly transform auth token routes with stripPrefix and rewrite', () => {
      // Test case from the JSON configuration
      const mapping = {
        pattern: new RegExp('^/api/auth/(login|register|refresh|logout)'),
        service: 'auth-service',
        transformations: {
          stripPrefix: true,
          rewrite: '/auth',
        },
      };

      // Test various input routes
      const testCases = [
        {
          input: '/api/auth/login',
          expected: '/auth',
          description: 'should rewrite /api/auth/login to /auth',
        },
        {
          input: '/api/auth/register',
          expected: '/auth',
          description: 'should rewrite /api/auth/register to /auth',
        },
        {
          input: '/api/auth/refresh',
          expected: '/auth',
          description: 'should rewrite /api/auth/refresh to /auth',
        },
        {
          input: '/api/auth/logout',
          expected: '/auth',
          description: 'should rewrite /api/auth/logout to /auth',
        },
      ];

      testCases.forEach(({ input, expected, description }) => {
        const result = service.transformRoute(input, mapping);
        expect(result).toBe(expected);
        expect(result).not.toBeUndefined();

        console.log(`✅ ${description}: ${input} → ${result}`);
      });
    });

    it('should handle stripPrefix without rewrite correctly', () => {
      const mapping = {
        pattern: new RegExp('^/api/users'),
        service: 'rbac-core',
        transformations: {
          stripPrefix: true,
        },
      };

      const testCases = [
        {
          input: '/api/users',
          expected: '/',
          description: 'should strip /api/users to /',
        },
        {
          input: '/api/users/123',
          expected: '/123',
          description: 'should strip /api/users from /api/users/123 to /123',
        },
        {
          input: '/api/users/profile',
          expected: '/profile',
          description: 'should strip /api/users from /api/users/profile to /profile',
        },
      ];

      testCases.forEach(({ input, expected, description }) => {
        const result = service.transformRoute(input, mapping);
        expect(result).toBe(expected);
        expect(result).not.toBeUndefined();

        console.log(`✅ ${description}: ${input} → ${result}`);
      });
    });

    it('should handle rewrite with capture groups correctly', () => {
      const mapping = {
        pattern: new RegExp('^/api/auth/(.+)'),
        service: 'auth-service',
        transformations: {
          rewrite: '/auth/$1',
        },
      };

      const testCases = [
        {
          input: '/api/auth/login',
          expected: '/auth/login',
          description: 'should rewrite with capture group /api/auth/login to /auth/login',
        },
        {
          input: '/api/auth/user/profile',
          expected: '/auth/user/profile',
          description:
            'should rewrite with capture group /api/auth/user/profile to /auth/user/profile',
        },
      ];

      testCases.forEach(({ input, expected, description }) => {
        const result = service.transformRoute(input, mapping);
        expect(result).toBe(expected);
        expect(result).not.toBeUndefined();

        console.log(`✅ ${description}: ${input} → ${result}`);
      });
    });

    it('should handle legacy format (backward compatibility)', () => {
      const mapping = {
        pattern: new RegExp('^/api/legacy'),
        service: 'legacy-service',
        stripPrefix: true,
      };

      const result = service.transformRoute('/api/legacy/endpoint', mapping);
      expect(result).toBe('/endpoint');
      expect(result).not.toBeUndefined();
      console.log(`✅ Legacy format: /api/legacy/endpoint → ${result}`);
    });

    it('should return original route when no transformations are applied', () => {
      const mapping = {
        pattern: new RegExp('^/api/passthrough'),
        service: 'passthrough-service',
      };

      const result = service.transformRoute('/api/passthrough/test', mapping);
      expect(result).toBe('/api/passthrough/test');
      expect(result).not.toBeUndefined();
      console.log(`✅ No transformation: /api/passthrough/test → ${result}`);
    });

    it('should handle edge cases correctly', () => {
      const mapping = {
        pattern: new RegExp('^/api/edge'),
        service: 'edge-service',
        transformations: {
          stripPrefix: true,
        },
      };

      // Edge case: exact match with stripPrefix should return '/'
      const result = service.transformRoute('/api/edge', mapping);
      expect(result).toBe('/');
      expect(result).not.toBeUndefined();
      console.log(`✅ Edge case exact match: /api/edge → ${result}`);
    });
  });
});
