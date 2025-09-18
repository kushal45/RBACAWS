import type { ServiceInfo } from '../interfaces/service-discovery.interface';
import type { ConfigService } from '@nestjs/config';

export interface ServiceRegistryConfig {
  services: ServiceInfo[];
  healthCheckInterval: number;
  healthCheckTimeout: number;
}

export const getServiceRegistryConfig = (configService: ConfigService): ServiceRegistryConfig => {
  // Parse services from environment variable or use defaults
  const servicesConfig = configService.get<string>('SERVICES_CONFIG');

  let services: ServiceInfo[];

  if (servicesConfig) {
    try {
      // Parse JSON configuration from environment with type assertion
      const parsedServices = JSON.parse(servicesConfig) as ServiceInfo[];
      services = Array.isArray(parsedServices) ? parsedServices : getDefaultServices(configService);
    } catch (error) {
      // Log warning in non-production environments only
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse SERVICES_CONFIG, using defaults:', (error as Error).message);
      }
      services = getDefaultServices(configService);
    }
  } else {
    // Use default service configuration
    services = getDefaultServices(configService);
  }

  return {
    services,
    healthCheckInterval: configService.get<number>('SERVICE_HEALTH_CHECK_INTERVAL', 30000), // 30 seconds
    healthCheckTimeout: configService.get<number>('SERVICE_HEALTH_CHECK_TIMEOUT', 5000), // 5 seconds
  };
};

/**
 * Default service configuration with environment variable overrides
 */
function getDefaultServices(configService: ConfigService): ServiceInfo[] {
  return [
    {
      name: 'auth-service',
      host: configService.get<string>('AUTH_SERVICE_HOST', 'localhost'),
      port: configService.get<number>('AUTH_SERVICE_PORT', 3200),
      health: '/health',
      version: configService.get<string>('AUTH_SERVICE_VERSION', '1.0.0'),
      tags: ['auth', 'jwt', 'login'],
      routes: ['/api/auth'],
    },
    {
      name: 'rbac-core',
      host: configService.get<string>('RBAC_CORE_HOST', 'localhost'),
      port: configService.get<number>('RBAC_CORE_PORT', 3100),
      health: '//health',
      version: configService.get<string>('RBAC_CORE_VERSION', '1.0.0'),
      tags: ['rbac', 'tenants', 'users', 'roles'],
      routes: [
        '/api/tenants',
        '/api/users',
        '/api/roles',
        '/api/policies',
        '/api/resources',
        '/api/authorization',
      ],
    },
    {
      name: 'audit-log-service',
      host: configService.get<string>('AUDIT_LOG_SERVICE_HOST', 'localhost'),
      port: configService.get<number>('AUDIT_LOG_SERVICE_PORT', 3300),
      health: '/health',
      version: configService.get<string>('AUDIT_LOG_SERVICE_VERSION', '1.0.0'),
      tags: ['audit', 'logs', 'monitoring'],
      routes: ['/api/audit'],
    },
  ];
}

/**
 * Helper function to create service configuration from environment variables
 */
export const createServiceConfig = (
  name: string,
  host: string,
  port: number,
  options: Partial<ServiceInfo> = {},
): ServiceInfo => ({
  name,
  host,
  port,
  health: '/health',
  version: '1.0.0',
  tags: [],
  routes: [],
  ...options,
});
