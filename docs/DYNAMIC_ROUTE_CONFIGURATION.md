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

## Service Endpoint Routing

This section details how each microservice's API endpoints are accessible through the API Gateway using dynamic route configuration.

### Authentication Service (`auth-service`)

The auth-service handles user authentication, registration, and token management.

**Service Configuration:**

```json
{
  "name": "auth-service",
  "host": "${AUTH_SERVICE_HOST:localhost}",
  "port": 3200,
  "health": "/health",
  "tags": ["auth", "security", "users"]
}
```

**Route Mapping:**

```json
{
  "id": "auth-routes",
  "pattern": "^/api/auth/",
  "service": "auth-service",
  "priority": 100,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/auth"
  }
}
```

**Available Endpoints:**

| HTTP Method | API Gateway URL      | Target Service URL | Description                              |
| ----------- | -------------------- | ------------------ | ---------------------------------------- |
| `POST`      | `/api/auth/login`    | `/auth/login`      | User authentication with email/password  |
| `POST`      | `/api/auth/register` | `/auth/register`   | User registration with specified type    |
| `POST`      | `/api/auth/refresh`  | `/auth/refresh`    | Refresh access token using refresh token |
| `POST`      | `/api/auth/validate` | `/auth/validate`   | Validate JWT token and return user info  |
| `POST`      | `/api/auth/logout`   | `/auth/logout`     | Logout user and invalidate token         |
| `GET`       | `/api/auth/me`       | `/auth/me`         | Get current authenticated user info      |
| `GET`       | `/api/auth/health`   | `/auth/health`     | Service health check                     |

**Example Usage:**

```bash
# User Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# User Registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepass123",
    "userType": "admin"
  }'

# Get Current User (requires authentication)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <jwt_token>"
```

### RBAC Core Service (`rbac-core`)

The rbac-core service manages tenants, users, roles, policies, resources, and authorization decisions.

**Service Configuration:**

```json
{
  "name": "rbac-core",
  "host": "${RBAC_CORE_HOST:localhost}",
  "port": 3100,
  "health": "/health",
  "tags": ["rbac", "authorization", "policies"]
}
```

#### Tenant Management Routes

**Route Mapping:**

```json
{
  "id": "rbac-tenants",
  "pattern": "^/api/tenants",
  "service": "rbac-core",
  "priority": 90,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/tenants"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["tenant:read", "tenant:write"]
  }
}
```

| HTTP Method | API Gateway URL              | Target Service URL       | Description                  |
| ----------- | ---------------------------- | ------------------------ | ---------------------------- |
| `POST`      | `/api/tenants`               | `/tenants`               | Create new tenant            |
| `GET`       | `/api/tenants`               | `/tenants`               | List all tenants (paginated) |
| `GET`       | `/api/tenants/:id`           | `/tenants/:id`           | Get tenant by ID             |
| `GET`       | `/api/tenants/by-slug/:slug` | `/tenants/by-slug/:slug` | Get tenant by slug           |
| `PATCH`     | `/api/tenants/:id`           | `/tenants/:id`           | Update tenant                |
| `PATCH`     | `/api/tenants/:id/suspend`   | `/tenants/:id/suspend`   | Suspend tenant               |
| `PATCH`     | `/api/tenants/:id/activate`  | `/tenants/:id/activate`  | Activate tenant              |
| `DELETE`    | `/api/tenants/:id`           | `/tenants/:id`           | Delete tenant                |

#### User Management Routes

**Route Mapping:**

```json
{
  "id": "rbac-users",
  "pattern": "^/api/users",
  "service": "rbac-core",
  "priority": 90,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/users"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["user:read", "user:write"]
  }
}
```

| HTTP Method | API Gateway URL  | Target Service URL | Description            |
| ----------- | ---------------- | ------------------ | ---------------------- |
| `POST`      | `/api/users`     | `/users`           | Create/invite new user |
| `GET`       | `/api/users`     | `/users`           | List users in tenant   |
| `GET`       | `/api/users/:id` | `/users/:id`       | Get user by ID         |
| `PATCH`     | `/api/users/:id` | `/users/:id`       | Update user            |
| `DELETE`    | `/api/users/:id` | `/users/:id`       | Delete user            |

#### Role Management Routes

**Route Mapping:**

```json
{
  "id": "rbac-roles",
  "pattern": "^/api/roles",
  "service": "rbac-core",
  "priority": 90,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/roles"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["role:read", "role:write"]
  }
}
```

| HTTP Method | API Gateway URL  | Target Service URL | Description              |
| ----------- | ---------------- | ------------------ | ------------------------ |
| `POST`      | `/api/roles`     | `/roles`           | Create new role          |
| `GET`       | `/api/roles`     | `/roles`           | List all roles in tenant |
| `GET`       | `/api/roles/:id` | `/roles/:id`       | Get role by ID           |
| `PATCH`     | `/api/roles/:id` | `/roles/:id`       | Update role              |
| `DELETE`    | `/api/roles/:id` | `/roles/:id`       | Delete role              |

#### Policy Management Routes

**Route Mapping:**

```json
{
  "id": "rbac-policies",
  "pattern": "^/api/policies",
  "service": "rbac-core",
  "priority": 90,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/policies"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["policy:read", "policy:write"]
  }
}
```

| HTTP Method | API Gateway URL     | Target Service URL | Description       |
| ----------- | ------------------- | ------------------ | ----------------- |
| `POST`      | `/api/policies`     | `/policies`        | Create new policy |
| `GET`       | `/api/policies`     | `/policies`        | List all policies |
| `GET`       | `/api/policies/:id` | `/policies/:id`    | Get policy by ID  |
| `PATCH`     | `/api/policies/:id` | `/policies/:id`    | Update policy     |
| `DELETE`    | `/api/policies/:id` | `/policies/:id`    | Delete policy     |

#### Resource Management Routes

**Route Mapping:**

```json
{
  "id": "rbac-resources",
  "pattern": "^/api/resources",
  "service": "rbac-core",
  "priority": 90,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/resources"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["resource:read", "resource:write"]
  }
}
```

| HTTP Method | API Gateway URL      | Target Service URL | Description           |
| ----------- | -------------------- | ------------------ | --------------------- |
| `POST`      | `/api/resources`     | `/resources`       | Register new resource |
| `GET`       | `/api/resources`     | `/resources`       | List all resources    |
| `GET`       | `/api/resources/:id` | `/resources/:id`   | Get resource by ID    |
| `PATCH`     | `/api/resources/:id` | `/resources/:id`   | Update resource       |
| `DELETE`    | `/api/resources/:id` | `/resources/:id`   | Delete resource       |

#### Authorization Routes

**Route Mapping:**

```json
{
  "id": "rbac-authorization",
  "pattern": "^/api/authorization",
  "service": "rbac-core",
  "priority": 95,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/authorization"
  },
  "security": {
    "requireAuth": true,
    "rateLimiting": {
      "enabled": true,
      "requests": 1000,
      "window": 60000
    }
  }
}
```

| HTTP Method | API Gateway URL                | Target Service URL         | Description                         |
| ----------- | ------------------------------ | -------------------------- | ----------------------------------- |
| `POST`      | `/api/authorization/authorize` | `/authorization/authorize` | Check user authorization for action |
| `POST`      | `/api/authorization/simulate`  | `/authorization/simulate`  | Simulate policy evaluation          |

**Example Usage:**

```bash
# Create Tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "description": "Enterprise customer"
  }'

# Check Authorization
curl -X POST http://localhost:3000/api/authorization/authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Tenant-Id: <tenant-id>" \
  -d '{
    "userId": "user-123",
    "action": "read",
    "resource": "documents",
    "context": {
      "department": "engineering"
    }
  }'
```

### Audit Log Service (`audit-log-service`)

The audit-log-service handles logging of policy changes, permission checks, and admin actions.

**Service Configuration:**

```json
{
  "name": "audit-log-service",
  "host": "${AUDIT_LOG_SERVICE_HOST:localhost}",
  "port": 3300,
  "health": "/health",
  "tags": ["audit", "logging", "compliance"]
}
```

**Route Mapping:**

```json
{
  "id": "audit-logs",
  "pattern": "^/api/audit",
  "service": "audit-log-service",
  "priority": 80,
  "transformations": {
    "stripPrefix": true,
    "rewrite": "/audit-logs"
  },
  "security": {
    "requireAuth": true,
    "permissions": ["audit:read", "audit:write"]
  }
}
```

**Available Endpoints:**

| HTTP Method | API Gateway URL     | Target Service URL   | Description                      |
| ----------- | ------------------- | -------------------- | -------------------------------- |
| `GET`       | `/api/audit`        | `/audit-logs`        | Get audit logs (basic endpoint)  |
| `GET`       | `/api/audit/health` | `/audit-logs/health` | Service health check             |
| `GET`       | `/api/audit/logs`   | `/audit-logs/logs`   | Retrieve audit logs with filters |
| `POST`      | `/api/audit/logs`   | `/audit-logs/logs`   | Create new audit log entry       |

**Example Usage:**

```bash
# Get Audit Logs
curl -X GET http://localhost:3000/api/audit/logs \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Tenant-Id: <tenant-id>"

# Health Check
curl -X GET http://localhost:3000/api/audit/health
```

## Route Priority and Precedence

The routing system uses priority values to determine route precedence:

1. **Auth Token Routes** (`priority: 110`) - Specific auth endpoints like login/register
2. **Auth General Routes** (`priority: 100`) - General auth endpoints
3. **Authorization Routes** (`priority: 95`) - Authorization checks (high frequency)
4. **RBAC Management Routes** (`priority: 90`) - Tenant, user, role, policy, resource management
5. **Audit Routes** (`priority: 80`) - Audit logging endpoints

## Complete Route Mapping Reference

Here's the complete routing table showing how API Gateway directs requests:

```
┌─────────────────────────────┬─────────────────┬───────────────────────────┬──────────────┐
│ API Gateway Pattern         │ Target Service  │ Rewritten URL             │ Priority     │
├─────────────────────────────┼─────────────────┼───────────────────────────┼──────────────┤
│ /api/auth/(login|register)  │ auth-service    │ /auth/(login|register)    │ 110          │
│ /api/auth/*                 │ auth-service    │ /auth/*                   │ 100          │
│ /api/authorization/*        │ rbac-core       │ /authorization/*          │ 95           │
│ /api/tenants*               │ rbac-core       │ /tenants*                 │ 90           │
│ /api/users*                 │ rbac-core       │ /users*                   │ 90           │
│ /api/roles*                 │ rbac-core       │ /roles*                   │ 90           │
│ /api/policies*              │ rbac-core       │ /policies*                │ 90           │
│ /api/resources*             │ rbac-core       │ /resources*               │ 90           │
│ /api/audit*                 │ audit-log-svc   │ /audit-logs*              │ 80           │
└─────────────────────────────┴─────────────────┴───────────────────────────┴──────────────┘
```

## Environment Variables for Service Discovery

```bash
# Service Discovery
AUTH_SERVICE_HOST=localhost
RBAC_CORE_HOST=localhost
AUDIT_LOG_SERVICE_HOST=localhost

# Service Ports
AUTH_SERVICE_PORT=3200
RBAC_CORE_PORT=3100
AUDIT_LOG_SERVICE_PORT=3300
API_GATEWAY_PORT=3000

# Route Configuration
ROUTE_CONFIG_PATH=./config/route-mappings.json
ROUTE_MAPPING_CONFIG='{"version":"1.0.0",...}'
```

## Best Practices

1. **Use Environment Variables**: Keep environment-specific values in env vars
2. **Validate Configuration**: Always use JSON Schema validation
3. **Set Priorities**: Use priority values for route precedence
4. **Monitor Routes**: Enable metrics and alerting for production routes
5. **Security First**: Configure authentication and rate limiting appropriately
6. **Version Control**: Keep configuration files in version control
7. **Documentation**: Document custom route patterns and transformations
8. **Tenant Isolation**: Always include tenant context in multi-tenant operations
9. **Rate Limiting**: Configure appropriate rate limits per service and endpoint type
10. **Health Checks**: Ensure all services expose health endpoints for monitoring

This dynamic configuration system provides enterprise-grade flexibility while maintaining type safety and reliability for service discovery and routing in your microservices architecture.
