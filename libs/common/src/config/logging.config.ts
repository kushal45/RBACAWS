import { utilities as nestWinstonModuleUtilities, type WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export interface LoggingConfig {
  level: string;
  environment: string;
  serviceName: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableRotation: boolean;
  maxSize: string;
  maxFiles: string;
  datePattern: string;
  logDirectory: string;
  enableJson: boolean;
  enableCorrelation: boolean;
}

export class LoggingConfigService {
  private static readonly defaultConfig: LoggingConfig = {
    level: 'info',
    environment: 'development',
    serviceName: 'rbac-service',
    enableConsole: true,
    enableFile: true,
    enableRotation: true,
    maxSize: '20m',
    maxFiles: '14d',
    datePattern: 'YYYY-MM-DD',
    logDirectory: 'logs',
    enableJson: false,
    enableCorrelation: true,
  };

  public static getConfig(): LoggingConfig {
    return {
      level: process.env.LOG_LEVEL || this.defaultConfig.level,
      environment: process.env.NODE_ENV || this.defaultConfig.environment,
      serviceName: process.env.SERVICE_NAME || this.defaultConfig.serviceName,
      enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
      enableFile: process.env.LOG_ENABLE_FILE !== 'false',
      enableRotation: process.env.LOG_ENABLE_ROTATION !== 'false',
      maxSize: process.env.LOG_MAX_SIZE || this.defaultConfig.maxSize,
      maxFiles: process.env.LOG_MAX_FILES || this.defaultConfig.maxFiles,
      datePattern: process.env.LOG_DATE_PATTERN || this.defaultConfig.datePattern,
      logDirectory: process.env.LOG_DIRECTORY || this.defaultConfig.logDirectory,
      enableJson: process.env.LOG_ENABLE_JSON === 'true',
      enableCorrelation: process.env.LOG_ENABLE_CORRELATION !== 'false',
    };
  }

  public static createWinstonOptions(serviceName: string): WinstonModuleOptions {
    const config = this.getConfig();
    const transports: winston.transport[] = [];

    // Console transport with conditional formatting
    if (config.enableConsole) {
      const consoleFormat = config.enableJson
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            nestWinstonModuleUtilities.format.nestLike(serviceName, {
              colors: true,
              prettyPrint: true,
            }),
          );

      transports.push(
        new winston.transports.Console({
          level: config.level,
          format: consoleFormat,
        }),
      );
    }

    // File transports with rotation
    if (config.enableFile) {
      const fileFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      );

      if (config.enableRotation) {
        // Error logs
        transports.push(
          new DailyRotateFile({
            level: 'error',
            filename: `${config.logDirectory}/${serviceName}-error-%DATE%.log`,
            datePattern: config.datePattern,
            maxSize: config.maxSize,
            maxFiles: config.maxFiles,
            format: fileFormat,
            auditFile: `${config.logDirectory}/${serviceName}-error-audit.json`,
          }),
        );

        // Combined logs
        transports.push(
          new DailyRotateFile({
            level: config.level,
            filename: `${config.logDirectory}/${serviceName}-combined-%DATE%.log`,
            datePattern: config.datePattern,
            maxSize: config.maxSize,
            maxFiles: config.maxFiles,
            format: fileFormat,
            auditFile: `${config.logDirectory}/${serviceName}-combined-audit.json`,
          }),
        );

        // Application logs (info and above, excluding debug)
        transports.push(
          new DailyRotateFile({
            level: 'info',
            filename: `${config.logDirectory}/${serviceName}-app-%DATE%.log`,
            datePattern: config.datePattern,
            maxSize: config.maxSize,
            maxFiles: config.maxFiles,
            format: fileFormat,
            auditFile: `${config.logDirectory}/${serviceName}-app-audit.json`,
          }),
        );
      } else {
        // Static file logging
        transports.push(
          new winston.transports.File({
            level: 'error',
            filename: `${config.logDirectory}/${serviceName}-error.log`,
            format: fileFormat,
          }),
        );

        transports.push(
          new winston.transports.File({
            level: config.level,
            filename: `${config.logDirectory}/${serviceName}-combined.log`,
            format: fileFormat,
          }),
        );
      }
    }

    return {
      level: config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.errors({ stack: true }),
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp', 'ms'],
        }),
      ),
      transports,
      exitOnError: false,
      silent: process.env.NODE_ENV === 'test',
    };
  }

  public static getLogLevels(): string[] {
    return ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  }

  public static isValidLogLevel(level: string): boolean {
    return this.getLogLevels().includes(level.toLowerCase());
  }
}
