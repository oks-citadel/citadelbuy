import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Request interface extended with correlation context
 */
export interface CorrelationContext {
  requestId: string;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
}

/**
 * Extended Request with correlation context
 */
export interface RequestWithCorrelation extends Request {
  correlationContext?: CorrelationContext;
}

/**
 * Correlation ID Middleware
 *
 * Generates or extracts correlation IDs for distributed tracing and request tracking.
 * This middleware should be applied before any other middleware that needs tracking.
 *
 * Headers handled:
 * - X-Request-Id: Unique ID for this specific request
 * - X-Correlation-Id: ID that tracks a request across multiple services
 * - X-Trace-Id: Distributed tracing ID (compatible with OpenTelemetry/Jaeger)
 * - X-Span-Id: Span ID for this service in the trace
 * - X-Parent-Span-Id: Parent span ID from upstream service
 *
 * AWS ALB/CloudFront headers:
 * - X-Amzn-Trace-Id: AWS X-Ray trace ID
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /**
   * Generate a unique ID using UUID v4
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a short span ID (16 hex characters for OpenTelemetry compatibility)
   */
  private generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Extract trace ID from AWS X-Ray format
   * Format: Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995c3f42cd8ad8;Sampled=1
   */
  private parseAwsTraceId(awsTraceId: string): { traceId?: string; parentSpanId?: string } {
    const result: { traceId?: string; parentSpanId?: string } = {};

    const rootMatch = awsTraceId.match(/Root=([^;]+)/);
    if (rootMatch) {
      // Convert AWS format to standard hex format
      result.traceId = rootMatch[1].replace(/-/g, '').slice(2);
    }

    const parentMatch = awsTraceId.match(/Parent=([^;]+)/);
    if (parentMatch) {
      result.parentSpanId = parentMatch[1];
    }

    return result;
  }

  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Extract or generate Request ID
    const requestId =
      (req.headers['x-request-id'] as string) ||
      this.generateId();

    // Extract or generate Correlation ID (tracks request across services)
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      requestId;

    // Handle AWS X-Ray trace header if present
    const awsTraceHeader = req.headers['x-amzn-trace-id'] as string;
    let awsTraceInfo: { traceId?: string; parentSpanId?: string } = {};
    if (awsTraceHeader) {
      awsTraceInfo = this.parseAwsTraceId(awsTraceHeader);
    }

    // Extract or generate Trace ID (for distributed tracing)
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      awsTraceInfo.traceId ||
      this.generateId().replace(/-/g, '');

    // Generate Span ID for this service
    const spanId = this.generateSpanId();

    // Extract Parent Span ID if present
    const parentSpanId =
      (req.headers['x-parent-span-id'] as string) ||
      awsTraceInfo.parentSpanId ||
      (req.headers['x-span-id'] as string); // Previous service's span becomes our parent

    // Create correlation context
    const correlationContext: CorrelationContext = {
      requestId,
      correlationId,
      traceId,
      spanId,
      parentSpanId,
      startTime,
    };

    // Attach to request object for downstream use
    req.correlationContext = correlationContext;

    // Set response headers so clients can track their requests
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Span-Id', spanId);

    // Add trace timing header on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      // Note: Headers can't be set after finish, but this is for logging
      // The duration is available via the logging interceptor
    });

    next();
  }
}

/**
 * Async Local Storage for correlation context
 * This allows accessing correlation IDs from any part of the request lifecycle
 */
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Get current correlation context from async local storage
 */
export function getCurrentCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get current request ID from async local storage
 */
export function getCurrentRequestId(): string | undefined {
  return correlationStorage.getStore()?.requestId;
}

/**
 * Get current correlation ID from async local storage
 */
export function getCurrentCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Enhanced middleware that uses async local storage
 * This allows correlation context to be accessed anywhere in the request lifecycle
 */
@Injectable()
export class CorrelationIdMiddlewareWithStorage implements NestMiddleware {
  private readonly baseMiddleware = new CorrelationIdMiddleware();

  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    // First apply base middleware to set up correlation context
    this.baseMiddleware.use(req, res, () => {
      // Then wrap the rest of the request in async local storage
      if (req.correlationContext) {
        correlationStorage.run(req.correlationContext, () => {
          next();
        });
      } else {
        next();
      }
    });
  }
}
