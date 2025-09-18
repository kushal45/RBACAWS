import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: { tenantId?: string };
        tenantId?: string;
        query?: { tenantId?: string };
        params?: { tenantId?: string };
      }
    >();

    // Extract tenant ID from JWT token
    const userTenantId = request.user?.tenantId;

    // Extract tenant ID from request (params, headers, or query)
    let requestTenantId: string | undefined;

    if (request.params?.tenantId) {
      requestTenantId = request.params.tenantId;
    } else if (request.headers['x-tenant-id']) {
      requestTenantId = request.headers['x-tenant-id'] as string;
    } else if (request.query?.tenantId) {
      requestTenantId = request.query.tenantId;
    }

    // If no tenant ID in request, check if user has tenant context
    if (!requestTenantId) {
      if (!userTenantId) {
        throw new BadRequestException(
          'Tenant ID is required in request params, headers, or query parameters',
        );
      }
      // Add tenant ID to request for downstream services
      request.tenantId = userTenantId;
      return true;
    }

    // If both are present, they must match
    if (userTenantId && userTenantId !== requestTenantId) {
      throw new ForbiddenException('Access denied: User does not belong to the requested tenant');
    }

    // Store tenant ID in request context for easy access
    request.tenantId = requestTenantId;

    return true;
  }
}
