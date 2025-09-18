import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { EnterpriseLoggerService } from '../services/enterprise-logger.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: EnterpriseLoggerService) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Generate correlation ID if not present
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    // Set correlation ID in logger context
    this.logger.setCorrelationId(correlationId);

    const logContext = {
      correlationId,
      method: request.method,
      url: request.url,
      path: request.path,
      query: request.query,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection.remoteAddress,
      userId: request.user?.id,
      tenantId: request.headers['x-tenant-id'] as string,
      requestId: uuidv4(),
    };

    // Log incoming request
    this.logger.http(
      request.method,
      request.url,
      0, // Status code not available yet
      0, // Duration not available yet
      {
        ...logContext,
        type: 'request',
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
      },
    );

    return next.handle().pipe(
      tap({
        next: data => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          // Log successful response
          this.logger.http(request.method, request.url, statusCode, duration, {
            ...logContext,
            type: 'response',
            responseSize: JSON.stringify(data || {}).length,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;

          // Log error response
          this.logger.error(
            `HTTP ${request.method} ${request.url} ${statusCode} ${duration}ms - ${error.message}`,
            error.stack || 'No stack trace available',
            {
              ...logContext,
              type: 'error',
              error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            },
          );
        },
      }),
    );
  }

  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];
    const sanitized = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;

    const sanitizeObject = (object: Record<string, unknown>): void => {
      for (const key in object) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          object[key] = '[REDACTED]';
        } else if (typeof object[key] === 'object' && object[key] !== null) {
          sanitizeObject(object[key] as Record<string, unknown>);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
