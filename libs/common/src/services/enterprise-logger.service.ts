import { Injectable, LoggerService, Inject } from '@nestjs/common';
import * as cls from 'cls-hooked';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  sessionId?: string;
  operationName?: string;
  service?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  operation: string;
}

@Injectable()
export class EnterpriseLoggerService implements LoggerService {
  private context?: string;
  private correlationNamespace = cls.createNamespace('correlation');

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  setContext(context: string): void {
    this.context = context;
  }

  getContext(): string | undefined {
    return this.context;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationNamespace.run(() => {
      this.correlationNamespace.set('correlationId', correlationId);
    });
  }

  getCorrelationId(): string | undefined {
    return this.correlationNamespace.get('correlationId') as string | undefined;
  }

  private formatMessage(message: string, context?: LogContext): string {
    const correlationId = context?.correlationId || this.getCorrelationId();
    const logContext = this.context || context?.service;

    let formattedMessage = message;

    if (correlationId) {
      formattedMessage = `[${correlationId}] ${formattedMessage}`;
    }

    if (logContext) {
      formattedMessage = `[${logContext}] ${formattedMessage}`;
    }

    return formattedMessage;
  }

  private createLogObject(
    level: string,
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Record<string, unknown> {
    const correlationId = context?.correlationId || this.getCorrelationId();
    const timestamp = new Date().toISOString();

    return {
      timestamp,
      level,
      message: this.formatMessage(message, context),
      service: context?.service || this.context,
      correlationId,
      context: {
        ...context,
        ...meta,
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };
  }

  log(message: string, context?: LogContext): void {
    this.logger.info(this.createLogObject('info', message, context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.createLogObject('info', message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    const errorObj = this.createLogObject('error', message, context, {
      trace,
      stack: trace,
    });
    this.logger.error(errorObj);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.createLogObject('warn', message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.createLogObject('debug', message, context));
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(this.createLogObject('verbose', message, context));
  }

  // Enterprise-specific logging methods

  audit(
    action: string,
    context: LogContext & { resourceType?: string; resourceId?: string },
  ): void {
    this.logger.info(
      this.createLogObject('audit', `Audit: ${action}`, {
        ...context,
        type: 'audit',
        action,
      }),
    );
  }

  security(
    event: string,
    context: LogContext & { severity?: 'low' | 'medium' | 'high' | 'critical' },
  ): void {
    this.logger.warn(
      this.createLogObject('security', `Security Event: ${event}`, {
        ...context,
        type: 'security',
        event,
        severity: context.severity || 'medium',
      }),
    );
  }

  performance(metrics: PerformanceMetrics, context?: LogContext): void {
    const duration = metrics.endTime ? metrics.endTime - metrics.startTime : undefined;
    this.logger.info(
      this.createLogObject('performance', `Performance: ${metrics.operation}`, context, {
        type: 'performance',
        operation: metrics.operation,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        duration,
        memoryUsage: metrics.memoryUsage,
      }),
    );
  }

  business(event: string, data: Record<string, unknown>, context?: LogContext): void {
    this.logger.info(
      this.createLogObject('business', `Business Event: ${event}`, context, {
        type: 'business',
        event,
        data,
      }),
    );
  }

  http(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const logData = this.createLogObject(
      statusCode >= 400 ? 'error' : 'info',
      `HTTP ${method} ${url} ${statusCode} ${duration}ms`,
      context,
      {
        type: 'http',
        method,
        url,
        statusCode,
        duration,
      },
    );

    if (statusCode >= 400) {
      this.logger.error(logData);
    } else if (statusCode >= 300) {
      this.logger.warn(logData);
    } else {
      this.logger.info(logData);
    }
  }

  // Performance measurement utilities
  startTimer(operation: string): PerformanceMetrics {
    return {
      startTime: Date.now(),
      operation,
      memoryUsage: process.memoryUsage(),
    };
  }

  endTimer(metrics: PerformanceMetrics, context?: LogContext): PerformanceMetrics {
    const endTime = Date.now();
    const finalMetrics = {
      ...metrics,
      endTime,
      duration: endTime - metrics.startTime,
    };

    this.performance(finalMetrics, context);
    return finalMetrics;
  }

  // Method to log structured data
  logStructured(
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose',
    message: string,
    data: Record<string, unknown>,
    context?: LogContext,
  ): void {
    const logMethod = this.logger[level];
    logMethod(this.createLogObject(level, message, context, data));
  }

  // Method to create child logger with additional context
  child(_additionalContext: Partial<LogContext>): EnterpriseLoggerService {
    const childLogger = new EnterpriseLoggerService(this.logger);
    const currentContext = this.context;

    if (currentContext) {
      childLogger.setContext(currentContext);
    }

    return childLogger;
  } // Method to create logger with specific correlation ID
  withCorrelation(correlationId: string): EnterpriseLoggerService {
    const correlatedLogger = this.child({ correlationId });
    correlatedLogger.setCorrelationId(correlationId);
    return correlatedLogger;
  }
}
