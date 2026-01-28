import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { NotFoundException } from '@nestjs/common';
import { WebhookDeliveryStatus } from './webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: jest.Mocked<WebhookService>;

  const mockRequest = {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      role: 'CUSTOMER',
      organizationId: 'org_123',
    },
  };

  const mockWebhook = {
    id: 'webhook_123',
    url: 'https://example.com/webhook',
    description: 'Test webhook',
    events: ['order.created', 'order.updated'],
    isActive: true,
    metadata: { env: 'test' },
    userId: 'user_123',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { deliveries: 5 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            createWebhook: jest.fn(),
            getWebhooks: jest.fn(),
            getWebhook: jest.fn(),
            updateWebhook: jest.fn(),
            deleteWebhook: jest.fn(),
            rotateSecret: jest.fn(),
            getDeliveryHistory: jest.fn(),
            getDeliveryStats: jest.fn(),
            retryDelivery: jest.fn(),
            getDeadLetterQueue: jest.fn(),
            retryFromDeadLetter: jest.fn(),
            triggerEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    service = module.get(WebhookService) as jest.Mocked<WebhookService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a webhook with userId and organizationId from request', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        description: 'Test webhook',
        events: ['order.created', 'order.updated'],
        isActive: true,
        metadata: { env: 'test' },
      };

      const webhookWithSecret = {
        ...mockWebhook,
        secret: 'whsec_test_secret',
      };

      service.createWebhook.mockResolvedValue(webhookWithSecret);

      const result = await controller.createWebhook(createDto, mockRequest as any);

      expect(service.createWebhook).toHaveBeenCalledWith(
        createDto,
        'user_123',
        'org_123',
      );

      expect(result).toEqual(webhookWithSecret);
      expect(result.secret).toBe('whsec_test_secret');
    });

    it('should handle request without organizationId', async () => {
      const createDto = {
        url: 'https://example.com/webhook',
        events: ['order.created'],
      };

      const reqWithoutOrg = {
        user: {
          id: 'user_123',
        },
      };

      service.createWebhook.mockResolvedValue(mockWebhook as any);

      await controller.createWebhook(createDto, reqWithoutOrg as any);

      expect(service.createWebhook).toHaveBeenCalledWith(
        createDto,
        'user_123',
        undefined,
      );
    });
  });

  describe('getWebhooks', () => {
    it('should get all webhooks for the current user', async () => {
      const webhooks = [mockWebhook, { ...mockWebhook, id: 'webhook_456' }];
      service.getWebhooks.mockResolvedValue(webhooks as any);

      const result = await controller.getWebhooks(mockRequest as any);

      expect(service.getWebhooks).toHaveBeenCalledWith('user_123', 'org_123');
      expect(result).toEqual(webhooks);
    });

    it('should return empty array when user has no webhooks', async () => {
      service.getWebhooks.mockResolvedValue([]);

      const result = await controller.getWebhooks(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe('getWebhook', () => {
    it('should get a webhook by ID', async () => {
      service.getWebhook.mockResolvedValue(mockWebhook as any);

      const result = await controller.getWebhook('webhook_123');

      expect(service.getWebhook).toHaveBeenCalledWith('webhook_123');
      expect(result).toEqual(mockWebhook);
    });

    it('should throw NotFoundException when webhook not found', async () => {
      service.getWebhook.mockRejectedValue(
        new NotFoundException('Webhook webhook_123 not found'),
      );

      await expect(controller.getWebhook('webhook_123')).rejects.toThrow(
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
      };

      const updatedWebhook = {
        ...mockWebhook,
        ...updateDto,
      };

      service.updateWebhook.mockResolvedValue(updatedWebhook as any);

      const result = await controller.updateWebhook('webhook_123', updateDto);

      expect(service.updateWebhook).toHaveBeenCalledWith(
        'webhook_123',
        updateDto,
      );
      expect(result).toEqual(updatedWebhook);
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        isActive: false,
      };

      service.updateWebhook.mockResolvedValue({
        ...mockWebhook,
        isActive: false,
      } as any);

      await controller.updateWebhook('webhook_123', updateDto);

      expect(service.updateWebhook).toHaveBeenCalledWith('webhook_123', {
        isActive: false,
      });
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      const deleteResult = {
        success: true,
        message: 'Webhook deleted successfully',
      };

      service.deleteWebhook.mockResolvedValue(deleteResult);

      const result = await controller.deleteWebhook('webhook_123');

      expect(service.deleteWebhook).toHaveBeenCalledWith('webhook_123');
      expect(result).toEqual(deleteResult);
    });
  });

  describe('rotateSecret', () => {
    it('should rotate webhook secret', async () => {
      const rotateResult = {
        success: true,
        secret: 'whsec_new_secret',
      };

      service.rotateSecret.mockResolvedValue(rotateResult);

      const result = await controller.rotateSecret('webhook_123');

      expect(service.rotateSecret).toHaveBeenCalledWith('webhook_123');
      expect(result).toEqual(rotateResult);
    });
  });

  describe('getDeliveryHistory', () => {
    it('should get delivery history with default pagination', async () => {
      const deliveryHistory = {
        deliveries: [
          {
            id: 'delivery_123',
            webhookId: 'webhook_123',
            status: WebhookDeliveryStatus.SUCCESS,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      service.getDeliveryHistory.mockResolvedValue(deliveryHistory as any);

      const result = await controller.getDeliveryHistory(
        'webhook_123',
        undefined,
        undefined,
      );

      expect(service.getDeliveryHistory).toHaveBeenCalledWith(
        'webhook_123',
        50,
        0,
      );
      expect(result).toEqual(deliveryHistory);
    });

    it('should get delivery history with custom pagination', async () => {
      const deliveryHistory = {
        deliveries: [],
        total: 100,
        limit: 10,
        offset: 20,
      };

      service.getDeliveryHistory.mockResolvedValue(deliveryHistory as any);

      const result = await controller.getDeliveryHistory(
        'webhook_123',
        10,
        20,
      );

      expect(service.getDeliveryHistory).toHaveBeenCalledWith(
        'webhook_123',
        10,
        20,
      );
      expect(result).toEqual(deliveryHistory);
    });

    it('should parse string pagination params to numbers', async () => {
      service.getDeliveryHistory.mockResolvedValue({
        deliveries: [],
        total: 0,
        limit: 25,
        offset: 5,
      } as any);

      await controller.getDeliveryHistory('webhook_123', '25' as any, '5' as any);

      expect(service.getDeliveryHistory).toHaveBeenCalledWith(
        'webhook_123',
        25,
        5,
      );
    });
  });

  describe('getDeliveryStats', () => {
    it('should get delivery statistics', async () => {
      const stats = {
        PENDING: 2,
        DELIVERED: 10,
        FAILED: 1,
        RETRYING: 0,
      };

      service.getDeliveryStats.mockResolvedValue(stats as any);

      const result = await controller.getDeliveryStats('webhook_123');

      expect(service.getDeliveryStats).toHaveBeenCalledWith('webhook_123');
      expect(result).toEqual(stats);
    });
  });

  describe('retryDelivery', () => {
    it('should retry a failed delivery', async () => {
      const retryDto = {
        deliveryId: 'delivery_123',
      };

      const retryResult = {
        success: true,
        message: 'Delivery retry queued',
      };

      service.retryDelivery.mockResolvedValue(retryResult);

      const result = await controller.retryDelivery(retryDto);

      expect(service.retryDelivery).toHaveBeenCalledWith('delivery_123');
      expect(result).toEqual(retryResult);
    });

    it('should throw error when retrying successful delivery', async () => {
      const retryDto = {
        deliveryId: 'delivery_123',
      };

      service.retryDelivery.mockRejectedValue(
        new Error('Cannot retry a successful delivery'),
      );

      await expect(controller.retryDelivery(retryDto)).rejects.toThrow(
        'Cannot retry a successful delivery',
      );
    });
  });

  describe('getDeadLetterQueue', () => {
    it('should get dead letter queue entries with default pagination', async () => {
      const dlqEntries = {
        entries: [
          {
            id: 'dl_123',
            webhookId: 'webhook_123',
            eventType: 'order.created',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      service.getDeadLetterQueue.mockResolvedValue(dlqEntries as any);

      const result = await controller.getDeadLetterQueue(
        undefined,
        undefined,
      );

      expect(service.getDeadLetterQueue).toHaveBeenCalledWith(50, 0);
      expect(result).toEqual(dlqEntries);
    });

    it('should get dead letter queue entries with custom pagination', async () => {
      service.getDeadLetterQueue.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 20,
        offset: 10,
      } as any);

      await controller.getDeadLetterQueue(20, 10);

      expect(service.getDeadLetterQueue).toHaveBeenCalledWith(20, 10);
    });
  });

  describe('retryFromDeadLetter', () => {
    it('should retry from dead letter queue', async () => {
      const retryDto = {
        deadLetterId: 'dl_123',
      };

      const retryResult = {
        success: true,
        deliveryId: 'delivery_456',
      };

      service.retryFromDeadLetter.mockResolvedValue(retryResult);

      const result = await controller.retryFromDeadLetter(retryDto);

      expect(service.retryFromDeadLetter).toHaveBeenCalledWith('dl_123');
      expect(result).toEqual(retryResult);
    });

    it('should throw NotFoundException when dead letter entry not found', async () => {
      const retryDto = {
        deadLetterId: 'nonexistent',
      };

      service.retryFromDeadLetter.mockRejectedValue(
        new NotFoundException('Dead letter entry nonexistent not found'),
      );

      await expect(
        controller.retryFromDeadLetter(retryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('triggerTestEvent', () => {
    it('should trigger a test webhook event', async () => {
      const eventDto = {
        eventType: 'test.event',
        eventId: 'evt_test_123',
        payload: { test: true },
        source: 'test',
        triggeredBy: 'admin_123',
      };

      const triggerResult = {
        webhooksTriggered: 2,
        deliveries: ['delivery_123', 'delivery_456'],
      };

      service.triggerEvent.mockResolvedValue(triggerResult);

      const result = await controller.triggerTestEvent(eventDto);

      expect(service.triggerEvent).toHaveBeenCalledWith(eventDto);
      expect(result).toEqual(triggerResult);
    });

    it('should handle event with no subscribed webhooks', async () => {
      const eventDto = {
        eventType: 'unknown.event',
        eventId: 'evt_unknown',
        payload: {},
      };

      service.triggerEvent.mockResolvedValue({
        webhooksTriggered: 0,
      });

      const result = await controller.triggerTestEvent(eventDto);

      expect(result).toEqual({
        webhooksTriggered: 0,
      });
    });
  });

  describe('Request User Handling', () => {
    it('should handle request without user object', async () => {
      const emptyRequest = {};

      service.createWebhook.mockResolvedValue(mockWebhook as any);

      await controller.createWebhook(
        { url: 'https://example.com', events: [] },
        emptyRequest as any,
      );

      expect(service.createWebhook).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        undefined,
      );
    });

    it('should handle request with partial user object', async () => {
      const partialUserRequest = {
        user: {
          id: 'user_123',
          // no organizationId
        },
      };

      service.getWebhooks.mockResolvedValue([]);

      await controller.getWebhooks(partialUserRequest as any);

      expect(service.getWebhooks).toHaveBeenCalledWith('user_123', undefined);
    });
  });
});
