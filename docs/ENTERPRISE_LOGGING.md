# Enterprise Logging Architecture

This document describes the comprehensive enterprise-level logging implementation for the RBAC AWS monorepo project.

## Overview

The logging system is built with the following principles:

- **Centralized Configuration**: All logging configuration is managed centrally in `libs/common/src/config/logging.config.ts`
- **Structured Logging**: All log entries follow a consistent JSON structure with metadata
- **Correlation IDs**: Request tracing across services using correlation IDs
- **Enterprise Features**: Log rotation, multiple transports, performance monitoring
- **Security**: Automatic PII/sensitive data redaction
- **Scalability**: Supports multiple log levels and environment-specific configuration

## Architecture Components

### 1. Logging Configuration (`LoggingConfigService`)

Located in `libs/common/src/config/logging.config.ts`

**Features:**

- Environment-based configuration
- Multiple transport support (console, file, rotating files)
- JSON and pretty-print formatting options
- Configurable log levels and retention policies

**Environment Variables:**

```bash
# Basic Configuration
LOG_LEVEL=info                    # error, warn, info, debug, verbose
SERVICE_NAME=api-gateway          # Service identifier
NODE_ENV=development             # Environment context

# Console Logging
LOG_ENABLE_CONSOLE=true          # Enable/disable console output

# File Logging
LOG_ENABLE_FILE=true             # Enable/disable file logging
LOG_ENABLE_ROTATION=true         # Enable daily log rotation
LOG_DIRECTORY=logs               # Log file directory
LOG_MAX_SIZE=20m                 # Maximum log file size
LOG_MAX_FILES=14d                # Log retention period
LOG_DATE_PATTERN=YYYY-MM-DD      # Date pattern for file names

# Output Format
LOG_ENABLE_JSON=false            # JSON format vs pretty print
LOG_ENABLE_CORRELATION=true      # Enable correlation ID tracking
```

### 2. Enterprise Logger Service (`EnterpriseLoggerService`)

Located in `libs/common/src/services/enterprise-logger.service.ts`

**Features:**

- Structured logging with metadata
- Correlation ID management
- Performance timing utilities
- Business event logging
- Security event logging
- Audit trail logging
- Child logger creation

**Usage Example:**

```typescript
import { EnterpriseLoggerService } from '@lib/common';

@Injectable()
export class MyService {
  constructor(private readonly logger: EnterpriseLoggerService) {
    this.logger.setContext('MyService');
  }

  async performOperation(userId: string) {
    const timer = this.logger.startTimer('user-operation');

    try {
      this.logger.info('Starting user operation', {
        userId,
        operation: 'performOperation'
      });

      // Business operation...

      this.logger.business('user-action-completed', {
        userId,
        action: 'operation-success'
      });

      this.logger.endTimer(timer, { userId });
    } catch (error) {
      this.logger.error('Operation failed', error.stack, {
        userId,
        operation: 'performOperation',
        error
      });
      throw error;
    }
  }
}
```

### 3. Logging Module (`LoggingModule`)

Located in `libs/common/src/modules/logging.module.ts`

**Integration:**

```typescript
import { LoggingModule } from '@lib/common';

@Module({
  imports: [
    LoggingModule.forRoot('service-name')
    // other imports...
  ]
  // ...
})
export class AppModule {}
```

### 4. HTTP Request Logging Interceptor (`LoggingInterceptor`)

Located in `libs/common/src/interceptors/logging.interceptor.ts`

**Features:**

- Automatic request/response logging
- Correlation ID generation and propagation
- Request metadata capture (IP, User-Agent, etc.)
- Response time measurement
- Automatic PII redaction
- Error request logging

**Integration:**

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from '@lib/common';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class AppModule {}
```

## Log Structure

All log entries follow this structure:

```json
{
  "timestamp": "2025-09-18T11:30:00.123Z",
  "level": "info",
  "message": "User authentication successful",
  "service": "auth-service",
  "correlationId": "req-12345-67890",
  "context": {
    "userId": "user-123",
    "tenantId": "tenant-456",
    "operation": "login",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "duration": 245
  },
  "environment": "development",
  "version": "1.0.0"
}
```

## Log Types

### 1. Application Logs

- **info**: General information
- **warn**: Warning conditions
- **error**: Error conditions
- **debug**: Debug information

### 2. HTTP Logs

- Request/response logging
- Performance metrics
- Status code tracking

### 3. Business Logs

- User actions
- Business process completion
- State changes

### 4. Security Logs

- Authentication events
- Authorization failures
- Suspicious activities

### 5. Audit Logs

- Data access
- Configuration changes
- Administrative actions

### 6. Performance Logs

- Operation timing
- Memory usage
- System metrics

## Correlation ID Flow

Correlation IDs enable request tracing across services:

1. **Generation**: Automatically generated for each HTTP request
2. **Propagation**: Passed via `x-correlation-id` header
3. **Context**: Available throughout the request lifecycle
4. **Logging**: Included in all log entries for the request

```typescript
// Manual correlation ID usage
const correlatedLogger = logger.withCorrelation('custom-correlation-id');
correlatedLogger.info('Correlated log message');
```

## Security Features

### Automatic PII Redaction

Sensitive fields are automatically redacted:

- `password`, `token`, `secret`, `key`
- `apiKey`, `accessToken`, `refreshToken`
- Authorization headers
- Cookie values

### Secure Log Storage

- File permissions restricted to service user
- Log rotation prevents disk space issues
- Configurable retention policies

## Performance Monitoring

### Built-in Timing

```typescript
const timer = logger.startTimer('database-query');
await performDatabaseQuery();
logger.endTimer(timer, { queryType: 'user-lookup' });
```

### Memory Tracking

```typescript
logger.performance({
  operation: 'large-data-processing',
  startTime: Date.now(),
  endTime: Date.now(),
  memoryUsage: process.memoryUsage()
});
```

## Service Integration

Each service integrates logging through its module:

### Auth Service

```typescript
@Module({
  imports: [
    LoggingModule.forRoot('auth-service')
    // ...
  ]
})
export class AuthServiceModule {}
```

### API Gateway

```typescript
@Module({
  imports: [
    LoggingModule.forRoot('api-gateway')
    // ...
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class ApiGatewayModule {}
```

## Log File Organization

```
logs/
├── api-gateway-error-2025-09-18.log      # Error logs only
├── api-gateway-app-2025-09-18.log        # Info+ logs
├── api-gateway-combined-2025-09-18.log   # All levels
├── auth-service-error-2025-09-18.log
├── auth-service-app-2025-09-18.log
├── auth-service-combined-2025-09-18.log
└── audit-files/
    ├── api-gateway-error-audit.json      # Rotation metadata
    └── api-gateway-combined-audit.json
```

## Best Practices

### 1. Logging Levels

- **error**: System errors, exceptions, failures
- **warn**: Potential issues, deprecated usage, recoverable errors
- **info**: Important business events, startup/shutdown, major operations
- **debug**: Detailed flow information, variable values, internal state
- **verbose**: Very detailed tracing information

### 2. Message Formatting

```typescript
// ✅ Good: Structured with context
logger.info('User login successful', {
  userId: 'user-123',
  loginMethod: 'email',
  ipAddress: request.ip
});

// ❌ Bad: Unstructured message
logger.info(`User user-123 logged in from ${request.ip} using email`);
```

### 3. Error Logging

```typescript
// ✅ Good: Include stack trace and context
logger.error('Database connection failed', error.stack, {
  operation: 'user-lookup',
  userId,
  database: 'user-db',
  error
});

// ❌ Bad: Minimal error information
logger.error('Error occurred');
```

### 4. Performance Logging

```typescript
// ✅ Good: Use built-in timing
const timer = logger.startTimer('api-call');
const result = await externalApi.call();
logger.endTimer(timer, { endpoint: 'users', resultCount: result.length });

// ❌ Bad: Manual timing without context
const start = Date.now();
await externalApi.call();
logger.info(`API call took ${Date.now() - start}ms`);
```

## Configuration Examples

### Development Environment

```bash
LOG_LEVEL=debug
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_JSON=false
LOG_ENABLE_CORRELATION=true
```

### Production Environment

```bash
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=false
LOG_ENABLE_FILE=true
LOG_ENABLE_JSON=true
LOG_ENABLE_ROTATION=true
LOG_MAX_FILES=30d
LOG_DIRECTORY=/var/log/rbac
```

### Testing Environment

```bash
LOG_LEVEL=warn
LOG_ENABLE_CONSOLE=false
LOG_ENABLE_FILE=false
NODE_ENV=test
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check `LOG_LEVEL` and service configuration
2. **File permission errors**: Ensure log directory is writable
3. **Missing correlation IDs**: Verify interceptor is properly configured
4. **Performance impact**: Reduce log level in production environments

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
LOG_LEVEL=debug
LOG_ENABLE_CONSOLE=true
```

## Migration Guide

### From Console Logging

Replace:

```typescript
console.log('User created:', userId);
console.error('Error:', error);
```

With:

```typescript
logger.info('User created', { userId, operation: 'createUser' });
logger.error('User creation failed', error.stack, { userId, error });
```

### From Basic NestJS Logger

Replace:

```typescript
private readonly logger = new Logger(MyService.name);
this.logger.log('Operation completed');
```

With:

```typescript
constructor(private readonly logger: EnterpriseLoggerService) {
  this.logger.setContext('MyService');
}
this.logger.info('Operation completed', { operation: 'myOperation' });
```

## Monitoring and Alerting

The structured logging format enables integration with:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **DataDog**
- **New Relic**
- **CloudWatch** (for AWS deployments)

Example queries for monitoring:

```json
# Error rate by service
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "error" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_service": {
      "terms": { "field": "service" }
    }
  }
}
```

This enterprise logging implementation provides comprehensive observability, security, and operational insights for the RBAC AWS system while maintaining high performance and developer experience.
