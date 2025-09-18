import { All, Controller, Req, Res, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { ProxyService } from '../services/proxy.service';

@ApiTags('Gateway')
@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @Get('health')
  @ApiOperation({ summary: 'API Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  healthCheck(): { status: string; timestamp: string; service: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'List all registered services' })
  @ApiResponse({ status: 200, description: 'List of registered services' })
  async getServices(): Promise<{ services: unknown[]; count: number }> {
    const services = await this.proxyService.getAllServices();
    return {
      services,
      count: services.length,
    };
  }

  @Get('services/:serviceName/health')
  @ApiOperation({ summary: 'Check health of a specific service' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async checkServiceHealth(
    @Req() req: Request,
  ): Promise<{ service: string; healthy: boolean; info: unknown; timestamp: string }> {
    const { serviceName } = req.params;
    const isHealthy = await this.proxyService.healthCheckService(serviceName);
    const serviceInfo = await this.proxyService.getServiceInfo(serviceName);

    return {
      service: serviceName,
      healthy: isHealthy,
      info: serviceInfo,
      timestamp: new Date().toISOString(),
    };
  }

  @All('api/*')
  @ApiExcludeEndpoint() // Exclude from Swagger as this is a catch-all
  async proxyApiRequests(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.proxyService.proxyRequest(req, res);
  }

  @Get('docs')
  @ApiOperation({
    summary: 'Get API documentation for all services',
    description: 'Returns combined Swagger documentation from all registered services',
  })
  @ApiResponse({ status: 200, description: 'Combined service documentation' })
  async getServiceDocs(): Promise<{
    gateway: { name: string; version: string; timestamp: string };
    services: unknown[];
  }> {
    const services = await this.proxyService.getAllServices();
    const docs: unknown[] = [];

    for (const service of services) {
      try {
        // Try to fetch swagger docs from each service
        const response = await fetch(`http://${service.host}:${service.port}/docs-json`);
        if (response.ok) {
          const swagger: unknown = await response.json();
          docs.push({
            service: service.name,
            version: service.version,
            routes: service.routes,
            swagger,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not fetch docs for ${service.name}: ${(error as Error).message}`);
      }
    }

    return {
      gateway: {
        name: 'api-gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      services: docs,
    };
  }

  @Get('routes')
  @ApiOperation({ summary: 'List all available routes and their target services' })
  @ApiResponse({ status: 200, description: 'Available routes mapping' })
  async getRoutes(): Promise<{ routes: Record<string, unknown>; totalRoutes: number }> {
    const services = await this.proxyService.getAllServices();

    const routeMap = services.reduce((acc: Record<string, unknown>, service) => {
      service.routes.forEach((route: string) => {
        acc[route] = {
          service: service.name,
          target: `${service.host}:${service.port}`,
          health: service.health,
          tags: service.tags,
        };
      });
      return acc;
    }, {});

    return {
      routes: routeMap,
      totalRoutes: Object.keys(routeMap).length,
    };
  }
}
