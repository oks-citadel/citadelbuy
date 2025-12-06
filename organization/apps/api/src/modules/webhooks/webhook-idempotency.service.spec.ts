import { Test, TestingModule } from '@nestjs/testing';
import {
  WebhookIdempotencyService,
  WebhookEventRecord,
} from './webhook-idempotency.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

describe('WebhookIdempotencyService', () => {
  let service: WebhookIdempotencyService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  const mockEvent = {
    eventId: 'evt_test_123',
    provider: 'stripe',
    eventType: 'payment_intent.succeeded',
    processedAt: new Date(),
    status: 'processing' as const,
    metadata: { amount: 100 },
  };

  const mockDbEvent = {
    eventId: 'evt_test_123',
    provider: 'stripe',
    eventType: 'payment_intent.succeeded',
    processedAt: new Date(),
    status: 'processing',
    metadata: { amount: 100 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookIdempotencyService,
        {
          provide: PrismaService,
          useValue: {
            paymentWebhookEvent: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookIdempotencyService>(
      WebhookIdempotencyService,
    );
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redis = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndLockEvent', () => {
    it('should lock new event when not found in Redis or database', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
        { amount: 100 },
      );

      expect(result).toBe(true);

      expect(redis.get).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
      );

      expect(prisma.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: {
          eventId_provider: {
            eventId: 'evt_test_123',
            provider: 'stripe',
          },
        },
      });

      expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'evt_test_123',
          provider: 'stripe',
          eventType: 'payment_intent.succeeded',
          status: 'processing',
          processedAt: expect.any(Date),
          metadata: { amount: 100 },
        },
      });

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
        expect.objectContaining({
          eventId: 'evt_test_123',
          provider: 'stripe',
          status: 'processing',
        }),
        7 * 24 * 60 * 60, // 7 days TTL
      );
    });

    it('should reject completed event from Redis', async () => {
      const completedEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'completed',
      };

      redis.get.mockResolvedValue(completedEvent);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);
      expect(prisma.paymentWebhookEvent.findUnique).not.toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should reject processing event from Redis within timeout', async () => {
      const processingEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'processing',
        processedAt: new Date(), // Current time
      };

      redis.get.mockResolvedValue(processingEvent);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should allow retry for processing event after timeout', async () => {
      const oldDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const processingEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'processing',
        processedAt: oldDate,
      };

      redis.get.mockResolvedValue(processingEvent);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(true);
      expect(prisma.paymentWebhookEvent.create).toHaveBeenCalled();
    });

    it('should reject completed event from database', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        ...mockDbEvent,
        status: 'completed',
      } as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);

      // Should update Redis cache
      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
        expect.objectContaining({
          status: 'completed',
        }),
        7 * 24 * 60 * 60,
      );

      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('should reject processing event from database within timeout', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        ...mockDbEvent,
        status: 'processing',
        processedAt: new Date(),
      } as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);
    });

    it('should handle database unique constraint violation', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockRejectedValue({
        code: 'P2002', // Prisma unique constraint error
      });

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(false);
    });

    it('should allow processing on general errors', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      expect(result).toBe(true);
    });

    it('should handle failed event from database gracefully', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        ...mockDbEvent,
        status: 'failed',
      } as any);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      // Should allow processing for failed events
      expect(result).toBe(true);
    });
  });

  describe('markEventCompleted', () => {
    it('should mark event as completed in database and cache', async () => {
      prisma.paymentWebhookEvent.update.mockResolvedValue({
        ...mockDbEvent,
        status: 'completed',
      } as any);

      await service.markEventCompleted(
        'evt_test_123',
        'stripe',
        { result: 'success' },
      );

      expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
        where: {
          eventId_provider: {
            eventId: 'evt_test_123',
            provider: 'stripe',
          },
        },
        data: {
          status: 'completed',
          metadata: { result: 'success' },
          updatedAt: expect.any(Date),
        },
      });

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
        expect.objectContaining({
          status: 'completed',
          metadata: { result: 'success' },
        }),
        7 * 24 * 60 * 60,
      );
    });

    it('should handle errors gracefully when marking as completed', async () => {
      prisma.paymentWebhookEvent.update.mockRejectedValue(
        new Error('Database error'),
      );

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.markEventCompleted('evt_test_123', 'stripe');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error marking event'),
        expect.any(String),
      );
    });

    it('should not throw when Redis fails', async () => {
      prisma.paymentWebhookEvent.update.mockResolvedValue(mockDbEvent as any);
      redis.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.markEventCompleted('evt_test_123', 'stripe'),
      ).resolves.not.toThrow();
    });
  });

  describe('markEventFailed', () => {
    it('should mark event as failed in database and cache', async () => {
      prisma.paymentWebhookEvent.update.mockResolvedValue({
        ...mockDbEvent,
        status: 'failed',
      } as any);

      await service.markEventFailed(
        'evt_test_123',
        'stripe',
        'Payment processing failed',
        { error: 'Card declined' },
      );

      expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
        where: {
          eventId_provider: {
            eventId: 'evt_test_123',
            provider: 'stripe',
          },
        },
        data: {
          status: 'failed',
          metadata: expect.objectContaining({
            error: 'Card declined',
            errorMessage: 'Payment processing failed',
            failedAt: expect.any(String),
          }),
          updatedAt: expect.any(Date),
        },
      });

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
        expect.objectContaining({
          status: 'failed',
          metadata: expect.objectContaining({
            errorMessage: 'Payment processing failed',
          }),
        }),
        7 * 24 * 60 * 60,
      );
    });

    it('should handle errors gracefully when marking as failed', async () => {
      prisma.paymentWebhookEvent.update.mockRejectedValue(
        new Error('Database error'),
      );

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.markEventFailed('evt_test_123', 'stripe', 'Error message');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error marking event'),
        expect.any(String),
      );
    });
  });

  describe('getEventHistory', () => {
    it('should retrieve event history from database', async () => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(
        mockDbEvent as any,
      );

      const result = await service.getEventHistory('evt_test_123', 'stripe');

      expect(prisma.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: {
          eventId_provider: {
            eventId: 'evt_test_123',
            provider: 'stripe',
          },
        },
      });

      expect(result).toEqual({
        eventId: 'evt_test_123',
        provider: 'stripe',
        eventType: 'payment_intent.succeeded',
        processedAt: expect.any(Date),
        status: 'processing',
        metadata: { amount: 100 },
      });
    });

    it('should return null when event not found', async () => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);

      const result = await service.getEventHistory('evt_test_123', 'stripe');

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      prisma.paymentWebhookEvent.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getEventHistory('evt_test_123', 'stripe');

      expect(result).toBeNull();
    });
  });

  describe('cleanupOldEvents', () => {
    it('should delete completed events older than specified days', async () => {
      prisma.paymentWebhookEvent.deleteMany.mockResolvedValue({ count: 42 } as any);

      const result = await service.cleanupOldEvents(30);

      expect(prisma.paymentWebhookEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          processedAt: {
            lt: expect.any(Date),
          },
          status: 'completed',
        },
      });

      expect(result).toBe(42);
    });

    it('should use default 30 days when not specified', async () => {
      prisma.paymentWebhookEvent.deleteMany.mockResolvedValue({ count: 10 } as any);

      await service.cleanupOldEvents();

      expect(prisma.paymentWebhookEvent.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            processedAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should calculate correct cutoff date', async () => {
      prisma.paymentWebhookEvent.deleteMany.mockResolvedValue({ count: 5 } as any);

      const daysToKeep = 15;
      await service.cleanupOldEvents(daysToKeep);

      const callArgs = prisma.paymentWebhookEvent.deleteMany.mock.calls[0][0];
      const cutoffDate = callArgs.where.processedAt.lt;

      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - daysToKeep);

      const timeDiff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should handle errors and return 0', async () => {
      prisma.paymentWebhookEvent.deleteMany.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.cleanupOldEvents(30);

      expect(result).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should get statistics for all providers', async () => {
      prisma.paymentWebhookEvent.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // completed
        .mockResolvedValueOnce(10) // failed
        .mockResolvedValueOnce(5); // processing

      const result = await service.getStatistics();

      expect(prisma.paymentWebhookEvent.count).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        total: 100,
        completed: 85,
        failed: 10,
        processing: 5,
      });
    });

    it('should get statistics for specific provider', async () => {
      prisma.paymentWebhookEvent.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // completed
        .mockResolvedValueOnce(3) // failed
        .mockResolvedValueOnce(2); // processing

      const result = await service.getStatistics('stripe');

      expect(prisma.paymentWebhookEvent.count).toHaveBeenCalledWith({
        where: { provider: 'stripe' },
      });

      expect(result).toEqual({
        total: 50,
        completed: 45,
        failed: 3,
        processing: 2,
      });
    });

    it('should handle errors and return zero statistics', async () => {
      prisma.paymentWebhookEvent.count.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getStatistics();

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
      });
    });
  });

  describe('Composite Key Generation', () => {
    it('should generate correct composite key', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      await service.checkAndLockEvent('evt_123', 'paypal', 'payment.completed');

      expect(redis.get).toHaveBeenCalledWith('webhook:event:paypal:evt_123');
      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:paypal:evt_123',
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('Processing Timeout', () => {
    it('should use 5 minute timeout for processing events', async () => {
      const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
      const processingEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'processing',
        processedAt: fourMinutesAgo,
      };

      redis.get.mockResolvedValue(processingEvent);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      // Should reject within 5 minutes
      expect(result).toBe(false);
    });

    it('should allow retry after 5 minute timeout', async () => {
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      const processingEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'processing',
        processedAt: sixMinutesAgo,
      };

      redis.get.mockResolvedValue(processingEvent);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment_intent.succeeded',
      );

      // Should allow retry after 5 minutes
      expect(result).toBe(true);
    });
  });

  describe('Redis TTL', () => {
    it('should set 7 day TTL for Redis entries', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookEvent.create.mockResolvedValue(mockDbEvent as any);

      await service.checkAndLockEvent('evt_test_123', 'stripe', 'payment.succeeded');

      expect(redis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        7 * 24 * 60 * 60, // 7 days in seconds
      );
    });
  });

  describe('Dual-Layer Idempotency', () => {
    it('should check Redis before database', async () => {
      const completedEvent: WebhookEventRecord = {
        ...mockEvent,
        status: 'completed',
      };

      redis.get.mockResolvedValue(completedEvent);

      await service.checkAndLockEvent('evt_test_123', 'stripe', 'payment.succeeded');

      expect(redis.get).toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback to database when Redis fails', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection failed'));
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        ...mockDbEvent,
        status: 'completed',
      } as any);

      const result = await service.checkAndLockEvent(
        'evt_test_123',
        'stripe',
        'payment.succeeded',
      );

      expect(result).toBe(false);
      expect(prisma.paymentWebhookEvent.findUnique).toHaveBeenCalled();
    });

    it('should update Redis cache from database when Redis miss', async () => {
      redis.get.mockResolvedValue(null);
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        ...mockDbEvent,
        status: 'completed',
      } as any);

      await service.checkAndLockEvent('evt_test_123', 'stripe', 'payment.succeeded');

      expect(redis.set).toHaveBeenCalledWith(
        'webhook:event:stripe:evt_test_123',
        expect.objectContaining({
          status: 'completed',
        }),
        7 * 24 * 60 * 60,
      );
    });
  });
});
