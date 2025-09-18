import { Test } from '@nestjs/testing';
import axios from 'axios';

import { ProxyService } from './proxy.service';
import { ServiceRegistryService } from './service-registry.service';

import type { ServiceInfo, RouteMapping } from '@lib/common';
import type { TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

// Mock axios completely
jest.mock('axios');

const mockedAxios = jest.mocked(axios);

interface ErrorWithCode extends Error {
  code?: string;
}

describe('ProxyService', () => {
  let service: ProxyService;
  let serviceRegistry: jest.Mocked<ServiceRegistryService>;

  const mockServiceRegistry = {
    discoverByRoute: jest.fn(),
    getRouteMapping: jest.fn(),
    transformRoute: jest.fn(),
    getAllServices: jest.fn(),
    healthCheck: jest.fn(),
    discover: jest.fn(),
  };

  const mockServiceInfo: ServiceInfo = {
    name: 'auth-service',
    host: 'localhost',
    port: 3200,
    health: '/health',
    version: '1.0.0',
    tags: ['auth'],
    routes: ['/login', '/register'],
  };

  const mockRouteMapping: RouteMapping = {
    pattern: /^\/api\/auth\/(login|register|refresh|logout)/,
    service: 'auth-service',
    stripPrefix: false,
    transformations: {
      rewrite: '/$1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ServiceRegistryService,
          useValue: mockServiceRegistry,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    serviceRegistry = module.get(ServiceRegistryService);

    // Reset all mocks
    jest.clearAllMocks();

    // Reset axios mock
    jest.mocked(axios).mockReset();
  });

  describe('proxyRequest', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {
        originalUrl: '/api/auth/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'password' },
        headers: { 'content-type': 'application/json' },
        query: {},
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        set: jest.fn(),
      };
    });

    it('should successfully proxy a request with route transformation', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(mockRouteMapping);
      serviceRegistry.transformRoute.mockReturnValue('/login');

      const mockAxiosResponse = {
        status: 200,
        data: { token: 'jwt-token' },
        headers: { 'content-type': 'application/json' },
      };

      jest.mocked(axios).mockResolvedValue(mockAxiosResponse);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(serviceRegistry.discoverByRoute).toHaveBeenCalledWith('/api/auth/login');
      expect(serviceRegistry.getRouteMapping).toHaveBeenCalledWith('/api/auth/login');
      expect(serviceRegistry.transformRoute).toHaveBeenCalledWith(
        '/api/auth/login',
        mockRouteMapping,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockAxiosResponse.data);
    });

    it('should proxy request without route transformation when no mapping exists', async () => {
      mockRequest.originalUrl = '/api/direct';

      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const mockAxiosResponse = {
        status: 200,
        data: { message: 'success' },
        headers: {},
      };

      jest.mocked(axios).mockResolvedValue(mockAxiosResponse);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(jest.mocked(axios)).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3200/api/direct',
          timeout: 30000,
        }),
      );
    });

    it('should return 404 when service is not found', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(null);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        message: 'Service not found',
        error: 'Not Found',
      });
    });

    it('should handle connection errors with 503 Service Unavailable', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const connectionError: ErrorWithCode = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      jest.mocked(axios).mockRejectedValue(connectionError);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 503,
        message: 'Service unavailable',
        error: 'Service Unavailable',
      });
    });

    it('should handle timeout errors with 504 Gateway Timeout', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const timeoutError: ErrorWithCode = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.mockRejectedValue(timeoutError);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 504,
        message: 'Gateway timeout',
        error: 'Gateway Timeout',
      });
    });

    it('should handle host not found errors with 503 Service Unavailable', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const notFoundError: ErrorWithCode = new Error('Host not found');
      notFoundError.code = 'ENOTFOUND';
      mockedAxios.mockRejectedValue(notFoundError);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 503,
        message: 'Service unavailable',
        error: 'Service Unavailable',
      });
    });

    it('should handle generic errors with 502 Bad Gateway', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const genericError = new Error('Something went wrong');
      mockedAxios.mockRejectedValue(genericError);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(502);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 502,
        message: 'Bad gateway',
        error: 'Bad Gateway',
      });
    });

    it('should sanitize hop-by-hop headers', async () => {
      mockRequest.headers = {
        'content-type': 'application/json',
        authorization: 'Bearer token',
        host: 'localhost:3000',
        connection: 'keep-alive',
        'proxy-authorization': 'Basic auth',
        'user-agent': 'Jest/Test',
      };

      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const mockAxiosResponse = {
        status: 200,
        data: {},
        headers: {},
      };

      mockedAxios.mockResolvedValue(mockAxiosResponse);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3200/api/auth/login',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            'content-type': 'application/json',
            authorization: 'Bearer token',
            'user-agent': 'Jest/Test',
          }),
          timeout: 30000,
        }),
      );
    });

    it('should forward response headers correctly', async () => {
      serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
      serviceRegistry.getRouteMapping.mockReturnValue(null);

      const mockAxiosResponse = {
        status: 200,
        data: { message: 'success' },
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          'cache-control': 'no-cache',
        },
      };

      mockedAxios.mockResolvedValue(mockAxiosResponse);

      await service.proxyRequest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith('content-type', 'application/json');
      expect(mockResponse.set).toHaveBeenCalledWith('x-custom-header', 'custom-value');
      expect(mockResponse.set).toHaveBeenCalledWith('cache-control', 'no-cache');
    });

    it('should preserve HTTP status codes from downstream services', async () => {
      const statusCodes = [201, 400, 401, 403, 500];

      for (const statusCode of statusCodes) {
        serviceRegistry.discoverByRoute.mockResolvedValue(mockServiceInfo);
        serviceRegistry.getRouteMapping.mockReturnValue(null);

        const mockAxiosResponse = {
          status: statusCode,
          data: { statusCode, message: `Status ${statusCode}` },
          headers: {},
        };

        mockedAxios.mockResolvedValue(mockAxiosResponse);

        await service.proxyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
        expect(mockResponse.send).toHaveBeenCalledWith(mockAxiosResponse.data);

        jest.clearAllMocks();
      }
    });
  });

  describe('getAllServices', () => {
    it('should return all services from service registry', async () => {
      const mockServices = [mockServiceInfo];
      serviceRegistry.getAllServices.mockResolvedValue(mockServices);

      const result = await service.getAllServices();

      expect(result).toEqual(mockServices);
      expect(serviceRegistry.getAllServices).toHaveBeenCalledTimes(1);
    });
  });

  describe('healthCheckService', () => {
    it('should check service health', async () => {
      serviceRegistry.healthCheck.mockResolvedValue(true);

      const result = await service.healthCheckService('auth-service');

      expect(result).toBe(true);
      expect(serviceRegistry.healthCheck).toHaveBeenCalledWith('auth-service');
    });
  });

  describe('getServiceInfo', () => {
    it('should return service info', async () => {
      serviceRegistry.discover.mockResolvedValue(mockServiceInfo);

      const result = await service.getServiceInfo('auth-service');

      expect(result).toEqual(mockServiceInfo);
      expect(serviceRegistry.discover).toHaveBeenCalledWith('auth-service');
    });
  });

  describe('Service Integration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have ServiceRegistryService injected', () => {
      expect(serviceRegistry).toBeDefined();
    });
  });
});
