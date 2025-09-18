# Dynamic Route Mapping Configuration

This document describes the enterprise-grade dynamic route mapping configuration system that replaces hardcoded route arrays in the service registry.

## Overview

The dynamic route mapping system provides:

- **JSON-based Configuration**: External configuration files for route mappings and service metadata
- **Environment Variable Support**: Dynamic interpolation using `${VAR:default}` syntax
- **Schema Validation**: JSON Schema validation for configuration integrity
- **Multiple Fallback Strategies**: File paths → environment variables → defaults
- **Enterprise Features**: Security, monitoring, transformations, and priority-based routing

## Configuration Files

### Route Mappings (`config/route-mappings.json`)

Main configuration file containing services and route mappings:

```json
{
  "version": "1.0.0",
  "services": [
    {
      "id": "auth-service",
      "name": "Authentication Service",
      "version": "1.0.0",
      "baseUrl": "${AUTH_SERVICE_URL:http://localhost:3001}",
      "healthCheck": "/health",
      "timeout": 5000,
      "retries": 3,
      "tags": ["auth", "security"],
      "environment": "${NODE_ENV:development}"
    }
  ],
  "routeMappings": [
    {
      "id": "auth-routes",
      "pattern": "/api/auth/.*",
      "patternType": "regex",
      "service": "auth-service",
      "priority": 100,
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "description": "Authentication and user management routes",
      "transformations": {
        "requestTransform": "strip",
        "responseTransform": "/auth"
      },
      "security": {
        "requireAuth": false,
        "permissions": ["auth:read", "auth:write"],
        "rateLimit": {
          "requests": 100,
          "window": "15m"
        }
      },
      "monitoring": {
        "trackMetrics": true,
        "logRequests": true,
        "alerting": {
          "errorThreshold": 0.05,
          "latencyThreshold": 2000
        }
      }
    }
  ],
  "globalSettings": {
    "defaultTimeout": 5000,
    "defaultRetries": 3,
    "enableHealthChecks": true
  }
}
```

### Schema Validation (`config/route-mapping.schema.json`)

JSON Schema for validating configuration files:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "services": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "baseUrl": { "type": "string" }
        },
        "required": ["id", "name", "baseUrl"]
      }
    }
  },
  "required": ["version", "services", "routeMappings"]
}
```

## Environment Variable Interpolation

The system supports dynamic environment variable interpolation using the format `${VAR_NAME:default_value}`:

- `${AUTH_SERVICE_URL:http://localhost:3001}` - Uses AUTH_SERVICE_URL env var or defaults to localhost
- `${NODE_ENV:development}` - Uses NODE_ENV env var or defaults to development
- `${ENABLE_AUTH:true}` - Uses ENABLE_AUTH env var or defaults to true

## Configuration Loading

### Loading Strategy

The configuration loader follows this fallback strategy:

1. **Specified Path**: Load from explicitly provided config path
2. **Environment Path**: Check `ROUTE_CONFIG_PATH` environment variable
3. **Default Locations**: Try `./config/route-mappings.json`, `./route-mappings.json`, `/etc/route-mappings.json`
4. **Environment Variable**: Parse `ROUTE_MAPPING_CONFIG` as JSON
5. **Fallback**: Use built-in default configuration

### Usage

```typescript
import { loadRouteMappingConfig, convertRouteMapping } from '@lib/common';

// Load configuration
const config = loadRouteMappingConfig(configService);

// Convert enhanced mappings to service registry format
config.routeMappings.forEach(enhanced => {
  const routeMapping = convertRouteMapping(enhanced);
  // Use routeMapping in service registry
});
```

## Route Pattern Types

### Regex (default)

```json
{
  "pattern": "/api/auth/.*",
  "patternType": "regex"
}
```

### Glob

```json
{
  "pattern": "/api/users/*",
  "patternType": "glob"
}
```

### Exact

```json
{
  "pattern": "/api/health",
  "patternType": "exact"
}
```

## Security Configuration

Each route can define security requirements:

```json
{
  "security": {
    "requireAuth": true,
    "permissions": ["user:read", "user:write"],
    "rateLimit": {
      "requests": 100,
      "window": "15m"
    }
  }
}
```

## Monitoring Configuration

Routes support comprehensive monitoring settings:

```json
{
  "monitoring": {
    "trackMetrics": true,
    "logRequests": true,
    "alerting": {
      "errorThreshold": 0.05,
      "latencyThreshold": 2000
    }
  }
}
```

## Transformations

Route transformations handle request/response modifications:

```json
{
  "transformations": {
    "requestTransform": "strip",
    "responseTransform": "/auth",
    "headers": {
      "X-Service": "auth-service"
    }
  }
}
```

## Advanced Usage

### Custom Configuration Loader

```typescript
import { AdvancedRouteMappingLoader } from '@lib/common';

const loader = new AdvancedRouteMappingLoader(configService);
const config = await loader.loadConfiguration({
  configPath: '/custom/path/config.json',
  validateSchema: true,
  enableWatching: true
});
```

### Service Registration

The service registry automatically uses the dynamic configuration:

```typescript
@Injectable()
export class ServiceRegistryService {
  constructor(private configService: ConfigService) {
    this.routeConfig = loadRouteMappingConfig(configService);
    this.initializeRouteMappings();
  }

  private initializeRouteMappings(): void {
    this.routeConfig.routeMappings.forEach(enhancedMapping => {
      const routeMapping = convertRouteMapping(enhancedMapping);
      this.routeMappings.push(routeMapping);
    });
  }
}
```

## Benefits

1. **Externalized Configuration**: No hardcoded routes in source code
2. **Environment-Specific**: Dynamic configuration per environment
3. **Type Safety**: Full TypeScript support with strict typing
4. **Validation**: JSON Schema validation prevents configuration errors
5. **Enterprise Ready**: Security, monitoring, and transformation support
6. **Hot Reload**: Configuration changes without code deployment
7. **Fallback Strategy**: Robust fallback mechanisms for reliability

## Migration Guide

### From Hardcoded Routes

**Before:**

```typescript
this.routeMappings.push({
  pattern: /^\/api\/auth\//,
  service: 'auth-service',
  stripPrefix: true,
  rewrite: '/auth'
});
```

**After:**

```json
{
  "id": "auth-routes",
  "pattern": "/api/auth/.*",
  "patternType": "regex",
  "service": "auth-service",
  "transformations": {
    "requestTransform": "strip",
    "responseTransform": "/auth"
  }
}
```

### Environment Variables

Set these environment variables for your deployment:

```bash
AUTH_SERVICE_URL=http://auth-service:3001
RBAC_SERVICE_URL=http://rbac-core:3002
AUDIT_SERVICE_URL=http://audit-log:3003
ROUTE_CONFIG_PATH=/etc/config/route-mappings.json
NODE_ENV=production
```

## Best Practices

1. **Use Environment Variables**: Keep environment-specific values in env vars
2. **Validate Configuration**: Always use JSON Schema validation
3. **Set Priorities**: Use priority values for route precedence
4. **Monitor Routes**: Enable metrics and alerting for production routes
5. **Security First**: Configure authentication and rate limiting appropriately
6. **Version Control**: Keep configuration files in version control
7. **Documentation**: Document custom route patterns and transformations

This dynamic configuration system provides enterprise-grade flexibility while maintaining type safety and reliability for service discovery and routing in your microservices architecture.
