import { Test } from '@nestjs/testing';

import { ProxyService } from '../services/proxy.service';

import { GatewayController } from './gateway.controller';

import type { TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

// Mock types for testing
interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
}

describe('GatewayController', () => {
  let controller: GatewayController;
  let proxyService: jest.Mocked<ProxyService>;

  const mockProxyService = {
    getAllServices: jest.fn(),
    healthCheckService: jest.fn(),
    getServiceInfo: jest.fn(),
    proxyRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
    proxyService = module.get(ProxyService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health status with timestamp and service name', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String) as string,
        service: 'api-gateway',
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return consistent structure on multiple calls', () => {
      const result1 = controller.healthCheck();
      const result2 = controller.healthCheck();

      expect(result1.status).toBe(result2.status);
      expect(result1.service).toBe(result2.service);
    });
  });

  describe('getServices', () => {
    it('should return list of services with count', async () => {
      const mockServices = [
        {
          name: 'auth-service',
          host: 'localhost',
          port: 3200,
          health: '/health',
          version: '1.0.0',
          tags: ['auth'],
          routes: [],
        },
        {
          name: 'rbac-core',
          host: 'localhost',
          port: 3100,
          health: '/health',
          version: '1.0.0',
          tags: ['rbac'],
          routes: [],
        },
      ];

      proxyService.getAllServices.mockResolvedValue(mockServices);

      const result = await controller.getServices();

      expect(result).toEqual({
        services: mockServices,
        count: 2,
      });
      expect(proxyService.getAllServices).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when no services are registered', async () => {
      proxyService.getAllServices.mockResolvedValue([]);

      const result = await controller.getServices();

      expect(result).toEqual({
        services: [],
        count: 0,
      });
    });

    it('should handle ProxyService errors gracefully', async () => {
      proxyService.getAllServices.mockRejectedValue(new Error('Service registry error'));

      await expect(controller.getServices()).rejects.toThrow('Service registry error');
    });
  });

  describe('checkServiceHealth', () => {
    const mockRequest = {
      params: { serviceName: 'auth-service' },
    } as unknown as Request;

    const mockServiceInfo = {
      name: 'auth-service',
      host: 'localhost',
      port: 3200,
      health: '/health',
      version: '1.0.0',
      tags: ['auth'],
      routes: [],
    };

    it('should return service health status when service is healthy', async () => {
      proxyService.healthCheckService.mockResolvedValue(true);
      proxyService.getServiceInfo.mockResolvedValue(mockServiceInfo);

      const result = await controller.checkServiceHealth(mockRequest);

      expect(result).toEqual({
        service: 'auth-service',
        healthy: true,
        info: mockServiceInfo,
        timestamp: expect.any(String) as string,
      });
      expect(proxyService.healthCheckService).toHaveBeenCalledWith('auth-service');
      expect(proxyService.getServiceInfo).toHaveBeenCalledWith('auth-service');
    });

    it('should return service health status when service is unhealthy', async () => {
      proxyService.healthCheckService.mockResolvedValue(false);
      proxyService.getServiceInfo.mockResolvedValue(mockServiceInfo);

      const result = await controller.checkServiceHealth(mockRequest);

      expect(result).toEqual({
        service: 'auth-service',
        healthy: false,
        info: mockServiceInfo,
        timestamp: expect.any(String) as string,
      });
    });

    it('should handle non-existent service gracefully', async () => {
      proxyService.healthCheckService.mockResolvedValue(false);
      proxyService.getServiceInfo.mockResolvedValue(null);

      const result = await controller.checkServiceHealth(mockRequest);

      expect(result).toEqual({
        service: 'auth-service',
        healthy: false,
        info: null,
        timestamp: expect.any(String) as string,
      });
    });

    it('should handle ProxyService errors during health check', async () => {
      proxyService.healthCheckService.mockRejectedValue(new Error('Health check failed'));
      proxyService.getServiceInfo.mockResolvedValue(mockServiceInfo);

      await expect(controller.checkServiceHealth(mockRequest)).rejects.toThrow(
        'Health check failed',
      );
    });

    it('should handle ProxyService errors during service info retrieval', async () => {
      proxyService.healthCheckService.mockResolvedValue(true);
      proxyService.getServiceInfo.mockRejectedValue(new Error('Service info error'));

      await expect(controller.checkServiceHealth(mockRequest)).rejects.toThrow(
        'Service info error',
      );
    });
  });

  describe('proxyApiRequests', () => {
    const mockRequest = {
      originalUrl: '/api/auth/login',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { email: 'test@example.com', password: 'password' },
    } as Request;

    const mockResponse: MockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    beforeEach(() => {
      mockResponse.status.mockClear();
      mockResponse.json.mockClear();
      mockResponse.send.mockClear();
    });

    it('should proxy API requests successfully', async () => {
      proxyService.proxyRequest.mockResolvedValue();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.proxyApiRequests(mockRequest, mockResponse as any);

      expect(proxyService.proxyRequest).toHaveBeenCalledWith(mockRequest, mockResponse);
    });

    it('should handle proxy errors gracefully', async () => {
      proxyService.proxyRequest.mockRejectedValue(new Error('Proxy error'));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(controller.proxyApiRequests(mockRequest, mockResponse as any)).rejects.toThrow(
        'Proxy error',
      );
    });
  });

  describe('getServiceDocs', () => {
    const mockServices = [
      {
        name: 'auth-service',
        host: 'localhost',
        port: 3200,
        health: '/health',
        version: '1.0.0',
        tags: ['auth'],
        routes: ['/login', '/register'],
      },
      {
        name: 'rbac-core',
        host: 'localhost',
        port: 3100,
        health: '/health',
        version: '1.0.0',
        tags: ['rbac'],
        routes: ['/roles', '/permissions'],
      },
    ];

    beforeEach(() => {
      proxyService.getAllServices.mockResolvedValue(mockServices);

      // Mock global fetch
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return combined service documentation', async () => {
      const mockSwaggerDocs = {
        openapi: '3.0.0',
        info: { title: 'Auth Service API', version: '1.0.0' },
        paths: { '/login': { post: {} } },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSwaggerDocs),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await controller.getServiceDocs();

      expect(result.gateway).toEqual({
        name: 'api-gateway',
        version: '1.0.0',
        timestamp: expect.any(String) as string,
      });

      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toEqual({
        service: 'auth-service',
        version: '1.0.0',
        routes: ['/login', '/register'],
        swagger: mockSwaggerDocs,
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3200/docs-json');
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3100/docs-json');
    });

    it('should handle services without swagger documentation', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await controller.getServiceDocs();

      expect(result.gateway).toBeDefined();
      expect(result.services).toHaveLength(0);
    });

    it('should handle network errors when fetching service docs', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Connection refused'));

      const result = await controller.getServiceDocs();

      expect(result.gateway).toBeDefined();
      expect(result.services).toHaveLength(0);
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await controller.getServiceDocs();

      expect(result.gateway).toBeDefined();
      expect(result.services).toHaveLength(0);
    });

    it('should return empty services when getAllServices fails', async () => {
      proxyService.getAllServices.mockRejectedValue(new Error('Registry error'));

      await expect(controller.getServiceDocs()).rejects.toThrow('Registry error');
    });
  });

  describe('Controller Integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have ProxyService injected', () => {
      expect(proxyService).toBeDefined();
    });
  });
});
