import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

interface SentryEvent {
  event_id?: string;
  message: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  platform: string;
  timestamp: number;
  environment: string;
  tags: Record<string, string>;
  extra: Record<string, any>;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    data?: any;
  };
  user?: {
    id?: string;
    email?: string;
    ip_address?: string;
  };
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);
  private readonly sentryDsn: string | undefined;
  private readonly environment: string;

  constructor(private configService: ConfigService) {
    this.sentryDsn = this.configService.get<string>('SENTRY_DSN');
    this.environment = this.configService.get<string>('NODE_ENV') || 'development';

    if (!this.sentryDsn) {
      this.logger.warn('SENTRY_DSN not configured. Error reporting disabled.');
    } else {
      this.logger.log('Sentry error reporting initialized');
    }
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Get request ID for correlation
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      crypto.randomUUID();

    // Build error response with requestId for correlation
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      requestId,
      code: this.getErrorCode(exception, status),
    };

    // Log the error
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      // Report to Sentry for server errors
      await this.reportToSentry(exception, request, status);
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private async reportToSentry(
    exception: unknown,
    request: Request,
    status: number,
  ): Promise<void> {
    if (!this.sentryDsn) {
      return;
    }

    try {
      const parsedDsn = this.parseDsn(this.sentryDsn);
      if (!parsedDsn) {
        return;
      }

      const event: SentryEvent = {
        message: exception instanceof Error ? exception.message : String(exception),
        level: status >= 500 ? 'error' : 'warning',
        platform: 'node',
        timestamp: Date.now() / 1000,
        environment: this.environment,
        tags: {
          status: status.toString(),
          method: request.method,
          path: request.path,
          runtime: 'nodejs',
        },
        extra: {
          query: request.query,
          params: request.params,
        },
        request: {
          url: `${request.protocol}://${request.get('host')}${request.originalUrl}`,
          method: request.method,
          headers: this.sanitizeHeaders(request.headers as Record<string, string>),
        },
      };

      // Add exception details
      if (exception instanceof Error) {
        event.exception = {
          values: [
            {
              type: exception.constructor.name,
              value: exception.message,
              stacktrace: exception.stack
                ? { frames: this.parseStackTrace(exception.stack) }
                : undefined,
            },
          ],
        };
      }

      // Add user info if available
      const user = (request as any).user;
      if (user) {
        event.user = {
          id: user.id || user.sub,
          email: user.email,
          ip_address: this.getClientIp(request),
        };
      } else {
        event.user = {
          ip_address: this.getClientIp(request),
        };
      }

      // Send to Sentry
      await this.sendToSentry(parsedDsn, event);
    } catch (error) {
      this.logger.error('Failed to report error to Sentry', error);
    }
  }

  private parseDsn(dsn: string): {
    publicKey: string;
    host: string;
    projectId: string;
  } | null {
    try {
      // DSN format: https://<public_key>@<host>/<project_id>
      const url = new URL(dsn);
      const publicKey = url.username;
      const host = url.host;
      const projectId = url.pathname.replace('/', '');

      return { publicKey, host, projectId };
    } catch {
      this.logger.error('Invalid Sentry DSN format');
      return null;
    }
  }

  private async sendToSentry(
    parsedDsn: { publicKey: string; host: string; projectId: string },
    event: SentryEvent,
  ): Promise<void> {
    const endpoint = `https://${parsedDsn.host}/api/${parsedDsn.projectId}/store/`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=broxiva-nestjs/1.0, sentry_key=${parsedDsn.publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      this.logger.warn(`Sentry responded with status ${response.status}`);
    } else {
      this.logger.debug(`Error reported to Sentry: ${event.message}`);
    }
  }

  private parseStackTrace(
    stack: string,
  ): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
    const frames: Array<{
      filename: string;
      function: string;
      lineno?: number;
      colno?: number;
    }> = [];

    const lines = stack.split('\n').slice(1); // Skip the first line (error message)

    for (const line of lines) {
      const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
      if (match) {
        frames.push({
          function: match[1] || '<anonymous>',
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        });
      }
    }

    // Sentry expects frames in reverse order (most recent last)
    return frames.reverse();
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private getErrorCode(exception: unknown, status: number): string {
    // Extract error code from HttpException if available
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, any>;
        if (responseObj.code) {
          return responseObj.code;
        }
      }
    }

    // Map HTTP status codes to error codes
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[status] || `HTTP_${status}`;
  }
}
