import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import axios from 'axios';

import {
  EnterpriseLoggerService,
  getServiceRegistryConfig,
  loadRouteMappingConfig,
} from '@lib/common';

import { ServiceRegistryService } from './service-registry.service';

import type { ServiceInfo, RouteMappingConfiguration, ServiceRegistryConfig } from '@lib/common';

// Mock external dependencies
jest.mock('axios');
jest.mock('@lib/common', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalLib = jest.requireActual('@lib/common');
  return {
    ...(originalLib as object),
    getServiceRegistryConfig: jest.fn(),
    loadRouteMappingConfig: jest.fn(),
    EnterpriseLoggerService: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnThis(),
    })),
  };
});

describe('ServiceRegistryService', () => {
  let service: ServiceRegistryService;
  let mockLogger: jest.Mocked<EnterpriseLoggerService>;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockGetConfig: jest.Mock;
  let mockLoadRouteConfig: jest.Mock;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockGetConfig = getServiceRegistryConfig as jest.Mock;
    mockLoadRouteConfig = loadRouteMappingConfig as jest.Mock;

    // Default mock return values
    mockGetConfig.mockReturnValue({
      services: [],
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
    } as ServiceRegistryConfig);

    mockLoadRouteConfig.mockReturnValue({
      version: '1.0',
      services: [],
      routeMappings: [],
    } as RouteMappingConfiguration);

    const loggerProvider = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRegistryService,
        ConfigService,
        {
          provide: EnterpriseLoggerService,
          useValue: loggerProvider,
        },
      ],
    }).compile();

    service = module.get<ServiceRegistryService>(ServiceRegistryService);
    mockLogger = module.get(EnterpriseLoggerService);

    // Manually trigger initialization
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Service Registration and Discovery', () => {
    const serviceInfo: ServiceInfo = {
      name: 'test-service',
      host: 'localhost',
      port: 3003,
      health: '/health',
      version: '1.0.0',
      tags: ['test'],
      routes: [],
    };

    it('should register a service', async () => {
      await service.register(serviceInfo);
      const discovered = await service.discover('test-service');
      expect(discovered).toEqual(serviceInfo);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Service registered: test-service at localhost:3003',
      );
    });

    it('should unregister a service', async () => {
      await service.register(serviceInfo);
      await service.unregister('test-service');
      const discovered = await service.discover('test-service');
      expect(discovered).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith('Service unregistered: test-service');
    });

    it('should get all services', async () => {
      await service.register(serviceInfo);
      const all = await service.getAllServices();
      expect(all).toEqual([serviceInfo]);
    });
  });

  describe('Health Checks', () => {
    const serviceInfo: ServiceInfo = {
      name: 'healthy-service',
      host: 'localhost',
      port: 3004,
      health: 'health', // No leading slash to test path joining
      version: '1.0.0',
      tags: [],
      routes: [],
    };

    beforeEach(async () => {
      await service.register(serviceInfo);
    });

    it('should return true for a healthy service', async () => {
      mockAxios.get.mockResolvedValue({ status: 200, data: 'OK' });
      const isHealthy = await service.healthCheck('healthy-service');
      expect(isHealthy).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'http://localhost:3004/health',
        expect.any(Object),
      );
    });

    it('should return false if request fails', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network Error'));
      const isHealthy = await service.healthCheck('healthy-service');
      expect(isHealthy).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Health check failed for healthy-service: Network Error',
      );
    });

    it('should return false for non-200 status', async () => {
      mockAxios.get.mockResolvedValue({
        status: 503,
        data: 'Service Unavailable',
      });
      const isHealthy = await service.healthCheck('healthy-service');
      expect(isHealthy).toBe(false);
    });

    it('should return false for a non-existent service', async () => {
      const isHealthy = await service.healthCheck('non-existent-service');
      expect(isHealthy).toBe(false);
    });
  });

  describe('Route Discovery and Transformation', () => {
    let configService: ConfigService;
    let logger: EnterpriseLoggerService;

    beforeEach(() => {
      // A more direct way to instantiate the service for route-specific tests
      mockLoadRouteConfig.mockReturnValue({
        version: '1.0',
        services: [
          {
            id: 'auth-service',
            name: 'auth-service',
            host: 'localhost',
            port: 3200,
          },
        ],
        routeMappings: [
          {
            pattern: '^/api/auth',
            service: 'auth-service',
            transformations: { stripPrefix: true },
            patternType: 'regex',
          },
          {
            pattern: '/api/rewrite',
            service: 'auth-service',
            transformations: { rewrite: '/new/path' },
            patternType: 'regex',
          },
        ],
      });
      configService = new ConfigService();
      logger = new (EnterpriseLoggerService as jest.Mock<EnterpriseLoggerService>)();
      service = new ServiceRegistryService(configService, logger);
    });

    it('should discover a service by its route', async () => {
      await service.register({
        name: 'auth-service',
        host: 'localhost',
        port: 3200,
        health: '/health',
        version: '1.0',
        tags: [],
        routes: [],
      });
      const discovered = await service.discoverByRoute('/api/auth/login');
      expect(discovered).not.toBeNull();
      expect(discovered?.name).toBe('auth-service');
    });

    it('should return null for an unmapped route', async () => {
      const discovered = await service.discoverByRoute('/unmapped/route');
      expect(discovered).toBeNull();
    });

    it('should transform a route by stripping the prefix', () => {
      const mapping = service.getRouteMapping('/api/auth/login');
      expect(mapping).not.toBeNull();
      if (mapping) {
        const transformed = service.transformRoute('/api/auth/login', mapping);
        expect(transformed).toBe('/login');
      }
    });

    it('should transform a route using rewrite', () => {
      const mapping = service.getRouteMapping('/api/rewrite/123');
      expect(mapping).not.toBeNull();
      if (mapping) {
        const transformed = service.transformRoute('/api/rewrite/123', mapping);
        expect(transformed).toBe('/new/path');
      }
    });
  });
});
