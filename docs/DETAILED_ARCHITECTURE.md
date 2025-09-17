# Detailed Architecture: Multi-Tenant RBAC/IAM System

## 1. Component Overview

### Covered (Implemented)
- **API Gateway**
  - Routing, authentication, logging, rate limiting, Swagger docs
- **RBAC Core Service**
  - Tenants, users, roles, resources, policies
  - Permission checks, policy evaluation
- **Auth Service**
  - JWT authentication, login endpoints
- **Audit Log Service**
  - Logging of policy changes, permission checks, admin actions
- **Database (Postgres)**
  - Row-level isolation, entities, migrations
- **Monorepo Structure**
  - Nx/NestJS, modular apps and libraries

### Needs to be Covered (Planned/Missing)
- **SSO/IdP Integration**
  - OAuth2, external identity providers
- **Advanced Policy Conditions**
  - Attribute-based access, custom conditions
- **Resource Management Service**
  - CRUD for resources, resource types
- **Analytics/Reporting Service**
  - Usage, access patterns, compliance
- **gRPC/GraphQL Support**
  - Alternative API protocols
- **Comprehensive Test Coverage**
  - E2E, integration, unit tests
- **CI/CD Pipeline**
  - Automated build, test, deploy
- **API Rate Limiting per Tenant**
  - Fine-grained throttling
- **Multi-Region/HA Deployment**
  - Scalability, failover

## 2. Data Flow & Sequence Diagrams

### Tenant Flows
#### Create Tenant (`POST /api/tenants`)
```mermaid
sequenceDiagram
  participant Admin
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant DB

  Admin->>API_Gateway: Create tenant request
  API_Gateway->>Auth_Service: Validate admin JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Create tenant
  RBAC_Core->>DB: Insert tenant record
  DB-->>RBAC_Core: Confirmation
  RBAC_Core-->>API_Gateway: Tenant created
  API_Gateway-->>Admin: Success response
```

### User Flows
#### Add/Invite User (`POST /api/tenants/:tenant_id/users`)
```mermaid
sequenceDiagram
  participant Admin
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant DB

  Admin->>API_Gateway: Add/invite user request
  API_Gateway->>Auth_Service: Validate admin JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Create/invite user
  RBAC_Core->>DB: Insert user record
  DB-->>RBAC_Core: Confirmation
  RBAC_Core-->>API_Gateway: User created/invited
  API_Gateway-->>Admin: Success response
```

### Role Flows
#### Create Role (`POST /api/tenants/:tenant_id/roles`)
```mermaid
sequenceDiagram
  participant Admin
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant DB

  Admin->>API_Gateway: Create role request
  API_Gateway->>Auth_Service: Validate admin JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Create role
  RBAC_Core->>DB: Insert role record
  DB-->>RBAC_Core: Confirmation
  RBAC_Core-->>API_Gateway: Role created
  API_Gateway-->>Admin: Success response
```

### Resource Flows
#### Register Resource (`POST /api/tenants/:tenant_id/resources`)
```mermaid
sequenceDiagram
  participant Admin
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant DB

  Admin->>API_Gateway: Register resource request
  API_Gateway->>Auth_Service: Validate admin JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Register resource
  RBAC_Core->>DB: Insert resource record
  DB-->>RBAC_Core: Confirmation
  RBAC_Core-->>API_Gateway: Resource registered
  API_Gateway-->>Admin: Success response
```

### Auth Flows
#### Login/Authenticate (JWT)
```mermaid
sequenceDiagram
  participant User
  participant API_Gateway
  participant Auth_Service

  User->>API_Gateway: Login request
  API_Gateway->>Auth_Service: Validate credentials
  Auth_Service-->>API_Gateway: JWT issued
  API_Gateway-->>User: JWT token
```

### Policy Flows
#### Permission Check (`POST /api/authorize`)
```mermaid
sequenceDiagram
  participant Client
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant Audit_Log
  participant DB

  Client->>API_Gateway: Authorization request
  API_Gateway->>Auth_Service: Validate JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Forward request
  RBAC_Core->>DB: Fetch user, roles, policies
  DB-->>RBAC_Core: Data
  RBAC_Core->>RBAC_Core: Evaluate policies
  RBAC_Core->>Audit_Log: Log attempt
  Audit_Log-->>RBAC_Core: Log confirmation
  RBAC_Core-->>API_Gateway: Decision
  API_Gateway-->>Client: Allow/Deny
```

#### Policy Simulation (`GET /api/tenants/:tenant_id/policy-simulate`)
```mermaid
sequenceDiagram
  participant Client
  participant API_Gateway
  participant Auth_Service
  participant RBAC_Core
  participant DB

  Client->>API_Gateway: Policy simulation request
  API_Gateway->>Auth_Service: Validate JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>RBAC_Core: Simulate policy
  RBAC_Core->>DB: Fetch user, roles, policies
  DB-->>RBAC_Core: Data
  RBAC_Core->>RBAC_Core: Simulate policy evaluation
  RBAC_Core-->>API_Gateway: Simulation result
  API_Gateway-->>Client: Simulation response
```

### Audit Flows
#### Audit Log Fetch (`GET /api/tenants/:tenant_id/audit-logs`)
```mermaid
sequenceDiagram
  participant Admin
  participant API_Gateway
  participant Auth_Service
  participant Audit_Log
  participant DB

  Admin->>API_Gateway: Fetch audit logs request
  API_Gateway->>Auth_Service: Validate admin JWT
  Auth_Service-->>API_Gateway: Auth result
  API_Gateway->>Audit_Log: Fetch logs
  Audit_Log->>DB: Query logs
  DB-->>Audit_Log: Log data
  Audit_Log-->>API_Gateway: Logs
  API_Gateway-->>Admin: Log response
```

## 3. Component Responsibilities

### API Gateway
- Entry point, authentication, routing, rate limiting, logging, API docs

### RBAC Core
- Tenants, users, roles, resources, policies
- Permission checks, policy evaluation

### Auth Service
- JWT/OAuth2 authentication, login, SSO/IdP integration (future)

### Audit Log Service
- Policy updates, permission checks, admin actions

### Database
- Multi-tenant isolation, migrations, seeders

## 4. Coverage Checklist
| Component                | Status      | Notes                                    |
|-------------------------|-------------|------------------------------------------|
| API Gateway             | Implemented | Swagger, logging, rate limiting present  |
| RBAC Core               | Implemented | Policy engine, entities, DTOs present    |
| Auth Service            | Implemented | JWT, login endpoints                     |
| Audit Log Service       | Implemented | Logging actions, policy changes          |
| SSO/IdP Integration     | Planned     | OAuth2, external IdP support             |
| Resource Management     | Partial     | CRUD endpoints, types                    |
| Analytics/Reporting     | Planned     | Usage, compliance, access logs           |
| gRPC/GraphQL Support    | Planned     | API protocol alternatives                |
| CI/CD Pipeline          | Partial     | GitHub Actions, needs deploy steps       |
| Multi-Region/HA         | Planned     | Scalability, failover                    |
| Test Coverage           | Partial     | E2E, integration, unit tests             |

## 5. Recommendations & Next Steps
- Implement SSO/IdP integration for enterprise use cases
- Expand policy engine for attribute-based and custom conditions
- Add analytics/reporting microservice
- Enhance CI/CD for automated deployment
- Increase test coverage (unit, integration, E2E)
- Document API endpoints and flows in `/docs`
- Plan for multi-region deployment and HA

## 6. Policy Examples & Sample Data

### Policy Schema Format
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["resource:read", "resource:update"],
      "Resource": ["arn:app:tenantX:resource:abc123"],
      "Condition": {
        "StringEquals": { "user:department": "engineering" }
      }
    }
  ]
}
```

### Sample Policy Examples

#### Administrative Policy
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["*"],
      "Resource": ["arn:app:tenant-123:*"],
      "Condition": {
        "StringEquals": { "user:role": "admin" }
      }
    }
  ]
}
```

#### Read-Only User Policy
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["resource:read", "user:profile:read"],
      "Resource": ["arn:app:tenant-123:resource:*", "arn:app:tenant-123:user:self"],
      "Condition": {
        "StringEquals": { "user:status": "active" }
      }
    }
  ]
}
```

#### Department-Based Policy
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["document:read", "document:write"],
      "Resource": ["arn:app:tenant-123:document:*"],
      "Condition": {
        "StringEquals": { "user:department": "hr" },
        "StringLike": { "resource:category": "hr-*" }
      }
    }
  ]
}
```

## 7. Sample API Requests & Responses

### Create Tenant
**Request:**
```http
POST /api/tenants
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "description": "Technology company",
  "config": {
    "maxUsers": 1000,
    "features": ["sso", "audit", "analytics"]
  }
}
```

**Response:**
```json
{
  "id": "tenant-123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "status": "active",
  "createdAt": "2025-09-17T10:00:00Z"
}
```

### Add User to Tenant
**Request:**
```http
POST /api/tenants/tenant-123/users
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "email": "john.doe@acme.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "department": "engineering"
  },
  "roleIds": ["role-456"]
}
```

**Response:**
```json
{
  "id": "user-789",
  "email": "john.doe@acme.com",
  "status": "pending_invitation",
  "invitationToken": "inv_token_xyz",
  "createdAt": "2025-09-17T10:05:00Z"
}
```

### Create Role
**Request:**
```http
POST /api/tenants/tenant-123/roles
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "name": "Engineering Lead",
  "description": "Lead engineers with team management access",
  "type": "custom",
  "permissions": ["user:manage", "project:read", "project:write"],
  "metadata": {
    "level": "senior",
    "department": "engineering"
  }
}
```

**Response:**
```json
{
  "id": "role-456",
  "name": "Engineering Lead",
  "type": "custom",
  "systemRole": false,
  "createdAt": "2025-09-17T10:10:00Z"
}
```

### Authorization Check
**Request:**
```http
POST /api/authorize
Content-Type: application/json
Authorization: Bearer <user_jwt>

{
  "userId": "user-789",
  "action": "document:read",
  "resource": "arn:app:tenant-123:document:doc-001",
  "context": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "department": "engineering"
  }
}
```

**Response:**
```json
{
  "decision": "ALLOW",
  "principal": "user-789",
  "action": "document:read",
  "resource": "arn:app:tenant-123:document:doc-001",
  "evaluatedAt": "2025-09-17T10:15:00Z",
  "policies": [
    {
      "id": "policy-001",
      "name": "Engineering Document Access",
      "effect": "ALLOW"
    }
  ]
}
```

### Policy Simulation
**Request:**
```http
POST /api/tenants/tenant-123/policy-simulate
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "userId": "user-789",
  "scenarios": [
    {
      "action": "document:delete",
      "resource": "arn:app:tenant-123:document:doc-001"
    },
    {
      "action": "user:create",
      "resource": "arn:app:tenant-123:user:*"
    }
  ]
}
```

**Response:**
```json
{
  "userId": "user-789",
  "results": [
    {
      "action": "document:delete",
      "resource": "arn:app:tenant-123:document:doc-001",
      "decision": "DENY",
      "reason": "No matching policy allows this action"
    },
    {
      "action": "user:create",
      "resource": "arn:app:tenant-123:user:*",
      "decision": "ALLOW",
      "matchedPolicy": "policy-002"
    }
  ],
  "simulatedAt": "2025-09-17T10:20:00Z"
}
```

### Fetch Audit Logs
**Request:**
```http
GET /api/tenants/tenant-123/audit-logs?limit=10&action=permission_check
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log-001",
      "tenantId": "tenant-123",
      "userId": "user-789",
      "action": "permission_check",
      "resource": "arn:app:tenant-123:document:doc-001",
      "result": "success",
      "metadata": {
        "decision": "ALLOW",
        "policies": ["policy-001"]
      },
      "timestamp": "2025-09-17T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

## 8. Advanced Policy Patterns

### Time-Based Access
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["system:access"],
      "Resource": ["*"],
      "Condition": {
        "DateGreaterThan": { "aws:CurrentTime": "09:00:00Z" },
        "DateLessThan": { "aws:CurrentTime": "17:00:00Z" },
        "ForAllValues:StringEquals": { "aws:RequestedRegion": ["us-east-1"] }
      }
    }
  ]
}
```

### IP-Based Restrictions
```json
{
  "Version": "2025-09-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": ["*"],
      "Resource": ["*"],
      "Condition": {
        "NotIpAddress": { "aws:SourceIp": ["192.168.1.0/24", "10.0.0.0/8"] }
      }
    }
  ]
}
```

## 9. References & Resources
- [NestJS Docs](https://docs.nestjs.com)
- [Nx Monorepo](https://nx.dev)
- [TypeORM](https://typeorm.io)
- [Policy-based Authorization (IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)

---
This document provides end-to-end clarity on the architecture, current coverage, future roadmap, policy examples, and sample API interactions for the multi-tenant RBAC/IAM system.
