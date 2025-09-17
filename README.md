# Multi-Tenant RBAC/IAM Prototype

This project is a prototype of a multi-tenant Role-Based Access Control (RBAC) and Identity and Access Management (IAM) system, built with a NestJS monorepo. It features strict multi-tenant isolation, a policy-driven core, and a scalable microservices architecture.

## Architecture Overview

- **Strict Multi-Tenant Isolation** (tenant_id everywhere)
- **Policy-driven authorization** (IAM-style, attestable)
- **API-first**: All functions via REST (future gRPC)
- **Core modules**: API gateway, RBAC-service, Auth, Audit, Resource-mgmt
- **Modular monorepo** for easy extension (Nx/NestJS libraries)
- **DB**: Postgres (with row-level isolation)
- **Audit logs & observability** baked in

## Service Responsibilities

- **api-gateway**: Entry point, routes, authentication, logging, API docs, rate limits.
- **rbac-core**: Tenants, users, roles, policies, resources, permission checks, policy evaluation engine.
- **auth-service**: JWT/OAuth2 auth, integrate with SSO/IdP in future.
- **audit-log-service**: Logs policy updates, permission checks, admin actions.

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add `DATABASE_URL`, `JWT_SECRET`, and other critical configs
3. Set different ports per app (e.g. 3000, 3100, 3200, 3300)
4. Install dependencies:

```bash
$ npm install
```

## Database & Development Environment

```bash
# Start Postgres via Docker Compose
$ docker-compose up -d

# Run database migrations
$ npm run migration:run

# Seed test tenants, users, roles
$ npm run seed:run
```

## Running the Services

```bash
# Start all services in development mode
$ npm run start:dev

# Start specific service
$ npm run start:dev api-gateway
$ npm run start:dev rbac-core
$ npm run start:dev auth-service
$ npm run start:dev audit-log-service

# Production mode
$ npm run start:prod
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

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

## Dev Experience Best Practices

- API documented with Swagger/OpenAPI (`@nestjs/swagger`)
- Prettier, ESlint, pre-commit hooks for uniformity
- CI/CD: GitHub Actions for lint, test, build, containerize
- Trunk-based branching (main/develop), PR template
- Docker Compose for DB & local stack
- Seed/test scripts for initial data

## Next Steps

- Implement core DTOs, entities, and tenant-aware repository wrappers
- Build auth flow and skeleton APIs for all domains
- Add row-level tenancy hooks at ORM and API guard level
- Enable OpenAPI for all services
- Populate `/docs` with architecture and API details

## Learning Resources

- [NestJS Docs](https://docs.nestjs.com)
- [TypeORM](https://typeorm.io)
- [Policy-based Authorization (IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Multi-tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)

## Key Principles

- **Strict Multi-Tenant Isolation**
- **Policy-Driven Authorization** (IAM-like)
- **API-First** (Stateless) Service Design
- **Separation of Control Plane and Data Plane**
- **Pluggable Authentication**

## License

This project is licensed under the MIT License.
