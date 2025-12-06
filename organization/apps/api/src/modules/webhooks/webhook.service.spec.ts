import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService, WEBHOOK_QUEUE } from './webhook.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { WebhookDeliveryStatus } from '@prisma/client';
import { generateWebhookSecret } from './utils/webhook-signature.util';

jest.mock('./utils/webhook-signature.util');

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: jest.Mocked<PrismaService>;
  let queue: jest.Mocked<Queue>;

  const mockWebhook = {
    id: 'webhook_123',
    url: 'https://example.com/webhook',
    secret: 'whsec_test_secret',
    description: 'Test webhook',
    events: ['order.created', 'order.updated'],
    isActive: true,
    metadata: { env: 'test' },
    userId: 'user_123',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDelivery = {
    id: 'delivery_123',
    webhookId: 'webhook_123',
    eventType: 'order.created',
    eventId: 'evt_123',
    payload: { order: { id: 'order_123', total: 100 } },
    status: WebhookDeliveryStatus.PENDING,
    attempts: 0,
    maxAttempts: 5,
    statusCode: null,
    errorMessage: null,
    responseBody: null,
    deliveredAt: null,
    failedAt: null,
    lastAttemptAt: null,
    nextRetryAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventLog = {
    id: 'event_log_123',
    eventType: 'order.created',
    eventId: 'evt_123',
    payload: { order: { id: 'order_123' } },
    source: 'order_service',
    triggeredBy: 'user_123',
    webhooksTriggered: 0,
    processed: false,
    processedAt: null,
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: {
            webhook: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            webhookDelivery: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            webhookEventLog: {
              create: jest.fn(),
              update: jest.fn(),
            },
            webhookDeadLetter: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken(WEBHOOK_QUEUE),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    queue = module.get(getQueueToken(WEBHOOK_QUEUE)) as jest.Mocked<Queue>;

    // Mock generateWebhookSecret
    (generateWebhookSecret as jest.Mock).mockReturnValue('whsec_test_secret');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a webhook with generated secret', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        description: 'Test webhook',
        events: ['order.created', 'order.updated'],
        isActive: true,
        metadata: { env: 'test' },
      };

      prisma.webhook.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(
        createDto,
        'user_123',
        undefined,
      );

      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: {
          url: createDto.url,
          secret: 'whsec_test_secret',
          description: createDto.description,
          events: createDto.events,
          isActive: true,
          metadata: createDto.metadata,
          userId: 'user_123',
          organizationId: undefined,
        },
      });

      expect(result).toEqual(mockWebhook);
      expect(result.secret).toBe('whsec_test_secret');
    });

    it('should set isActive to true by default', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
      };

      prisma.webhook.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(createDto, 'user_123');

      expect(prisma.webhook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should create webhook with organizationId', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
      };

      prisma.webhook.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(createDto, undefined, 'org_123');

      expect(prisma.webhook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org_123',
          }),
        }),
      );
    });
  });

  describe('getWebhooks', () => {
    it('should return all webhooks for a user without secrets', async () => {
      const webhooks = [mockWebhook, { ...mockWebhook, id: 'webhook_456' }];
      prisma.webhook.findMany.mockResolvedValue(webhooks as any);

      const result = await service.getWebhooks('user_123');

      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('secret');
      expect(result[1]).not.toHaveProperty('secret');
    });

    it('should filter by organizationId', async () => {
      prisma.webhook.findMany.mockResolvedValue([mockWebhook] as any);

      await service.getWebhooks(undefined, 'org_123');

      expect(prisma.webhook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_123' },
        }),
      );
    });

    it('should return empty array when no webhooks exist', async () => {
      prisma.webhook.findMany.mockResolvedValue([]);

      const result = await service.getWebhooks('user_123');

      expect(result).toEqual([]);
    });
  });

  describe('getWebhook', () => {
    it('should return a webhook by ID without secret', async () => {
      prisma.webhook.findUnique.mockResolvedValue(mockWebhook as any);

      const result = await service.getWebhook('webhook_123');

      expect(prisma.webhook.findUnique).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
      });

      expect(result).not.toHaveProperty('secret');
      expect(result.id).toBe('webhook_123');
    });

    it('should throw NotFoundException when webhook not found', async () => {
      prisma.webhook.findUnique.mockResolvedValue(null);

      await expect(service.getWebhook('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook properties', async () => {
      const updateDto = {
        url: 'https://new-url.com/webhook',
        description: 'Updated description',
        events: ['payment.succeeded'],
        isActive: false,
        metadata: { version: '2.0' },
      };

      prisma.webhook.update.mockResolvedValue({
        ...mockWebhook,
        ...updateDto,
      } as any);

      const result = await service.updateWebhook('webhook_123', updateDto);

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
        data: updateDto,
      });

      expect(result).not.toHaveProperty('secret');
      expect(result.url).toBe(updateDto.url);
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        isActive: false,
      };

      prisma.webhook.update.mockResolvedValue({
        ...mockWebhook,
        isActive: false,
      } as any);

      await service.updateWebhook('webhook_123', updateDto);

      expect(prisma.webhook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      prisma.webhook.delete.mockResolvedValue(mockWebhook as any);

      const result = await service.deleteWebhook('webhook_123');

      expect(prisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
      });

      expect(result).toEqual({
        success: true,
        message: 'Webhook deleted successfully',
      });
    });
  });

  describe('rotateSecret', () => {
    it('should rotate webhook secret and return new secret', async () => {
      const newSecret = 'whsec_new_secret';
      (generateWebhookSecret as jest.Mock).mockReturnValue(newSecret);

      prisma.webhook.update.mockResolvedValue({
        ...mockWebhook,
        secret: newSecret,
      } as any);

      const result = await service.rotateSecret('webhook_123');

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook_123' },
        data: { secret: newSecret },
      });

      expect(result).toEqual({
        success: true,
        secret: newSecret,
      });
    });
  });

  describe('triggerEvent', () => {
    it('should log event and trigger webhooks for subscribed endpoints', async () => {
      const event = {
        eventType: 'order.created',
        eventId: 'evt_123',
        payload: { order: { id: 'order_123' } },
        source: 'order_service',
        triggeredBy: 'user_123',
      };

      const subscribedWebhooks = [
        mockWebhook,
        { ...mockWebhook, id: 'webhook_456' },
      ];

      prisma.webhookEventLog.create.mockResolvedValue(mockEventLog as any);
      prisma.webhook.findMany.mockResolvedValue(subscribedWebhooks as any);
      prisma.webhookDelivery.create.mockResolvedValue(mockDelivery as any);
      prisma.webhookEventLog.update.mockResolvedValue(mockEventLog as any);

      const result = await service.triggerEvent(event);

      expect(prisma.webhookEventLog.create).toHaveBeenCalledWith({
        data: {
          eventType: event.eventType,
          eventId: event.eventId,
          payload: event.payload,
          source: event.source,
          triggeredBy: event.triggeredBy,
          metadata: {},
        },
      });

      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          events: {
            has: event.eventType,
          },
        },
      });

      expect(prisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
      expect(queue.add).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        webhooksTriggered: 2,
        deliveries: expect.arrayContaining([mockDelivery.id, mockDelivery.id]),
      });
    });

    it('should handle case when no webhooks are subscribed', async () => {
      const event = {
        eventType: 'unknown.event',
        eventId: 'evt_unknown',
        payload: {},
      };

      prisma.webhookEventLog.create.mockResolvedValue(mockEventLog as any);
      prisma.webhook.findMany.mockResolvedValue([]);
      prisma.webhookEventLog.update.mockResolvedValue(mockEventLog as any);

      const result = await service.triggerEvent(event);

      expect(prisma.webhookEventLog.update).toHaveBeenCalledWith({
        where: { id: mockEventLog.id },
        data: { processed: true, processedAt: expect.any(Date) },
      });

      expect(result).toEqual({ webhooksTriggered: 0 });
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should queue deliveries with correct job data', async () => {
      const event = {
        eventType: 'order.created',
        eventId: 'evt_123',
        payload: { order: { id: 'order_123' } },
      };

      prisma.webhookEventLog.create.mockResolvedValue(mockEventLog as any);
      prisma.webhook.findMany.mockResolvedValue([mockWebhook] as any);
      prisma.webhookDelivery.create.mockResolvedValue(mockDelivery as any);
      prisma.webhookEventLog.update.mockResolvedValue(mockEventLog as any);

      await service.triggerEvent(event);

      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        {
          deliveryId: mockDelivery.id,
          webhookId: mockWebhook.id,
          url: mockWebhook.url,
          secret: mockWebhook.secret,
          eventType: event.eventType,
          eventId: event.eventId,
          payload: event.payload,
          attempt: 1,
        },
        {
          delay: 0,
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    });
  });

  describe('retryDelivery', () => {
    it('should retry a failed delivery', async () => {
      const failedDelivery = {
        ...mockDelivery,
        status: WebhookDeliveryStatus.FAILED,
        webhook: mockWebhook,
      };

      prisma.webhookDelivery.findUnique.mockResolvedValue(
        failedDelivery as any,
      );
      prisma.webhookDelivery.update.mockResolvedValue(mockDelivery as any);

      const result = await service.retryDelivery('delivery_123');

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'delivery_123' },
        data: {
          status: WebhookDeliveryStatus.PENDING,
          attempts: 0,
          errorMessage: null,
        },
      });

      expect(queue.add).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Delivery retry queued',
      });
    });

    it('should throw error when retrying successful delivery', async () => {
      const successfulDelivery = {
        ...mockDelivery,
        status: WebhookDeliveryStatus.DELIVERED,
        webhook: mockWebhook,
      };

      prisma.webhookDelivery.findUnique.mockResolvedValue(
        successfulDelivery as any,
      );

      await expect(service.retryDelivery('delivery_123')).rejects.toThrow(
        'Cannot retry a successful delivery',
      );
    });

    it('should throw NotFoundException when delivery not found', async () => {
      prisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await expect(service.retryDelivery('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('handleDeliveryFailure', () => {
    it('should schedule retry when under max attempts', async () => {
      const delivery = {
        ...mockDelivery,
        attempts: 2,
        webhook: mockWebhook,
      };

      prisma.webhookDelivery.findUnique.mockResolvedValue(delivery as any);
      prisma.webhookDelivery.update.mockResolvedValue(delivery as any);

      await service.handleDeliveryFailure(
        'delivery_123',
        500,
        'Internal Server Error',
        'Error details',
      );

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'delivery_123' },
        data: {
          attempts: 3,
          statusCode: 500,
          errorMessage: 'Internal Server Error',
          responseBody: 'Error details',
          lastAttemptAt: expect.any(Date),
        },
      });

      expect(queue.add).toHaveBeenCalled();
    });

    it('should move to dead letter queue after max attempts', async () => {
      const delivery = {
        ...mockDelivery,
        attempts: 4,
        webhook: mockWebhook,
      };

      prisma.webhookDelivery.findUnique.mockResolvedValue(delivery as any);
      prisma.webhookDeadLetter.create.mockResolvedValue({} as any);
      prisma.webhookDelivery.update.mockResolvedValue(delivery as any);

      await service.handleDeliveryFailure(
        'delivery_123',
        500,
        'Internal Server Error',
      );

      expect(prisma.webhookDeadLetter.create).toHaveBeenCalledWith({
        data: {
          webhookId: delivery.webhookId,
          originalDeliveryId: 'delivery_123',
          eventType: delivery.eventType,
          eventId: delivery.eventId,
          payload: delivery.payload,
          errorMessage: 'Internal Server Error',
          statusCode: 500,
          responseBody: undefined,
          attemptsMade: 5,
          lastAttemptAt: expect.any(Date),
          metadata: delivery.metadata,
        },
      });

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'delivery_123' },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          attempts: 5,
          statusCode: 500,
          errorMessage: 'Internal Server Error',
          responseBody: undefined,
          failedAt: expect.any(Date),
          lastAttemptAt: expect.any(Date),
        },
      });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should handle delivery not found gracefully', async () => {
      prisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await expect(
        service.handleDeliveryFailure('nonexistent', 500, 'Error'),
      ).resolves.not.toThrow();
    });
  });

  describe('handleDeliverySuccess', () => {
    it('should mark delivery as successful', async () => {
      prisma.webhookDelivery.update.mockResolvedValue(mockDelivery as any);

      await service.handleDeliverySuccess(
        'delivery_123',
        200,
        'Success response',
      );

      expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: 'delivery_123' },
        data: {
          status: WebhookDeliveryStatus.DELIVERED,
          statusCode: 200,
          responseBody: 'Success response',
          deliveredAt: expect.any(Date),
          lastAttemptAt: expect.any(Date),
        },
      });
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return paginated delivery history', async () => {
      const deliveries = [mockDelivery, { ...mockDelivery, id: 'delivery_456' }];

      prisma.webhookDelivery.findMany.mockResolvedValue(deliveries as any);
      prisma.webhookDelivery.count.mockResolvedValue(2);

      const result = await service.getDeliveryHistory('webhook_123', 10, 0);

      expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: 'webhook_123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        deliveries,
        total: 2,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      const stats = [
        { status: WebhookDeliveryStatus.DELIVERED, _count: 10 },
        { status: WebhookDeliveryStatus.FAILED, _count: 2 },
        { status: WebhookDeliveryStatus.PENDING, _count: 1 },
      ];

      prisma.webhookDelivery.groupBy.mockResolvedValue(stats as any);

      const result = await service.getDeliveryStats('webhook_123');

      expect(result).toEqual({
        PENDING: 1,
        DELIVERED: 10,
        FAILED: 2,
        RETRYING: 0,
      });
    });
  });

  describe('getDeadLetterQueue', () => {
    it('should return paginated dead letter queue entries', async () => {
      const entries = [
        {
          id: 'dl_123',
          webhookId: 'webhook_123',
          eventType: 'order.created',
        },
      ];

      prisma.webhookDeadLetter.findMany.mockResolvedValue(entries as any);
      prisma.webhookDeadLetter.count.mockResolvedValue(1);

      const result = await service.getDeadLetterQueue(50, 0);

      expect(result).toEqual({
        entries,
        total: 1,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('retryFromDeadLetter', () => {
    it('should create new delivery from dead letter entry', async () => {
      const deadLetter = {
        id: 'dl_123',
        webhookId: 'webhook_123',
        eventType: 'order.created',
        eventId: 'evt_123',
        payload: { order: { id: 'order_123' } },
        metadata: {},
        retriedAt: null,
      };

      prisma.webhookDeadLetter.findUnique.mockResolvedValue(
        deadLetter as any,
      );
      prisma.webhook.findUnique.mockResolvedValue(mockWebhook as any);
      prisma.webhookDelivery.create.mockResolvedValue(mockDelivery as any);
      prisma.webhookDeadLetter.update.mockResolvedValue(deadLetter as any);

      const result = await service.retryFromDeadLetter('dl_123');

      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: 'webhook_123',
          eventType: 'order.created',
          metadata: expect.objectContaining({
            retriedFromDeadLetter: true,
            originalDeadLetterId: 'dl_123',
          }),
        }),
      });

      expect(prisma.webhookDeadLetter.update).toHaveBeenCalledWith({
        where: { id: 'dl_123' },
        data: { retriedAt: expect.any(Date) },
      });

      expect(result).toEqual({
        success: true,
        deliveryId: mockDelivery.id,
      });
    });

    it('should throw NotFoundException when dead letter entry not found', async () => {
      prisma.webhookDeadLetter.findUnique.mockResolvedValue(null);

      await expect(service.retryFromDeadLetter('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when webhook not found', async () => {
      const deadLetter = {
        id: 'dl_123',
        webhookId: 'webhook_123',
        eventType: 'order.created',
      };

      prisma.webhookDeadLetter.findUnique.mockResolvedValue(
        deadLetter as any,
      );
      prisma.webhook.findUnique.mockResolvedValue(null);

      await expect(service.retryFromDeadLetter('dl_123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Retry Schedule', () => {
    it('should use correct retry delays for each attempt', async () => {
      const delivery = {
        ...mockDelivery,
        attempts: 1,
        webhook: mockWebhook,
      };

      prisma.webhookDelivery.findUnique.mockResolvedValue(delivery as any);
      prisma.webhookDelivery.update.mockResolvedValue(delivery as any);

      // Attempt 2 should have 5 minutes delay
      await service.handleDeliveryFailure('delivery_123', 500, 'Error');

      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({
          attempt: 2,
        }),
        expect.objectContaining({
          delay: 5 * 60 * 1000, // 5 minutes
        }),
      );
    });
  });
});
