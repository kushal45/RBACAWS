import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import {
  ServiceRegistry,
  ServiceInfo,
  RouteMapping,
  getServiceRegistryConfig,
  ServiceRegistryConfig,
  loadRouteMappingConfig,
  convertRouteMapping,
  RouteMappingConfiguration,
  ServiceMetadata,
  EnterpriseLoggerService,
} from '@lib/common';

@Injectable()
export class ServiceRegistryService implements ServiceRegistry, OnModuleInit {
  private readonly logger: EnterpriseLoggerService;
  private readonly services = new Map<string, ServiceInfo>();
  private readonly routeMappings: RouteMapping[] = [];
  private readonly config: ServiceRegistryConfig;
  private readonly routeConfig: RouteMappingConfiguration;

  constructor(
    private configService: ConfigService,
    logger: EnterpriseLoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext('ServiceRegistryService');
    this.config = getServiceRegistryConfig(configService);
    this.routeConfig = loadRouteMappingConfig(configService);
    this.initializeRouteMappings();
  }

  async onModuleInit(): Promise<void> {
    // Register known services on startup
    await this.registerKnownServices();

    // Start periodic health checks
    this.startHealthChecks();
  }

  private initializeRouteMappings(): void {
    // Load route mappings from configuration
    this.routeConfig.routeMappings.forEach(enhancedMapping => {
      const routeMapping = convertRouteMapping(enhancedMapping);
      this.routeMappings.push(routeMapping);

      this.logger.log(
        `Registered route mapping: ${enhancedMapping.pattern} -> ${enhancedMapping.service} (${enhancedMapping.patternType || 'regex'})`,
      );
    });

    // Log configuration summary
    this.logger.log(
      `Loaded ${this.routeMappings.length} route mappings from configuration v${this.routeConfig.version}`,
    );
  }

  private async registerKnownServices(): Promise<void> {
    this.logger.log(`Registering services from route configuration...`);
    this.logger.log(`Found ${this.routeConfig.services.length} services in configuration`);

    // Register services from route configuration first
    for (const serviceMetadata of this.routeConfig.services) {
      this.logger.log(`Processing service: ${JSON.stringify(serviceMetadata, null, 2)}`);

      if (!serviceMetadata?.id) {
        this.logger.error(
          `Service metadata is missing or has no ID: ${JSON.stringify(serviceMetadata)}`,
        );
        continue;
      }

      try {
        const serviceInfo: ServiceInfo = this.convertServiceMetadataToServiceInfo(serviceMetadata);
        await this.register(serviceInfo);
      } catch (error) {
        this.logger.error(
          `Failed to register service ${serviceMetadata.id}: ${(error as Error).message}`,
        );
        throw error;
      }
    }

    // Register additional services from legacy configuration if any
    for (const service of this.config.services) {
      if (!this.services.has(service.name)) {
        await this.register(service);
      }
    }
  }

  private convertServiceMetadataToServiceInfo(metadata: ServiceMetadata): ServiceInfo {
    if (!metadata.baseUrl) {
      throw new Error(`Service ${metadata.id} has no baseUrl configured`);
    }

    try {
      const url = new URL(metadata.baseUrl);
      return {
        name: metadata.id,
        host: url.hostname,
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        health: metadata.healthCheck || '/health',
        version: metadata.version,
        tags: metadata.tags || [],
        routes: [], // Will be populated during route discovery
      };
    } catch (error) {
      throw new Error(
        `Invalid baseUrl '${metadata.baseUrl}' for service ${metadata.id}: ${(error as Error).message}`,
      );
    }
  }

  register(service: ServiceInfo): Promise<void> {
    this.services.set(service.name, service);
    this.logger.log(`Service registered: ${service.name} at ${service.host}:${service.port}`);
    return Promise.resolve();
  }

  unregister(serviceName: string): Promise<void> {
    this.services.delete(serviceName);
    this.logger.log(`Service unregistered: ${serviceName}`);
    return Promise.resolve();
  }

  discover(serviceName: string): Promise<ServiceInfo | null> {
    const service = this.services.get(serviceName) || null;
    return Promise.resolve(service);
  }

  async discoverByRoute(route: string): Promise<ServiceInfo | null> {
    // Find matching route pattern
    const mapping = this.routeMappings.find(mapping => mapping.pattern.test(route));
    if (!mapping) {
      this.logger.warn(`No service mapping found for route: ${route}`);
      return null;
    }

    // Get service info
    const service = await this.discover(mapping.service);
    if (!service) {
      this.logger.error(`Service not found: ${mapping.service} for route: ${route}`);
      return null;
    }

    return service;
  }

  getAllServices(): Promise<ServiceInfo[]> {
    return Promise.resolve(Array.from(this.services.values()));
  }

  async healthCheck(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    try {
      const response = await axios.get(`http://${service.host}:${service.port}/${service.health}`, {
        timeout: this.config.healthCheckTimeout,
      });
      return response.status === 200;
    } catch (error) {
      const typedError = error as Error;
      const errorMessage = typedError?.message ?? String(error);
      this.logger.warn(`Health check failed for ${serviceName}: ${errorMessage}`);
      return false;
    }
  }

  private startHealthChecks(): void {
    // Run health checks at configured interval
    setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.logger.error(
          'Health check interval failed',
          (error as Error).stack || 'No stack trace',
          {
            operation: 'healthCheckInterval',
            error: error as Error,
          },
        );
      });
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const services = await this.getAllServices();
    for (const service of services) {
      const isHealthy = await this.healthCheck(service.name);
      if (!isHealthy) {
        this.logger.error(`Service ${service.name} is unhealthy`);
      }
    }
  }

  getRouteMapping(route: string): RouteMapping | null {
    return this.routeMappings.find(mapping => mapping.pattern.test(route)) || null;
  }

  transformRoute(originalRoute: string, mapping: RouteMapping): string {
    if (mapping.rewrite) {
      return originalRoute.replace(mapping.pattern, mapping.rewrite);
    }

    if (mapping.stripPrefix) {
      // Remove the matched prefix from the route
      return originalRoute.replace(mapping.pattern, '/');
    }

    return originalRoute;
  }
}
