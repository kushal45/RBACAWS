import { createParamDecorator } from '@nestjs/common';

import type { ExecutionContext } from '@nestjs/common';

interface TenantRequest {
  user?: {
    tenantId?: string;
  };
  params?: {
    tenantId?: string;
  };
  headers: {
    'x-tenant-id'?: string;
    [key: string]: string | undefined;
  };
  query?: {
    tenantId?: string;
  };
}

/**
 * Decorator to extract tenant ID from request context
 */
export const TenantId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<TenantRequest>();

  // First check for tenant ID in JWT payload
  if (request.user?.tenantId) {
    return request.user.tenantId;
  }

  // Check for tenant ID in route params
  if (request.params?.tenantId) {
    return request.params.tenantId;
  }

  // Check for tenant ID in headers
  if (request.headers['x-tenant-id']) {
    return request.headers['x-tenant-id'];
  }

  // Check for tenant ID in query params
  if (request.query?.tenantId) {
    return request.query.tenantId;
  }

  throw new Error('Tenant ID not found in request context');
});

/**
 * Decorator to extract user ID from request context
 */
export const UserId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<
    TenantRequest & {
      user?: { sub?: string; id?: string; tenantId?: string };
    }
  >();

  if (request.user?.sub || request.user?.id) {
    return request.user.sub ?? request.user.id ?? '';
  }

  throw new Error('User ID not found in request context');
});

/**
 * Decorator to extract full user context from request
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<
    TenantRequest & {
      user?: { sub?: string; id?: string; tenantId?: string };
    }
  >();
  return request.user;
});
