import { Test, TestingModule } from '@nestjs/testing';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { RedisService } from '@/common/redis/redis.service';

describe('WebhookIdempotencyService', () => {
  let service: WebhookIdempotencyService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookIdempotencyService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setNx: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookIdempotencyService>(
      WebhookIdempotencyService,
    );
    redis = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isProcessed', () => {
    it('should return true when event exists in Redis', async () => {
      redis.get.mockResolvedValue('1');

      const result = await service.isProcessed('evt_test_123');

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith('webhook:idempotency:evt_test_123');
    });

    it('should return false when event does not exist in Redis', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.isProcessed('evt_test_123');

      expect(result).toBe(false);
      expect(redis.get).toHaveBeenCalledWith('webhook:idempotency:evt_test_123');
    });

    it('should return false (fail open) when Redis throws an error', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.isProcessed('evt_test_123');

      expect(result).toBe(false);
    });
  });

  describe('markProcessed', () => {
    it('should set event in Redis with default TTL', async () => {
      redis.set.mockResolvedValue(true);

      await service.markProcessed('evt_test_123');

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:evt_test_123',
        '1',
        86400, // 24 hours default
      );
    });

    it('should set event in Redis with custom TTL', async () => {
      redis.set.mockResolvedValue(true);

      await service.markProcessed('evt_test_123', 3600);

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:evt_test_123',
        '1',
        3600,
      );
    });

    it('should handle errors gracefully', async () => {
      redis.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.markProcessed('evt_test_123')).resolves.not.toThrow();
    });
  });

  describe('checkAndMark', () => {
    it('should return true when event was newly marked', async () => {
      redis.set.mockResolvedValue(true);

      const result = await service.checkAndMark('evt_test_123');

      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:evt_test_123',
        '1',
        86400,
      );
    });

    it('should return false when set returns null (key existed)', async () => {
      redis.set.mockResolvedValue(null as any);

      const result = await service.checkAndMark('evt_test_123');

      expect(result).toBe(false);
    });

    it('should use custom TTL when provided', async () => {
      redis.set.mockResolvedValue(true);

      await service.checkAndMark('evt_test_123', 7200);

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:evt_test_123',
        '1',
        7200,
      );
    });

    it('should return true (fail open) on Redis error', async () => {
      redis.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkAndMark('evt_test_123');

      expect(result).toBe(true);
    });
  });

  describe('unmark', () => {
    it('should delete event from Redis', async () => {
      redis.del.mockResolvedValue(true);

      await service.unmark('evt_test_123');

      expect(redis.del).toHaveBeenCalledWith('webhook:idempotency:evt_test_123');
    });

    it('should handle errors gracefully', async () => {
      redis.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.unmark('evt_test_123')).resolves.not.toThrow();
    });
  });

  describe('checkAndLockEvent', () => {
    it('should return true when lock is acquired', async () => {
      redis.setNx.mockResolvedValue(true);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
        { amount: 100 },
      );

      expect(result).toBe(true);
      expect(redis.setNx).toHaveBeenCalledWith(
        'webhook:idempotency:lock:evt_test_123',
        expect.stringContaining('"provider":"stripe"'),
        86400,
      );
    });

    it('should return false when lock already exists', async () => {
      redis.setNx.mockResolvedValue(false);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);
    });

    it('should include eventType and metadata in lock value', async () => {
      redis.setNx.mockResolvedValue(true);

      await service.checkAndLockEvent(
        'evt_test_123',
        'paypal',
        'payment.completed',
        { orderId: 'order_123' },
      );

      const callArg = redis.setNx.mock.calls[0][1];
      const parsed = JSON.parse(callArg);

      expect(parsed.provider).toBe('paypal');
      expect(parsed.eventType).toBe('payment.completed');
      expect(parsed.orderId).toBe('order_123');
      expect(parsed.lockedAt).toBeDefined();
    });

    it('should return true (fail open) on Redis error', async () => {
      redis.setNx.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(true);
    });
  });

  describe('markEventFailed', () => {
    it('should set failed status in Redis', async () => {
      redis.set.mockResolvedValue(true);

      await service.markEventFailed(
        'evt_test_123',
        'stripe',
        'Payment processing failed',
        { error: 'Card declined' },
      );

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:failed:evt_test_123',
        'Payment processing failed',
        86400,
      );
    });

    it('should use "unknown" when no error message provided', async () => {
      redis.set.mockResolvedValue(true);

      await service.markEventFailed('evt_test_123', 'stripe');

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:failed:evt_test_123',
        'unknown',
        86400,
      );
    });

    it('should handle errors gracefully', async () => {
      redis.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.markEventFailed('evt_test_123', 'stripe', 'Error'),
      ).resolves.not.toThrow();
    });
  });

  describe('markEventCompleted', () => {
    it('should set completed status in Redis', async () => {
      redis.set.mockResolvedValue(true);

      await service.markEventCompleted(
        'evt_test_123',
        'stripe',
        { result: 'success' },
      );

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:idempotency:completed:evt_test_123',
        '1',
        86400,
      );
    });

    it('should handle errors gracefully', async () => {
      redis.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.markEventCompleted('evt_test_123', 'stripe'),
      ).resolves.not.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return zero statistics', async () => {
      const result = await service.getStatistics();

      expect(result).toEqual({
        processed: 0,
        failed: 0,
        completed: 0,
      });
    });
  });
});
