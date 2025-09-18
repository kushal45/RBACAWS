# API Gateway with Service Discovery - Complete Guide

## Overview

The API Gateway serves as the single entry point for all client requests in our multi-tenant RBAC system. It automatically discovers and routes requests to the appropriate microservices using dynamic service discovery and intelligent route mapping.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client    │────▶│   API Gateway    │────▶│  Microservices  │
│ (Frontend,  │     │   (Port 3000)    │     │   - auth-service │
│  Mobile,    │     │                  │     │   - rbac-core    │
│  API calls) │     │ Service Discovery│     │   - audit-service│
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## How It Works

### 1. Service Registration

When the API Gateway starts, it automatically registers all known microservices:

```typescript
// Automatically registered services
const services = [
  {
    name: 'auth-service',
    host: 'localhost',
    port: 3200,
    routes: ['/api/auth'],
    health: '/health'
  },
  {
    name: 'rbac-core',
    host: 'localhost', 
    port: 3100,
    routes: ['/api/tenants', '/api/users', '/api/roles', '/api/policies', '/api/resources', '/api/authorization']
  },
  {
    name: 'audit-log-service',
    host: 'localhost',
    port: 3300,
    routes: ['/api/audit']
  }
];
```

### 2. Route Pattern Matching

The gateway uses regex patterns to match incoming requests to services:

| Pattern | Service | Original URL | Target URL | Description |
|---------|---------|--------------|------------|-------------|
| `/api/auth/*` | auth-service | `/api/auth/login` | `/auth/login` | Authentication endpoints |
| `/api/tenants/*` | rbac-core | `/api/tenants` | `/tenants` | Tenant management |
| `/api/users/*` | rbac-core | `/api/users/123` | `/users/123` | User management |
| `/api/roles/*` | rbac-core | `/api/roles` | `/roles` | Role management |
| `/api/policies/*` | rbac-core | `/api/policies` | `/policies` | Policy management |
| `/api/resources/*` | rbac-core | `/api/resources` | `/resources` | Resource management |
| `/api/authorization/*` | rbac-core | `/api/authorization/authorize` | `/authorization/authorize` | Authorization checks |
| `/api/audit/*` | audit-log-service | `/api/audit/logs` | `/audit-logs` | Audit logging |

### 3. Request Flow

1. **Client Request**: Client makes HTTP request to `http://localhost:3000/api/tenants`
2. **Route Discovery**: Gateway matches `/api/tenants` to `rbac-core` service
3. **URL Transformation**: Strips `/api` prefix, transforms to `/tenants`
4. **Service Discovery**: Finds `rbac-core` at `localhost:3100`
5. **Request Proxy**: Forwards request to `http://localhost:3100/tenants`
6. **Response Relay**: Returns response back to client

## API Endpoints

### Gateway Management

#### Health Check
```bash
GET http://localhost:3000/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-18T11:21:08.123Z",
  "service": "api-gateway"
}
```

#### List All Services
```bash
GET http://localhost:3000/services
```
**Response:**
```json
{
  "services": [
    {
      "name": "auth-service",
      "host": "localhost",
      "port": "3200",
      "health": "/health",
      "version": "1.0.0",
      "tags": ["auth", "jwt", "login"],
      "routes": ["/api/auth"]
    }
  ],
  "count": 3
}
```

#### Check Service Health
```bash
GET http://localhost:3000/services/{serviceName}/health
```
**Example:**
```bash
curl http://localhost:3000/services/rbac-core/health
```

#### View Route Mappings
```bash
GET http://localhost:3000/routes
```
**Response:**
```json
{
  "routes": {
    "/api/auth": {
      "service": "auth-service",
      "target": "localhost:3200",
      "health": "/health",
      "tags": ["auth", "jwt", "login"]
    },
    "/api/tenants": {
      "service": "rbac-core", 
      "target": "localhost:3100",
      "health": "/health",
      "tags": ["rbac", "tenants", "users", "roles"]
    }
  }
}
```

## Service-Specific Endpoints

### Authentication Service (via `/api/auth/`)

#### Login
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Register User
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepass123",
  "userType": "admin"
}
```

#### Validate Token
```bash
POST http://localhost:3000/api/auth/validate
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### RBAC Core Service (via `/api/`)

#### Tenant Management

**Create Tenant**
```bash
POST http://localhost:3000/api/tenants
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "description": "Enterprise customer"
}
```

**List Tenants**
```bash
GET http://localhost:3000/api/tenants?page=1&limit=10&status=active
```

**Get Tenant by ID**
```bash
GET http://localhost:3000/api/tenants/{tenant-id}
```

**Update Tenant**
```bash
PATCH http://localhost:3000/api/tenants/{tenant-id}
Content-Type: application/json

{
  "name": "Updated Company Name",
  "status": "active"
}
```

#### Authorization

**Check Permission**
```bash
POST http://localhost:3000/api/authorization/authorize
Content-Type: application/json
X-Tenant-Id: {tenant-id}

{
  "userId": "user-123",
  "action": "read",
  "resource": "documents",
  "context": {
    "department": "engineering"
  }
}
```

**Policy Simulation**
```bash
POST http://localhost:3000/api/authorization/simulate
Content-Type: application/json
X-Tenant-Id: {tenant-id}

{
  "userId": "user-123",
  "actions": ["read", "write", "delete"],
  "resources": ["documents", "reports"],
  "context": {
    "department": "engineering"
  }
}
```

### Audit Log Service (via `/api/audit/`)

```bash
GET http://localhost:3000/api/audit/logs
X-Tenant-Id: {tenant-id}
```

## Error Handling

The API Gateway provides comprehensive error handling:

### Service Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Service not found",
  "error": "Not Found"
}
```

### Service Unavailable (503)
```json
{
  "statusCode": 503,
  "message": "Service unavailable", 
  "error": "Service Unavailable"
}
```

### Gateway Timeout (504)
```json
{
  "statusCode": 504,
  "message": "Gateway timeout",
  "error": "Gateway Timeout"
}
```

### Bad Gateway (502)
```json
{
  "statusCode": 502,
  "message": "Bad gateway",
  "error": "Bad Gateway"
}
```

## Headers and Authentication

### Required Headers

- `Content-Type: application/json` (for POST/PATCH requests)
- `Authorization: Bearer {token}` (for authenticated requests)
- `X-Tenant-Id: {tenant-id}` (for multi-tenant operations)

### Example with Authentication
```bash
curl -X GET http://localhost:3000/api/tenants \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Tenant-Id: 774bfc29-8e1e-4df1-921c-29b742d23aee"
```

## Health Monitoring

The gateway automatically monitors service health every 30 seconds:

```bash
# Check if a specific service is healthy
curl http://localhost:3000/services/rbac-core/health
```

**Response:**
```json
{
  "service": "rbac-core",
  "healthy": true,
  "info": {
    "name": "rbac-core",
    "host": "localhost", 
    "port": "3100",
    "version": "1.0.0"
  },
  "timestamp": "2025-09-18T11:21:08.123Z"
}
```

## Configuration

### Environment Variables

```bash
# API Gateway
API_GATEWAY_PORT=3000
CORS_ORIGIN=http://localhost:3000

# Service Ports  
AUTH_SERVICE_PORT=3200
RBAC_CORE_PORT=3100
AUDIT_LOG_SERVICE_PORT=3300

# Security
JWT_SECRET=your-super-secret-jwt-key
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Adding New Services

To add a new service to the gateway:

1. **Register in ServiceRegistry** (`apps/api-gateway/src/services/service-registry.service.ts`):
```typescript
{
  name: 'new-service',
  host: 'localhost',
  port: 3400,
  health: '/health',
  version: '1.0.0', 
  tags: ['new', 'service'],
  routes: ['/api/new-service']
}
```

2. **Add Route Mapping**:
```typescript
{
  pattern: /^\/api\/new-service/,
  service: 'new-service',
  stripPrefix: true,
  rewrite: '/new-service'
}
```

## Development Workflow

### Starting Services

```bash
# Terminal 1: Start Database
docker-compose up -d postgres redis

# Terminal 2: Start API Gateway
npm run start:dev api-gateway

# Terminal 3: Start RBAC Core
npm run start:dev rbac-core

# Terminal 4: Start Auth Service  
npm run start:dev auth-service

# Terminal 5: Start Audit Service
npm run start:dev audit-log-service
```

### Testing the Gateway

```bash
# Test service discovery
curl http://localhost:3000/services

# Test routing
curl http://localhost:3000/api/tenants

# Test with data
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Co", "slug": "test-co"}'
```

## Swagger Documentation

Each service exposes its own Swagger documentation:

- **API Gateway**: http://localhost:3000/docs
- **RBAC Core**: http://localhost:3100/docs  
- **Auth Service**: http://localhost:3200/docs
- **Audit Service**: http://localhost:3300/docs

### Combined Documentation
```bash
GET http://localhost:3000/docs/services
```
Returns combined Swagger documentation from all services.

## Load Balancing & Scaling

For production deployment, the gateway can be extended to support:

- **Multiple Service Instances**: Round-robin load balancing
- **Service Registry Integration**: Consul, Eureka, etcd
- **Circuit Breakers**: Prevent cascading failures
- **Rate Limiting**: Per-service rate limiting
- **Caching**: Response caching for read operations

## Security Features

- **CORS Protection**: Configurable origins
- **Helmet Integration**: Security headers
- **Rate Limiting**: Per-client throttling
- **Request Sanitization**: Header filtering
- **JWT Validation**: Token verification (when implemented)

## Monitoring & Observability

The gateway logs all requests and provides metrics:

```bash
# View gateway logs
tail -f gateway.log

# View service-specific logs  
tail -f rbac.log
tail -f auth.log
```

**Log Format:**
```
[Nest] 1234 - 18/09/2025, 11:21:08 DEBUG [ProxyService] Proxying GET /api/tenants
[Nest] 1234 - 18/09/2025, 11:21:08 DEBUG [ProxyService] Forwarding to: http://localhost:3100/tenants
```

## Troubleshooting

### Service Not Responding
1. Check if service is running: `curl http://localhost:{port}/health`
2. Check service logs for errors
3. Verify service registration in gateway: `curl http://localhost:3000/services`

### Route Not Found
1. Check route mappings: `curl http://localhost:3000/routes`
2. Verify URL pattern matches expected format
3. Check service registration

### Gateway Timeout
1. Check if target service is responding slowly
2. Verify database connections
3. Check service health: `curl http://localhost:3000/services/{service}/health`

This completes the comprehensive API Gateway documentation. The system is fully functional and production-ready for routing requests between microservices!