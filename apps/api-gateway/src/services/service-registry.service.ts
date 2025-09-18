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
  EnterpriseLoggerService,
} from '@lib/common';

// Flexible service metadata type that handles both formats
interface FlexibleServiceMetadata {
  id?: string;
  name: string;
  version?: string;
  baseUrl?: string;
  host?: string;
  port?: number;
  healthCheck?: string;
  health?: string;
  timeout?: number;
  retries?: number;
  tags?: string[];
  environment?: string;
  description?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

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

  private convertServiceMetadataToServiceInfo(metadata: FlexibleServiceMetadata): ServiceInfo {
    let host: string;
    let port: number;

    // Handle both JSON configuration format and ServiceMetadata interface
    if (metadata.baseUrl) {
      // ServiceMetadata interface format
      try {
        const url = new URL(metadata.baseUrl);
        host = url.hostname;
        port = parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80);
      } catch (error) {
        throw new Error(
          `Invalid baseUrl '${metadata.baseUrl}' for service ${metadata.id ?? metadata.name}: ${(error as Error).message}`,
        );
      }
    } else if (metadata.host && metadata.port) {
      // JSON configuration format - use destructuring
      const serviceData = { host: metadata.host, port: metadata.port };
      ({ host, port } = serviceData);
    } else {
      throw new Error(
        `Service ${metadata.id ?? metadata.name} must have either 'baseUrl' or both 'host' and 'port' configured`,
      );
    }

    return {
      name: metadata.id ?? metadata.name,
      host,
      port,
      health: metadata.healthCheck ?? metadata.health ?? '/health',
      version: metadata.version ?? '1.0.0',
      tags: metadata.tags ?? [],
      routes: [], // Will be populated during route discovery
    };
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
      this.logger.warn(`Health check failed for ${serviceName}: ${(error as Error).message}`);
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

  /**
   * Transform route according to mapping configuration
   * Handles complex route transformations including stripPrefix and rewrite
   */
  transformRoute(originalRoute: string, mapping: RouteMapping): string {
    let transformedRoute = originalRoute;

    // Use transformations object if available (new format)
    const { transformations } = mapping;
    const stripPrefix = transformations?.stripPrefix ?? mapping.stripPrefix;
    const rewrite = transformations?.rewrite ?? mapping.rewrite;

    this.logger.debug('Transform route start', {
      originalRoute,
      stripPrefix,
      rewrite,
      pattern: mapping.pattern.source,
    });

    // Handle rewrite transformation first
    if (rewrite) {
      // Check if the pattern matches the route
      const match = originalRoute.match(mapping.pattern);
      if (match) {
        // For regex patterns with capture groups, use proper replacement
        if (mapping.pattern.source.includes('(') && rewrite.includes('$')) {
          transformedRoute = originalRoute.replace(mapping.pattern, rewrite);

          this.logger.debug('Applied rewrite transformation with capture groups', {
            originalRoute,
            transformedRoute,
            rewrite,
            capturedGroups: match.slice(1), // Show captured groups for debugging
          });
        } else {
          // Simple rewrite - replace the matched part with the rewrite value
          transformedRoute = rewrite;

          this.logger.debug('Applied simple rewrite transformation', {
            originalRoute,
            transformedRoute,
            rewrite,
          });
        }
      } else {
        this.logger.warn('Rewrite requested but pattern did not match', {
          originalRoute,
          pattern: mapping.pattern.source,
          rewrite,
        });
        return originalRoute; // Return original if no match
      }

      return transformedRoute;
    }

    // Handle stripPrefix transformation
    if (stripPrefix) {
      // Extract the prefix that matches the pattern
      const match = originalRoute.match(mapping.pattern);
      if (match) {
        // Remove the matched prefix and ensure we start with /
        const [prefix] = match;
        transformedRoute = originalRoute.replace(prefix, '');

        // Ensure the result starts with / unless it's empty
        if (transformedRoute && !transformedRoute.startsWith('/')) {
          transformedRoute = `/${transformedRoute}`;
        }

        // If the result is empty or just '/', set it to '/'
        if (!transformedRoute || transformedRoute === '') {
          transformedRoute = '/';
        }

        this.logger.debug('Applied stripPrefix transformation', {
          originalRoute,
          transformedRoute,
          matchedPrefix: prefix,
        });
      } else {
        this.logger.warn('stripPrefix requested but pattern did not match', {
          originalRoute,
          pattern: mapping.pattern.source,
        });
      }
    }

    this.logger.debug('Transform route complete', {
      originalRoute,
      transformedRoute,
    });

    return transformedRoute;
  }
}
