import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventsService } from './webhook-events.service';
import { WebhookService } from './webhook.service';

describe('WebhookEventsService', () => {
  let service: WebhookEventsService;
  let webhookService: jest.Mocked<WebhookService>;

  const mockTriggerResult = {
    webhooksTriggered: 2,
    deliveries: ['delivery_123', 'delivery_456'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventsService,
        {
          provide: WebhookService,
          useValue: {
            triggerEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookEventsService>(WebhookEventsService);
    webhookService = module.get(WebhookService) as jest.Mocked<WebhookService>;

    webhookService.triggerEvent.mockResolvedValue(mockTriggerResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Events', () => {
    it('should handle order.created event', async () => {
      const payload = {
        order: { id: 'order_123', total: 100 },
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.created',
          eventId: expect.stringMatching(/^evt_order_created_/),
          payload,
          source: 'order_service',
          triggeredBy: 'user_123',
        }),
      );
    });

    it('should handle order.updated event', async () => {
      const payload = {
        order: { id: 'order_123', status: 'PROCESSING' },
        userId: 'user_123',
      };

      await service.handleOrderUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.updated',
          payload,
          source: 'order_service',
          triggeredBy: 'user_123',
        }),
      );
    });

    it('should handle order.cancelled event', async () => {
      const payload = {
        order: { id: 'order_123', status: 'CANCELLED' },
        userId: 'user_123',
      };

      await service.handleOrderCancelled(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.cancelled',
          payload,
          source: 'order_service',
        }),
      );
    });

    it('should handle order.fulfilled event', async () => {
      const payload = {
        order: { id: 'order_123', status: 'FULFILLED' },
        userId: 'user_123',
      };

      await service.handleOrderFulfilled(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.fulfilled',
          payload,
          source: 'order_service',
        }),
      );
    });

    it('should handle order.shipped event', async () => {
      const payload = {
        order: { id: 'order_123', trackingNumber: 'TRACK123' },
        userId: 'user_123',
      };

      await service.handleOrderShipped(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.shipped',
          payload,
          source: 'shipping_service',
        }),
      );
    });

    it('should handle order.delivered event', async () => {
      const payload = {
        order: { id: 'order_123', deliveredAt: new Date() },
        userId: 'user_123',
      };

      await service.handleOrderDelivered(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.delivered',
          payload,
          source: 'shipping_service',
        }),
      );
    });
  });

  describe('Payment Events', () => {
    it('should handle payment.succeeded event', async () => {
      const payload = {
        payment: { id: 'payment_123', amount: 100 },
        userId: 'user_123',
      };

      await service.handlePaymentSucceeded(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.succeeded',
          payload,
          source: 'payment_service',
          triggeredBy: 'user_123',
        }),
      );
    });

    it('should handle payment.failed event', async () => {
      const payload = {
        payment: { id: 'payment_123', error: 'Card declined' },
        userId: 'user_123',
      };

      await service.handlePaymentFailed(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.failed',
          payload,
          source: 'payment_service',
        }),
      );
    });

    it('should handle payment.refunded event', async () => {
      const payload = {
        payment: { id: 'payment_123', refundAmount: 100 },
        userId: 'user_123',
      };

      await service.handlePaymentRefunded(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.refunded',
          payload,
          source: 'payment_service',
        }),
      );
    });
  });

  describe('Product Events', () => {
    it('should handle product.created event', async () => {
      const payload = {
        product: { id: 'product_123', name: 'New Product' },
        userId: 'user_123',
      };

      await service.handleProductCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'product.created',
          payload,
          source: 'product_service',
        }),
      );
    });

    it('should handle product.updated event', async () => {
      const payload = {
        product: { id: 'product_123', price: 99.99 },
        userId: 'user_123',
      };

      await service.handleProductUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'product.updated',
          payload,
          source: 'product_service',
        }),
      );
    });

    it('should handle product.deleted event', async () => {
      const payload = {
        product: { id: 'product_123' },
        userId: 'user_123',
      };

      await service.handleProductDeleted(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'product.deleted',
          payload,
          source: 'product_service',
        }),
      );
    });

    it('should handle product.out_of_stock event', async () => {
      const payload = {
        product: { id: 'product_123', stock: 0 },
        userId: 'user_123',
      };

      await service.handleProductOutOfStock(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'product.out_of_stock',
          payload,
          source: 'inventory_service',
        }),
      );
    });

    it('should handle product.low_stock event', async () => {
      const payload = {
        product: { id: 'product_123', stock: 5 },
        userId: 'user_123',
      };

      await service.handleProductLowStock(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'product.low_stock',
          payload,
          source: 'inventory_service',
        }),
      );
    });
  });

  describe('User Events', () => {
    it('should handle user.created event', async () => {
      const payload = {
        user: { id: 'user_123', email: 'test@example.com' },
      };

      await service.handleUserCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.created',
          payload,
          source: 'user_service',
        }),
      );
    });

    it('should handle user.updated event', async () => {
      const payload = {
        user: { id: 'user_123', name: 'Updated Name' },
      };

      await service.handleUserUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.updated',
          payload,
          source: 'user_service',
          triggeredBy: 'user_123',
        }),
      );
    });

    it('should handle user.deleted event', async () => {
      const payload = {
        user: { id: 'user_123' },
      };

      await service.handleUserDeleted(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.deleted',
          payload,
          source: 'user_service',
        }),
      );
    });
  });

  describe('Cart Events', () => {
    it('should handle cart.abandoned event', async () => {
      const payload = {
        cart: { id: 'cart_123', items: [] },
        userId: 'user_123',
      };

      await service.handleCartAbandoned(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cart.abandoned',
          payload,
          source: 'cart_service',
          triggeredBy: 'user_123',
        }),
      );
    });

    it('should handle cart.recovered event', async () => {
      const payload = {
        cart: { id: 'cart_123' },
        userId: 'user_123',
      };

      await service.handleCartRecovered(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cart.recovered',
          payload,
          source: 'cart_service',
        }),
      );
    });
  });

  describe('Inventory Events', () => {
    it('should handle inventory.updated event', async () => {
      const payload = {
        productId: 'product_123',
        newStock: 50,
        userId: 'user_123',
      };

      await service.handleInventoryUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'inventory.updated',
          payload,
          source: 'inventory_service',
        }),
      );
    });

    it('should handle inventory.restocked event', async () => {
      const payload = {
        productId: 'product_123',
        addedStock: 100,
        userId: 'user_123',
      };

      await service.handleInventoryRestocked(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'inventory.restocked',
          payload,
          source: 'inventory_service',
        }),
      );
    });
  });

  describe('Subscription Events', () => {
    it('should handle subscription.created event', async () => {
      const payload = {
        subscription: { id: 'sub_123', plan: 'premium' },
        userId: 'user_123',
      };

      await service.handleSubscriptionCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'subscription.created',
          payload,
          source: 'subscription_service',
        }),
      );
    });

    it('should handle subscription.updated event', async () => {
      const payload = {
        subscription: { id: 'sub_123', plan: 'enterprise' },
        userId: 'user_123',
      };

      await service.handleSubscriptionUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'subscription.updated',
          payload,
          source: 'subscription_service',
        }),
      );
    });

    it('should handle subscription.cancelled event', async () => {
      const payload = {
        subscription: { id: 'sub_123', cancelledAt: new Date() },
        userId: 'user_123',
      };

      await service.handleSubscriptionCancelled(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'subscription.cancelled',
          payload,
          source: 'subscription_service',
        }),
      );
    });
  });

  describe('Review Events', () => {
    it('should handle review.created event', async () => {
      const payload = {
        review: { id: 'review_123', rating: 5 },
        userId: 'user_123',
      };

      await service.handleReviewCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'review.created',
          payload,
          source: 'review_service',
        }),
      );
    });

    it('should handle review.updated event', async () => {
      const payload = {
        review: { id: 'review_123', rating: 4 },
        userId: 'user_123',
      };

      await service.handleReviewUpdated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'review.updated',
          payload,
          source: 'review_service',
        }),
      );
    });
  });

  describe('Return Events', () => {
    it('should handle return.requested event', async () => {
      const payload = {
        return: { id: 'return_123', orderId: 'order_123' },
        userId: 'user_123',
      };

      await service.handleReturnRequested(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'return.requested',
          payload,
          source: 'return_service',
        }),
      );
    });

    it('should handle return.approved event', async () => {
      const payload = {
        return: { id: 'return_123', status: 'APPROVED' },
        userId: 'user_123',
      };

      await service.handleReturnApproved(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'return.approved',
          payload,
          source: 'return_service',
        }),
      );
    });

    it('should handle return.rejected event', async () => {
      const payload = {
        return: { id: 'return_123', status: 'REJECTED' },
        userId: 'user_123',
      };

      await service.handleReturnRejected(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'return.rejected',
          payload,
          source: 'return_service',
        }),
      );
    });
  });

  describe('Event ID Generation', () => {
    it('should generate unique event IDs', async () => {
      const payload = {
        order: { id: 'order_123' },
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);
      await service.handleOrderCreated(payload);

      const calls = webhookService.triggerEvent.mock.calls;
      const eventId1 = calls[0][0].eventId;
      const eventId2 = calls[1][0].eventId;

      expect(eventId1).not.toBe(eventId2);
      expect(eventId1).toMatch(/^evt_order_created_\d+_/);
      expect(eventId2).toMatch(/^evt_order_created_\d+_/);
    });

    it('should format event IDs correctly', async () => {
      const payload = {
        payment: { id: 'payment_123' },
        userId: 'user_123',
      };

      await service.handlePaymentSucceeded(payload);

      const eventId = webhookService.triggerEvent.mock.calls[0][0].eventId;

      // Event ID should be: evt_{eventType_with_underscores}_{timestamp}_{random}
      expect(eventId).toMatch(/^evt_payment_succeeded_\d+_[a-z0-9]+$/);
    });
  });

  describe('Error Handling', () => {
    it('should catch and log errors when triggering webhooks', async () => {
      const error = new Error('Failed to trigger webhook');
      webhookService.triggerEvent.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const payload = {
        order: { id: 'order_123' },
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to trigger webhook for order.created'),
        error.stack,
      );
    });

    it('should not throw errors when webhook triggering fails', async () => {
      webhookService.triggerEvent.mockRejectedValue(
        new Error('Webhook trigger failed'),
      );

      const payload = {
        product: { id: 'product_123' },
        userId: 'user_123',
      };

      await expect(
        service.handleProductCreated(payload),
      ).resolves.not.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should use default source value when not provided', async () => {
      const payload = {
        order: { id: 'order_123' },
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);

      const eventDto = webhookService.triggerEvent.mock.calls[0][0];
      expect(eventDto.source).toBe('order_service');
    });

    it('should handle missing userId gracefully', async () => {
      const payload = {
        user: { id: 'user_123', email: 'test@example.com' },
        // no userId field
      };

      await service.handleUserCreated(payload);

      expect(webhookService.triggerEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'user.created',
          payload,
          source: 'user_service',
          triggeredBy: undefined,
        }),
      );
    });
  });

  describe('Logging', () => {
    it('should log debug message for each event', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      const payload = {
        order: { id: 'order_123' },
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Order created event received',
        'order_123',
      );
    });

    it('should log event details even when order id is missing', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      const payload = {
        order: {}, // no id
        userId: 'user_123',
      };

      await service.handleOrderCreated(payload);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Order created event received',
        undefined,
      );
    });
  });
});
