import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, ConflictException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisService } from '@/common/redis/redis.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let redisService: jest.Mocked<RedisService>;

  const mockRequest = {
    method: 'POST',
    path: '/orders',
    headers: {
      'idempotency-key': 'test-key-123',
      'x-request-id': 'req-456',
    },
    user: { id: 'user-789' },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ id: 'order-123', status: 'created' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        {
          provide: RedisService,
          useValue: {
            setNx: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should proceed without idempotency check when no key provided', async () => {
      const requestWithoutKey = {
        ...mockRequest,
        headers: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => requestWithoutKey,
        }),
      } as ExecutionContext;

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(redisService.setNx).not.toHaveBeenCalled();
    });

    it('should acquire lock and process request for new idempotency key', async () => {
      redisService.setNx.mockResolvedValue(true);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(redisService.setNx).toHaveBeenCalledWith(
        expect.stringContaining('idempotency:user-789:POST:/orders:test-key-123:lock'),
        expect.any(String),
        86400,
      );

      // Subscribe to get the result
      const response = await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      expect(response).toEqual({ id: 'order-123', status: 'created' });
    });

    it('should return cached response for duplicate request', async () => {
      redisService.setNx.mockResolvedValue(false);
      redisService.get.mockResolvedValue({ id: 'order-123', status: 'created', cached: true });

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      const response = await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      expect(response).toEqual({ id: 'order-123', status: 'created', cached: true });
    });

    it('should throw ConflictException when request is being processed', async () => {
      redisService.setNx.mockResolvedValue(false);
      redisService.get.mockResolvedValue(null); // No cached response yet

      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      ).rejects.toThrow(ConflictException);
    });

    it('should include IDEMPOTENCY_CONFLICT code in conflict error', async () => {
      redisService.setNx.mockResolvedValue(false);
      redisService.get.mockResolvedValue(null);

      try {
        await interceptor.intercept(mockExecutionContext, mockCallHandler);
        fail('Expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = (error as ConflictException).getResponse();
        expect(response).toMatchObject({
          code: 'IDEMPOTENCY_CONFLICT',
          requestId: 'req-456',
        });
      }
    });

    it('should cache successful response', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.set.mockResolvedValue();

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Trigger subscription to execute tap operators
      await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      // Wait for async cache operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining(':response'),
        expect.any(String),
        86400,
      );
    });

    it('should release lock on request error', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.del.mockResolvedValue(1);

      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('Processing failed')),
      };

      const result = await interceptor.intercept(mockExecutionContext, errorHandler);

      await new Promise((resolve) => {
        result.subscribe({
          error: () => resolve(undefined),
        });
      });

      // Wait for async cleanup operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(redisService.del).toHaveBeenCalledWith(
        expect.stringContaining(':lock'),
      );
    });

    it('should handle anonymous user gracefully', async () => {
      const anonymousRequest = {
        ...mockRequest,
        user: undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => anonymousRequest,
        }),
      } as ExecutionContext;

      redisService.setNx.mockResolvedValue(true);

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(result).toBeDefined();
      expect(redisService.setNx).toHaveBeenCalledWith(
        expect.stringContaining('anonymous'),
        expect.any(String),
        86400,
      );
    });

    it('should proceed without idempotency when Redis fails', async () => {
      redisService.setNx.mockRejectedValue(new Error('Redis connection failed'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(result).toBeDefined();

      const response = await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      expect(response).toEqual({ id: 'order-123', status: 'created' });
    });

    it('should create composite key with user, method, path, and idempotency key', async () => {
      redisService.setNx.mockResolvedValue(true);

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(redisService.setNx).toHaveBeenCalledWith(
        'idempotency:user-789:POST:/orders:test-key-123:lock',
        expect.any(String),
        86400,
      );
    });

    it('should use 24-hour TTL for cached responses', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.set.mockResolvedValue();

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(redisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        86400, // 24 hours in seconds
      );
    });
  });

  describe('composite key generation', () => {
    it('should prevent cross-user key collisions', async () => {
      redisService.setNx.mockResolvedValue(true);

      // First user request
      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      const firstCallKey = (redisService.setNx.mock.calls[0] as any)[0];

      // Second user request with same idempotency key
      const user2Request = {
        ...mockRequest,
        user: { id: 'user-different' },
      };

      const context2 = {
        switchToHttp: () => ({
          getRequest: () => user2Request,
        }),
      } as ExecutionContext;

      await interceptor.intercept(context2, mockCallHandler);

      const secondCallKey = (redisService.setNx.mock.calls[1] as any)[0];

      expect(firstCallKey).not.toEqual(secondCallKey);
      expect(firstCallKey).toContain('user-789');
      expect(secondCallKey).toContain('user-different');
    });

    it('should prevent cross-endpoint key collisions', async () => {
      redisService.setNx.mockResolvedValue(true);

      // First endpoint
      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      const firstCallKey = (redisService.setNx.mock.calls[0] as any)[0];

      // Different endpoint with same idempotency key
      const differentPathRequest = {
        ...mockRequest,
        path: '/subscriptions',
      };

      const context2 = {
        switchToHttp: () => ({
          getRequest: () => differentPathRequest,
        }),
      } as ExecutionContext;

      await interceptor.intercept(context2, mockCallHandler);

      const secondCallKey = (redisService.setNx.mock.calls[1] as any)[0];

      expect(firstCallKey).not.toEqual(secondCallKey);
      expect(firstCallKey).toContain('/orders');
      expect(secondCallKey).toContain('/subscriptions');
    });
  });

  describe('lock status handling', () => {
    it('should include processing status in lock data', async () => {
      redisService.setNx.mockResolvedValue(true);

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      const lockData = JSON.parse((redisService.setNx.mock.calls[0] as any)[1]);

      expect(lockData).toMatchObject({
        status: 'processing',
        startedAt: expect.any(String),
      });
    });

    it('should update lock status to completed on success', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.set.mockResolvedValue();

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have set both response and lock status
      const setCalls = redisService.set.mock.calls;
      const lockUpdateCall = setCalls.find((call: any) =>
        (call[0] as string).includes(':lock'),
      );

      expect(lockUpdateCall).toBeDefined();
      if (lockUpdateCall) {
        const lockData = JSON.parse(lockUpdateCall[1] as string);
        expect(lockData.status).toBe('completed');
        expect(lockData.completedAt).toBeDefined();
      }
    });
  });

  describe('error recovery', () => {
    it('should not fail request when cache fails', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.set.mockRejectedValue(new Error('Cache write failed'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      const response = await new Promise((resolve) => {
        result.subscribe({ next: resolve });
      });

      // Request should still succeed
      expect(response).toEqual({ id: 'order-123', status: 'created' });
    });

    it('should not throw when lock cleanup fails', async () => {
      redisService.setNx.mockResolvedValue(true);
      redisService.del.mockRejectedValue(new Error('Redis delete failed'));

      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('Processing failed')),
      };

      const result = await interceptor.intercept(mockExecutionContext, errorHandler);

      // Should not throw additional error
      await expect(
        new Promise((resolve, reject) => {
          result.subscribe({ error: reject });
        }),
      ).rejects.toThrow('Processing failed');
    });
  });
});
