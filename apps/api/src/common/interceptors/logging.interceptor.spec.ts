import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  LoggingInterceptor,
  HealthCheckLoggingInterceptor,
} from './logging.interceptor';
import { CustomLoggerService } from '../logger/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerService: jest.Mocked<CustomLoggerService>;
  let metricsService: jest.Mocked<MetricsService>;

  const createMockRequest = (overrides: any = {}) => ({
    method: 'GET',
    url: '/api/test',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'jest-test-agent',
      'x-request-id': 'req-123',
      'x-correlation-id': 'corr-456',
    },
    user: { id: 'user-789' },
    correlationContext: {
      requestId: 'ctx-req-123',
      correlationId: 'ctx-corr-456',
      traceId: 'trace-123',
      spanId: 'span-456',
      startTime: Date.now(),
    },
    get: jest.fn((header: string) => {
      if (header === 'user-agent') return 'jest-test-agent';
      return undefined;
    }),
    route: { path: '/api/test' },
    ...overrides,
  });

  const createMockResponse = () => ({
    statusCode: 200,
    getHeader: jest.fn().mockReturnValue(undefined),
    setHeader: jest.fn(),
    get: jest.fn().mockReturnValue('1234'),
  });

  const createMockExecutionContext = (
    request = createMockRequest(),
    response = createMockResponse(),
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: any = { data: 'test' }): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            setRequestContext: jest.fn(),
            clearRequestContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementHttpRequestsInProgress: jest.fn(),
            decrementHttpRequestsInProgress: jest.fn(),
            trackHttpRequest: jest.fn(),
            trackError: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    loggerService = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
    metricsService = module.get(MetricsService) as jest.Mocked<MetricsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should log request start with structured format', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('--> GET /api/test'),
        expect.objectContaining({
          event: 'request_start',
          method: 'GET',
          url: '/api/test',
        }),
      );
    });

    it('should log request end with status and duration', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringMatching(/<-- GET \/api\/test 200 \d+ms/),
        expect.objectContaining({
          event: 'request_end',
          method: 'GET',
          statusCode: 200,
          duration: expect.any(Number),
        }),
      );
    });

    it('should set request context in logger', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
          correlationId: expect.any(String),
        }),
      );
    });

    it('should set response headers for request tracking', async () => {
      const response = createMockResponse();
      const context = createMockExecutionContext(createMockRequest(), response);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Request-Id',
        expect.any(String),
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Correlation-Id',
        expect.any(String),
      );
    });

    it('should not override existing response headers', async () => {
      const response = createMockResponse();
      response.getHeader.mockImplementation((name: string) => {
        if (name === 'X-Request-Id') return 'existing-req-id';
        if (name === 'X-Correlation-Id') return 'existing-corr-id';
        return undefined;
      });
      const context = createMockExecutionContext(createMockRequest(), response);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      // Should not call setHeader for already-set headers
      const setHeaderCalls = response.setHeader.mock.calls;
      const reqIdCalls = setHeaderCalls.filter(
        (call: any) => call[0] === 'X-Request-Id',
      );
      expect(reqIdCalls.length).toBe(0);
    });

    it('should extract user ID from request user', async () => {
      const request = createMockRequest({ user: { id: 'user-abc-123' } });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-abc-123',
        }),
      );
    });

    it('should extract user ID from sub claim if id not present', async () => {
      const request = createMockRequest({ user: { sub: 'sub-user-456' } });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'sub-user-456',
        }),
      );
    });

    it('should handle requests without authenticated user', async () => {
      const request = createMockRequest({ user: undefined });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it('should track HTTP requests in progress', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      expect(metricsService.incrementHttpRequestsInProgress).toHaveBeenCalledWith(
        'GET',
        '/api/test',
      );

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.decrementHttpRequestsInProgress).toHaveBeenCalledWith(
        'GET',
        '/api/test',
      );
    });

    it('should record metrics for successful requests', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.trackHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        200,
        expect.any(Number),
      );
    });

    it('should clear request context after completion', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.clearRequestContext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should log errors with request_error event', async () => {
      const context = createMockExecutionContext();
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('Test error')),
      };

      const result$ = interceptor.intercept(context, errorHandler);

      await new Promise((resolve) => {
        result$.subscribe({
          error: () => resolve(undefined),
        });
      });

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringMatching(/<-- GET \/api\/test \d+ \d+ms/),
        expect.objectContaining({
          event: 'request_error',
          error: expect.objectContaining({
            message: 'Test error',
          }),
        }),
      );
    });

    it('should record error metrics', async () => {
      const context = createMockExecutionContext();
      const errorHandler: CallHandler = {
        handle: () =>
          throwError(() => {
            const err = new Error('Test error');
            (err as any).status = 500;
            (err as any).name = 'InternalServerError';
            return err;
          }),
      };

      const result$ = interceptor.intercept(context, errorHandler);

      await new Promise((resolve) => {
        result$.subscribe({
          error: () => resolve(undefined),
        });
      });

      expect(metricsService.trackError).toHaveBeenCalledWith(
        'InternalServerError',
        'critical',
      );
    });

    it('should treat 4xx errors as warnings', async () => {
      const context = createMockExecutionContext();
      const errorHandler: CallHandler = {
        handle: () =>
          throwError(() => {
            const err = new Error('Not found');
            (err as any).status = 404;
            (err as any).name = 'NotFoundException';
            return err;
          }),
      };

      const result$ = interceptor.intercept(context, errorHandler);

      await new Promise((resolve) => {
        result$.subscribe({
          error: () => resolve(undefined),
        });
      });

      expect(metricsService.trackError).toHaveBeenCalledWith(
        'NotFoundException',
        'warning',
      );
    });

    it('should still clear request context on error', async () => {
      const context = createMockExecutionContext();
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('Test error')),
      };

      const result$ = interceptor.intercept(context, errorHandler);

      await new Promise((resolve) => {
        result$.subscribe({
          error: () => resolve(undefined),
        });
      });

      expect(loggerService.clearRequestContext).toHaveBeenCalled();
    });
  });

  describe('route pattern extraction', () => {
    it('should use route path when available', async () => {
      const request = createMockRequest({
        route: { path: '/api/products/:id' },
        url: '/api/products/123',
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.trackHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/products/:id',
        200,
        expect.any(Number),
      );
    });

    it('should normalize URLs with UUIDs', async () => {
      const request = createMockRequest({
        route: undefined,
        routerPath: undefined,
        url: '/api/products/550e8400-e29b-41d4-a716-446655440000',
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.trackHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/products/:id',
        200,
        expect.any(Number),
      );
    });

    it('should normalize URLs with numeric IDs', async () => {
      const request = createMockRequest({
        route: undefined,
        routerPath: undefined,
        url: '/api/orders/12345',
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.trackHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/orders/:id',
        200,
        expect.any(Number),
      );
    });

    it('should strip query parameters from URL', async () => {
      const request = createMockRequest({
        route: undefined,
        routerPath: undefined,
        url: '/api/products?page=1&limit=10',
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(metricsService.trackHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/products',
        200,
        expect.any(Number),
      );
    });
  });

  describe('correlation context', () => {
    it('should use correlation context from middleware when available', async () => {
      const request = createMockRequest({
        correlationContext: {
          requestId: 'middleware-req-id',
          correlationId: 'middleware-corr-id',
          traceId: 'middleware-trace-id',
          spanId: 'middleware-span-id',
          startTime: Date.now() - 100,
        },
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'middleware-req-id',
          correlationId: 'middleware-corr-id',
        }),
      );
    });

    it('should fall back to headers when no correlation context', async () => {
      const request = createMockRequest({
        correlationContext: undefined,
        headers: {
          'x-request-id': 'header-req-id',
          'x-correlation-id': 'header-corr-id',
        },
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'header-req-id',
          correlationId: 'header-corr-id',
        }),
      );
    });

    it('should generate request ID when not provided', async () => {
      const request = createMockRequest({
        correlationContext: undefined,
        headers: {},
      });
      const context = createMockExecutionContext(request);
      const handler = createMockCallHandler();

      const result$ = interceptor.intercept(context, handler);

      await new Promise((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(loggerService.setRequestContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
        }),
      );
    });
  });
});

describe('HealthCheckLoggingInterceptor', () => {
  let interceptor: HealthCheckLoggingInterceptor;
  let loggerService: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckLoggingInterceptor,
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<HealthCheckLoggingInterceptor>(
      HealthCheckLoggingInterceptor,
    );
    loggerService = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set context to HealthCheck', () => {
    expect(loggerService.setContext).toHaveBeenCalledWith('HealthCheck');
  });

  it('should not log successful health checks', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/health' }),
      }),
    } as ExecutionContext;
    const handler: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    const result$ = interceptor.intercept(context, handler);

    await new Promise((resolve) => {
      result$.subscribe({ complete: resolve });
    });

    expect(loggerService.log).not.toHaveBeenCalled();
  });

  it('should log errors for failed health checks', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/health' }),
      }),
    } as ExecutionContext;
    const handler: CallHandler = {
      handle: () => throwError(() => new Error('Database connection failed')),
    };

    const result$ = interceptor.intercept(context, handler);

    await new Promise((resolve) => {
      result$.subscribe({
        error: () => resolve(undefined),
      });
    });

    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringContaining('Health check failed'),
      expect.objectContaining({
        url: '/health',
        error: 'Database connection failed',
      }),
    );
  });
});
