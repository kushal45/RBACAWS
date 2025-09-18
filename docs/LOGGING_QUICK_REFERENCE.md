# Enterprise Logging Quick Reference

## Quick Setup

1. **Import in your service module:**

```typescript
import { LoggingModule, LoggingInterceptor } from '@lib/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [LoggingModule.forRoot('your-service-name')],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class YourServiceModule {}
```

2. **Use in your service:**

```typescript
import { EnterpriseLoggerService } from '@lib/common';

@Injectable()
export class YourService {
  constructor(private readonly logger: EnterpriseLoggerService) {
    this.logger.setContext('YourService');
  }
}
```

## Common Patterns

### Basic Logging

```typescript
// Information
this.logger.info('Operation completed', { userId, action: 'create' });

// Warnings
this.logger.warn('Rate limit approaching', { userId, attempts: 8 });

// Errors with context
this.logger.error('Database error', error.stack, {
  userId,
  operation: 'createUser',
  error
});
```

### Performance Tracking

```typescript
const timer = this.logger.startTimer('database-query');
const result = await this.userRepository.find();
this.logger.endTimer(timer, { resultCount: result.length });
```

### Business Events

```typescript
this.logger.business('user-registration', {
  userId: newUser.id,
  tenantId: newUser.tenantId,
  registrationMethod: 'email'
});
```

### Security Events

```typescript
this.logger.security('authentication-failure', {
  userId: 'unknown',
  ip: request.ip,
  reason: 'invalid-credentials',
  attempts: 3
});
```

### Audit Logging

```typescript
this.logger.audit('data-access', {
  userId: request.user.id,
  resource: 'user-profile',
  action: 'read',
  resourceId: profileId
});
```

## Environment Variables

```bash
# Essential
LOG_LEVEL=info
SERVICE_NAME=your-service
NODE_ENV=development

# File logging
LOG_ENABLE_FILE=true
LOG_DIRECTORY=logs
LOG_MAX_FILES=14d

# Console output
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_JSON=false

# Features
LOG_ENABLE_CORRELATION=true
LOG_ENABLE_ROTATION=true
```

## Log Levels Guide

- **error**: Exceptions, system failures, critical issues
- **warn**: Potential problems, deprecation warnings
- **info**: Important business events, system state changes
- **debug**: Detailed application flow, variable values
- **verbose**: Very detailed tracing (use sparingly)

## Don't Do This ❌

```typescript
// Plain console logging
console.log('Something happened');

// Unstructured messages
logger.info(`User ${userId} performed ${action} at ${new Date()}`);

// Logging sensitive data
logger.info('User login', { password: 'secret123' });

// Missing context
logger.error('Something failed');
```

## Do This Instead ✅

```typescript
// Structured logging with context
this.logger.info('User action completed', {
  userId,
  action: 'profile-update',
  fields: ['email', 'name']
});

// Proper error logging
this.logger.error('Profile update failed', error.stack, {
  userId,
  operation: 'updateProfile',
  error
});

// Business event tracking
this.logger.business('profile-updated', {
  userId,
  changes: ['email'],
  previousEmail: '[REDACTED]'
});
```

## Correlation ID Usage

Correlation IDs are automatically handled for HTTP requests. For manual usage:

```typescript
// Create correlated logger
const correlatedLogger = this.logger.withCorrelation('my-correlation-id');
correlatedLogger.info('Correlated message');

// Get current correlation ID
const currentId = this.logger.getCorrelationId();
```

## Testing

Mock the logger in tests:

```typescript
const mockLogger = {
  setContext: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  startTimer: jest.fn(),
  endTimer: jest.fn()
} as any;

const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: EnterpriseLoggerService, useValue: mockLogger }
  ]
}).compile();
```

## File Structure

Your logs will be organized as:

```
logs/
├── your-service-error-2025-09-18.log     # Error logs only
├── your-service-app-2025-09-18.log       # Info+ logs
└── your-service-combined-2025-09-18.log  # All levels
```

## Performance Tips

1. Use appropriate log levels for production
2. Structure data instead of string interpolation
3. Use timers for performance-critical operations
4. Avoid logging in tight loops
5. Use child loggers for request-scoped logging

For complete documentation, see [ENTERPRISE_LOGGING.md](./ENTERPRISE_LOGGING.md)
