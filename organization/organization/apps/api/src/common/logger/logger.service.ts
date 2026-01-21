import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

interface LogContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
  trace?: string;
  requestId?: string;
  userId?: string;
  correlationId?: string;
}

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements NestLoggerService {
  private context?: string;
  private logLevels: LogLevel[];
  private isProduction: boolean;
  private useJsonFormat: boolean;
  private requestContext: LogContext = {};

  // ANSI color codes for console output
  private readonly colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[35m', // Magenta
    verbose: '\x1b[37m', // White
    reset: '\x1b[0m',
  };

  constructor(private configService?: ConfigService) {
    this.isProduction = this.configService?.get<string>('NODE_ENV') === 'production';
    this.useJsonFormat = this.configService?.get<boolean>('LOG_JSON_FORMAT') ?? this.isProduction;

    // Set log levels based on environment
    const logLevel = this.configService?.get<string>('LOG_LEVEL') || (this.isProduction ? 'info' : 'debug');
    this.logLevels = this.getLogLevelsForLevel(logLevel);
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Set request-level context (requestId, userId, etc.)
   */
  setRequestContext(context: LogContext): void {
    this.requestContext = { ...this.requestContext, ...context };
  }

  /**
   * Clear request context
   */
  clearRequestContext(): void {
    this.requestContext = {};
  }

  /**
   * Get current request context
   */
  getRequestContext(): LogContext {
    return { ...this.requestContext };
  }

  /**
   * Log a message at INFO level
   */
  log(message: string, context?: string): void;
  log(message: string, data?: any, context?: string): void;
  log(message: string, dataOrContext?: any, context?: string): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.INFO, message, data, ctx);
  }

  /**
   * Log a message at ERROR level
   */
  error(message: string, trace?: string, context?: string): void;
  error(message: string, error?: Error | any, context?: string): void;
  error(message: string, traceOrError?: string | Error | any, context?: string): void {
    let trace: string | undefined;
    let data: any;

    if (traceOrError instanceof Error) {
      trace = traceOrError.stack;
      data = {
        name: traceOrError.name,
        message: traceOrError.message,
        stack: traceOrError.stack,
      };
    } else if (typeof traceOrError === 'string') {
      trace = traceOrError;
    } else if (traceOrError) {
      data = traceOrError;
    }

    this.writeLog(LogLevel.ERROR, message, data, context, trace);
  }

  /**
   * Log a message at WARN level
   */
  warn(message: string, context?: string): void;
  warn(message: string, data?: any, context?: string): void;
  warn(message: string, dataOrContext?: any, context?: string): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.WARN, message, data, ctx);
  }

  /**
   * Log a message at DEBUG level
   */
  debug(message: string, context?: string): void;
  debug(message: string, data?: any, context?: string): void;
  debug(message: string, dataOrContext?: any, context?: string): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.DEBUG, message, data, ctx);
  }

  /**
   * Log a message at VERBOSE level
   */
  verbose(message: string, context?: string): void;
  verbose(message: string, data?: any, context?: string): void;
  verbose(message: string, dataOrContext?: any, context?: string): void {
    const { data, ctx } = this.parseArgs(dataOrContext, context);
    this.writeLog(LogLevel.VERBOSE, message, data, ctx);
  }

  /**
   * Core logging method
   */
  private writeLog(
    level: LogLevel,
    message: string,
    data?: any,
    context?: string,
    trace?: string,
  ): void {
    // Check if this log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || this.context,
      message,
    };

    // Add request context if available
    if (this.requestContext.requestId) {
      logEntry.requestId = this.requestContext.requestId;
    }
    if (this.requestContext.userId) {
      logEntry.userId = this.requestContext.userId;
    }
    if (this.requestContext.correlationId) {
      logEntry.correlationId = this.requestContext.correlationId;
    }

    // Add additional data if provided
    if (data !== undefined && data !== null) {
      logEntry.data = data;
    }

    // Add stack trace for errors
    if (trace) {
      logEntry.trace = trace;
    }

    // Output the log
    if (this.useJsonFormat) {
      this.outputJson(logEntry);
    } else {
      this.outputFormatted(logEntry);
    }
  }

  /**
   * Output log as JSON (for production/log aggregation)
   */
  private outputJson(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        process.stderr.write(output + '\n');
        break;
      default:
        process.stdout.write(output + '\n');
        break;
    }
  }

  /**
   * Output formatted log (for development)
   */
  private outputFormatted(entry: LogEntry): void {
    const color = this.colors[entry.level as keyof typeof this.colors] || this.colors.reset;
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(7);
    const context = entry.context ? `[${entry.context}]` : '';
    const requestInfo = this.formatRequestInfo(entry);

    let output = `${color}[${timestamp}] ${level}${this.colors.reset} ${context} ${requestInfo}${entry.message}`;

    // Add data if present
    if (entry.data !== undefined) {
      const dataStr = typeof entry.data === 'object'
        ? JSON.stringify(entry.data, null, 2)
        : String(entry.data);
      output += `\n${color}Data:${this.colors.reset} ${dataStr}`;
    }

    // Add trace if present
    if (entry.trace) {
      output += `\n${color}Trace:${this.colors.reset}\n${entry.trace}`;
    }

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
        break;
    }
  }

  /**
   * Format request information for log output
   */
  private formatRequestInfo(entry: LogEntry): string {
    const parts: string[] = [];

    if (entry.requestId) {
      parts.push(`reqId:${entry.requestId}`);
    }
    if (entry.userId) {
      parts.push(`userId:${entry.userId}`);
    }
    if (entry.correlationId) {
      parts.push(`corrId:${entry.correlationId}`);
    }

    return parts.length > 0 ? `[${parts.join(' ')}] ` : '';
  }

  /**
   * Parse variable arguments
   */
  private parseArgs(dataOrContext?: any, context?: string): { data?: any; ctx?: string } {
    if (typeof dataOrContext === 'string') {
      return { ctx: dataOrContext };
    }
    return { data: dataOrContext, ctx: context };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevels.includes(level);
  }

  /**
   * Get log levels that should be output based on configured level
   */
  private getLogLevelsForLevel(level: string): LogLevel[] {
    const levels: Record<string, LogLevel[]> = {
      error: [LogLevel.ERROR],
      warn: [LogLevel.ERROR, LogLevel.WARN],
      info: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO],
      debug: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG],
      verbose: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.VERBOSE],
    };

    return levels[level.toLowerCase()] || levels.info;
  }

  /**
   * Create a child logger with a specific context
   */
  createChild(context: string): CustomLoggerService {
    const child = new CustomLoggerService(this.configService);
    child.setContext(context);
    child.setRequestContext(this.requestContext);
    return child;
  }
}
