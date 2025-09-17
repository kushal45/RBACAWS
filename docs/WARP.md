# WARP Project Specification: Multi-Tenant RBAC/IAM Prototype

## Meta

name: multi-tenant-rbac
description: IAM-like, stateless, multi-tenant RBAC system using NestJS monorepo with strict isolation, API gateway, policy-driven core, and scalable microservices.
language: typescript
framework: nestjs, nx
repo: https://github.com/YOUR_GITHUB/multi-tenant-rbac

---

## Files

### README.md
```markdown
# Multi-Tenant RBAC/IAM Prototype

This project is a prototype of a multi-tenant Role-Based Access Control (RBAC) and Identity and Access Management (IAM) system, built with a NestJS monorepo. It features strict multi-tenant isolation, a policy-driven core, and a scalable microservices architecture.

###  Service Responsibilities

- **api-gateway**: Entry point, routes, authentication, logging, API docs, rate limits.
- **rbac-core**: Tenants, users, roles, policies, resources, permission checks, policy evaluation engine.
- **auth-service**: JWT/OAuth2 auth, integrate with SSO/IdP in future.
- **audit-log-service**: Logs policy updates, permission checks, admin actions.
- **db**: TypeORM or Prisma configuration, migrations, seeders.

---
## Environment Setup

- Copy `.env.example` to `.env`
- Add `DATABASE_URL`, `JWT_SECRET`, and other critical configs
- Set different ports per app (e.g. 3000, 3100, 3200, 3300)

---

## Database & Seed

- Set up Postgres via Docker Compose
- Run migration scripts and seed test tenants, users, roles

---

## Add Example Endpoints

- `POST /api/tenants` - Create new tenant
- `POST /api/tenants/:tenant_id/users` - Add/invite user
- `POST /api/tenants/:tenant_id/roles` - Create role
- `POST /api/tenants/:tenant_id/resources` - Register resource
- `POST /api/authorize` - Permission check
- `GET /api/tenants/:tenant_id/audit-logs` - Audit fetch
- `GET /api/tenants/:tenant_id/policy-simulate` - Policy simulation

## Example Policy Schema

```json
{
"Version": "2025-09-12",
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
----


## Dev Experience Best Practices

- API documented with Swagger/OpenAPI (`@nestjs/swagger`)
- Prettier, ESlint, pre-commit hooks for uniformity
- CI/CD: GitHub Actions for lint, test, build, containerize
- Trunk-based branching (main/develop), PR template
- Docker Compose for DB & local stack
- Seed/test scripts for initial data

---

## Next Steps

- Implement core DTOs, entities, and tenant-aware repository wrappers
- Build auth flow and skeleton APIs for all domains
- Add row-level tenancy hooks at ORM and API guard level
- Enable OpenAPI for all services
- Populate `/docs` with architecture and API details

---

## Learning Resources

- [NestJS Docs](https://docs.nestjs.com)
- [Nx Monorepo](https://nx.dev)
- [TypeORM](https://typeorm.io)
- [Prisma](https://www.prisma.io/)
- [Policy-based Authorization (IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)

---

## Architecture Overview

- Strict Multi-Tenant Isolation (tenant_id everywhere)
- Policy-driven authorization (IAM-style, attestable)
- API-first: All functions via REST (future gRPC)
- Core modules: API gateway, RBAC-service, Auth, Audit, Resource-mgmt
- Modular monorepo for easy extension (Nx/NestJS libraries)
- DB: Postgres (with row-level isolation)
- Audit logs & observability baked in

---
Key Principles:
Strict Multi-Tenant Isolation
Policy-Driven Authorization (IAM-like)
API-First (Stateless) Service Design
Separation of Control Plane and Data Plane
Pluggable Authentication
text

+-------------------------+         +---------------------------+
|      Admin/Developer    |         |       Tenant Users        |
+-------------------------+         +---------------------------+
           |
           |
    +-----------------------------------------------+ 
    | REST/gRPC API Gateway (Auth, Routing, Logging)|
    +-----------------------------------------------+ 
           |
+------------------------------------------+
|      RBAC Service Layer (Core Logic)     |
+------------------------------------------+
|   |               |              |       |
|User|   Tenants    |  Roles/Policy|Resource|
|Mgmt|   Mgmt       |  Engine      |Mgmt    |
+--- +--------------+--------------+--------+
|                                        |
|                 Database(s)            |
+----------------------------------------+
           |
     +-----------------------------+
     |   Audit Logging/Monitoring  |
     +-----------------------------+


2. Major Components and Design
A. API Gateway Layer
Responsibilities:
Entry point for all REST/gRPC API calls (users, admins, integrations)
Handles authentication (JWT/OAuth2), input validation, routing, and logging
Optionally rate limiting, version control
Observability:
API request logs
Basic usage metrics

B. Authentication & Identity Provider (IdP)
Pluggable auth support (start with JWT/OAuth2; future: enterprise SSO/SAML)
Maps external identity to user objects in the RBAC system, normalizes identities

C. Core RBAC Service
1. Tenant Management Subsystem
Models: Tenant, Tenant Settings/Config
Ops: Create, suspend, delete, update tenants
Isolation: Scoping data, policies, roles, and resources by tenant_id
2. User Management Subsystem
Models: User, UserTenantLink (for multi-tenant users)
Ops: Create, invite, update, suspend users
Features:
Users can belong to multiple tenants, each with independent roles
Lifecycle management
3. Role & Policy Engine
Models: Role, Policy, PolicyBinding
Ops:
Define system- and tenant-level roles
Attach&detach policies (JSON policy doc, versioned) to users/roles/groups
Policy simulation endpoint ("dry run")
IAM-Inspired Features:
Statement-based policy ("Allow"/"Deny", resources, actions, conditions)
Policy evaluation algorithm (Deny > Allow > Default Deny)
Policy version history and rollback
4. Resource Management
Models: Resource, ResourceType, ResourceHierarchy/tree
Ops: Register resources, organize resource tree, resource metadata
Isolation: Resource ownership is strictly tenant-scoped unless explicitly cross-tenant
5. Authorization/Decision Engine
Stateless, horizontally scalable service for real-time permission checks
API: isAuthorized(user, action, resource)
Gathers all policies (user, role, group, resource), evaluates against request context
Supports delegated impersonation, service accounts

D. Audit Logging & Monitoring
Responsibilities:
Log all permission checks, admin actions, policy changes, and failed attempts
Immutable logs (e.g., write-once DB or streaming to S3/Blob for compliance)
Check integration with SIEM/SOC
Monitoring/metrics:
Service health
Latency and error rates on key APIs

E. Storage Layer
Primary:
RDBMS (Postgres, MySQL) for strong consistency of config, tenants, users, roles, policies
Schemas: tenant, user, role, policy, resource, binding, audit_log
Consider schema-per-tenant or shared schema with tenant_id partitioning
Secondary:
Cache (Redis/Memcached) for low-latency policy/user/resource checks
Blob/Archive (S3/GCS) for audit log exports

F. Deployment and Scalability
Microservices architecture—scale “decision engine” and “API gateway” horizontally
Containerized workload (Docker/K8s/ECS)
Automated CI/CD, blue/green deployments
Feature flag-driven config for rapid iteration

3. API Example Paths
Endpoint
Description
POST /api/tenants
Onboard new tenant
POST /api/tenants/:tid/users
Invite user
POST /api/tenants/:tid/roles
Create role
POST /api/tenants/:tid/resources
Register resource
POST /api/authorize
Permission check
GET /api/tenants/:tid/audit-logs
Audit log fetch
GET /api/tenants/:tid/policy-simulate
Policy test/simulate outcome


4. Policy Document Format (IAM-Like Example)
json
{
  "Version": "2025-09-12",
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

Multiple statements, condition support, DENY takes precedence.

5. Data Partitioning & Tenant Isolation Patterns
Recommended MVP:
Shared schema, strong tenant_id partitioning
Row-level security by tenant_id (enforced at query/ORM and API layers)
Alternatives (as you scale):
Schema per tenant if isolation or performance needs grow
DB per tenant for high-end enterprise/customers

6. Security and Compliance
All APIs authenticated and authorized—no direct DB access
Rate limiting, IP allow-list (admin endpoints)
Audit log retention, export, and real-time alerting on suspicious activity

7. Integration/Extensibility Hooks
Pluggable authentication adapters (OAuth2, SAML, custom JWT, service tokens)
Webhook/event system for important actions (user invited, role changed, etc.)
Internal API extension for federated/complex SaaS integrations
```