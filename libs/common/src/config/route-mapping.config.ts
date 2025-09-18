import { readFileSync } from 'fs';

import type { RouteMapping } from '../interfaces/service-discovery.interface';
import type { ConfigService } from '@nestjs/config';

export interface RouteTransformation {
  stripPrefix?: boolean;
  rewrite?: string;
  headers?: Record<string, string>;
}

export interface RouteSecurityConfig {
  requireAuth: boolean;
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: string;
  };
}

export interface RouteMonitoringConfig {
  trackMetrics: boolean;
  logRequests?: boolean;
  alerting?: {
    errorThreshold: number;
    latencyThreshold: number;
  };
}

export interface ServiceMetadata {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  healthCheck?: string;
  timeout?: number;
  retries?: number;
  tags?: string[];
  environment?: string;
}

export interface EnhancedRouteMapping extends Omit<RouteMapping, 'pattern'> {
  id: string;
  pattern: string; // String pattern that will be converted to RegExp
  description?: string;
  patternType?: 'regex' | 'glob' | 'exact';
  priority?: number;
  methods?: string[];
  transformations?: RouteTransformation;
  security?: RouteSecurityConfig;
  monitoring?: RouteMonitoringConfig;
}

export interface RouteMappingConfiguration {
  version: string;
  services: ServiceMetadata[];
  routeMappings: EnhancedRouteMapping[];
  globalSettings?: {
    defaultTimeout: number;
    defaultRetries: number;
    enableHealthChecks: boolean;
  };
}

/**
 * Interpolates environment variables in a string
 * Supports format: ${VAR_NAME:default_value}
 */
function interpolateEnvVars(str: string, configService: ConfigService): string {
  return str.replace(/\$\{([^}]+)\}/g, (match: string, expression: string) => {
    const parts = expression.split(':');
    const varName = parts[0] || '';
    const defaultValue = parts[1] || '';
    return configService.get<string>(varName) || defaultValue || match;
  });
}

/**
 * Recursively interpolates environment variables in an object
 */
function interpolateObject<T>(obj: T, configService: ConfigService): T {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj, configService) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => interpolateObject(item, configService)) as T;
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = interpolateObject(value, configService);
    }
    return result as T;
  }

  return obj;
}

/**
 * Loads route mapping configuration from file with environment interpolation
 */
export function loadRouteMappingConfig(
  configService: ConfigService,
  configPath?: string,
): RouteMappingConfiguration {
  if (configPath) {
    try {
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent) as RouteMappingConfiguration;
      return interpolateObject(config, configService);
    } catch (error) {
      throw new Error(
        `Failed to load route mapping config from ${configPath}: ${(error as Error).message}`,
      );
    }
  }

  // Try default locations
  const defaultPaths = [
    './config/route-mappings.json',
    './route-mappings.json',
    '/etc/route-mappings.json',
  ];

  for (const path of defaultPaths) {
    try {
      const configContent = readFileSync(path, 'utf8');
      const config = JSON.parse(configContent) as RouteMappingConfiguration;
      return interpolateObject(config, configService);
    } catch {
      // Continue to next path
    }
  }

  // Try environment variable
  const envConfig = configService.get<string>('ROUTE_MAPPING_CONFIG');
  if (envConfig) {
    try {
      const config = JSON.parse(envConfig) as RouteMappingConfiguration;
      return interpolateObject(config, configService);
    } catch (error) {
      throw new Error(
        `Failed to parse ROUTE_MAPPING_CONFIG from environment: ${(error as Error).message}`,
      );
    }
  }

  // Return default configuration
  return getDefaultConfig(configService);
}

/**
 * Converts enhanced route mapping to RouteMapping with compiled RegExp
 */
export function convertRouteMapping(enhanced: EnhancedRouteMapping): RouteMapping {
  let pattern: RegExp;

  switch (enhanced.patternType) {
    case 'exact': {
      const exactPattern = `^${enhanced.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
      pattern = new RegExp(exactPattern);
      break;
    }
    case 'glob': {
      const globRegex = enhanced.pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      pattern = new RegExp(`^${globRegex}$`);
      break;
    }
    case 'regex':
    default: {
      pattern = new RegExp(enhanced.pattern);
      break;
    }
  }

  // Properly map transformations from JSON configuration
  const transformations: RouteTransformation | undefined = enhanced.transformations
    ? {
        stripPrefix: enhanced.transformations.stripPrefix,
        rewrite: enhanced.transformations.rewrite,
        headers: enhanced.transformations.headers,
      }
    : undefined;

  return {
    pattern,
    service: enhanced.service,
    transformations,
    // Legacy support for backward compatibility
    stripPrefix: enhanced.transformations?.stripPrefix,
    rewrite: enhanced.transformations?.rewrite,
  };
}

/**
 * Gets default configuration when no config file is found
 */
function getDefaultConfig(configService: ConfigService): RouteMappingConfiguration {
  const services = getDefaultServices(configService);
  const routeMappings = getDefaultRouteMappings();

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(
      '[RouteMapping] Loading default configuration with services:',
      services.map(s => ({ id: s.id, baseUrl: s.baseUrl })),
    );
  }

  return {
    version: '1.0.0',
    services,
    routeMappings,
    globalSettings: {
      defaultTimeout: 5000,
      defaultRetries: 3,
      enableHealthChecks: true,
    },
  };
}

/**
 * Gets default services configuration
 */
function getDefaultServices(configService: ConfigService): ServiceMetadata[] {
  const authServiceHost = configService.get<string>('AUTH_SERVICE_HOST', 'localhost');
  const authServicePort = configService.get<number>('AUTH_SERVICE_PORT', 3001);
  const rbacServiceHost = configService.get<string>('RBAC_SERVICE_HOST', 'localhost');
  const rbacServicePort = configService.get<number>('RBAC_CORE_PORT', 3100);
  const auditServiceHost = configService.get<string>('AUDIT_SERVICE_HOST', 'localhost');
  const auditServicePort = configService.get<number>('AUDIT_LOG_SERVICE_PORT', 3300);

  return [
    {
      id: 'auth-service',
      name: 'Authentication Service',
      version: '1.0.0',
      baseUrl: configService.get<string>(
        'AUTH_SERVICE_URL',
        `http://${authServiceHost}:${authServicePort}`,
      ),
      healthCheck: '/health',
      timeout: 5000,
      retries: 3,
      tags: ['auth', 'security'],
      environment: configService.get<string>('NODE_ENV', 'development'),
    },
    {
      id: 'rbac-core',
      name: 'RBAC Core Service',
      version: '1.0.0',
      baseUrl: configService.get<string>(
        'RBAC_SERVICE_URL',
        `http://${rbacServiceHost}:${rbacServicePort}`,
      ),
      healthCheck: '/health',
      timeout: 5000,
      retries: 3,
      tags: ['rbac', 'authorization'],
      environment: configService.get<string>('NODE_ENV', 'development'),
    },
    {
      id: 'audit-log-service',
      name: 'Audit Log Service',
      version: '1.0.0',
      baseUrl: configService.get<string>(
        'AUDIT_SERVICE_URL',
        `http://${auditServiceHost}:${auditServicePort}`,
      ),
      healthCheck: '/health',
      timeout: 5000,
      retries: 3,
      tags: ['audit', 'logging'],
      environment: configService.get<string>('NODE_ENV', 'development'),
    },
  ];
}

/**
 * Gets default route mappings
 */
function getDefaultRouteMappings(): EnhancedRouteMapping[] {
  return [
    {
      id: 'auth-routes',
      pattern: '/api/auth/.*',
      patternType: 'regex',
      service: 'auth-service',
      priority: 100,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Authentication and user management routes',
      security: {
        requireAuth: false,
        rateLimit: {
          requests: 100,
          window: '15m',
        },
      },
      monitoring: {
        trackMetrics: true,
        logRequests: true,
        alerting: {
          errorThreshold: 0.05,
          latencyThreshold: 2000,
        },
      },
    },
    {
      id: 'rbac-routes',
      pattern: '/api/rbac/.*',
      patternType: 'regex',
      service: 'rbac-core',
      priority: 90,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'Role-based access control routes',
      security: {
        requireAuth: true,
        permissions: ['rbac:read', 'rbac:write'],
        rateLimit: {
          requests: 200,
          window: '15m',
        },
      },
      monitoring: {
        trackMetrics: true,
        logRequests: true,
        alerting: {
          errorThreshold: 0.03,
          latencyThreshold: 1500,
        },
      },
    },
    {
      id: 'audit-routes',
      pattern: '/api/audit/.*',
      patternType: 'regex',
      service: 'audit-log-service',
      priority: 80,
      methods: ['GET', 'POST'],
      description: 'Audit logging and retrieval routes',
      security: {
        requireAuth: true,
        permissions: ['audit:read'],
        rateLimit: {
          requests: 50,
          window: '15m',
        },
      },
      monitoring: {
        trackMetrics: true,
        logRequests: false,
        alerting: {
          errorThreshold: 0.02,
          latencyThreshold: 1000,
        },
      },
    },
  ];
}

/**
 * Advanced configuration loader with multiple fallback strategies
 */
export class AdvancedRouteMappingLoader {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Load configuration with advanced fallback and validation
   */
  loadConfiguration(options?: {
    configPath?: string;
    validateSchema?: boolean;
    enableWatching?: boolean;
  }): RouteMappingConfiguration {
    const { configPath } = options || {};

    try {
      // Primary: Load from specified path
      if (configPath) {
        return this.loadFromFile(configPath);
      }

      // Secondary: Load from environment-specified path
      const envPath = this.configService.get<string>('ROUTE_CONFIG_PATH');
      if (envPath) {
        return this.loadFromFile(envPath);
      }

      // Tertiary: Try multiple services config
      const servicesConfig = this.configService.get<string>('SERVICES_CONFIG');
      if (servicesConfig) {
        try {
          const parsedConfig: unknown = JSON.parse(servicesConfig);
          const services = Array.isArray(parsedConfig)
            ? (parsedConfig as ServiceMetadata[])
            : ((parsedConfig as Record<string, unknown>).services as ServiceMetadata[]) ||
              getDefaultServices(this.configService);

          return {
            version: '1.0.0',
            services,
            routeMappings: getDefaultRouteMappings(),
            globalSettings: {
              defaultTimeout: 5000,
              defaultRetries: 3,
              enableHealthChecks: true,
            },
          };
        } catch (error) {
          throw new Error(`Failed to parse SERVICES_CONFIG: ${(error as Error).message}`);
        }
      }

      // Fallback: Use default configuration
      return getDefaultConfig(this.configService);
    } catch (error) {
      throw new Error(`Configuration loading failed: ${(error as Error).message}`);
    }
  }

  private loadFromFile(filePath: string): RouteMappingConfiguration {
    try {
      const content = readFileSync(filePath, 'utf8');
      const config = JSON.parse(content) as RouteMappingConfiguration;
      return interpolateObject(config, this.configService);
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${(error as Error).message}`);
    }
  }
}
