import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;
  let ordersService: OrdersService;

  const mockPaymentsService = {
    createPaymentIntent: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const mockOrdersService = {
    updateOrderPayment: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    ordersService = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with orderId', async () => {
      const mockRequest = { user: mockUser };
      const dto = {
        amount: 1000,
        currency: 'usd',
        orderId: 'order-123',
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 1000,
      };

      mockPaymentsService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await controller.createPaymentIntent(mockRequest, dto);

      expect(result).toEqual(mockPaymentIntent);
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'usd',
        {
          userId: 'user-123',
          orderId: 'order-123',
        }
      );
    });

    it('should create payment intent without orderId', async () => {
      const mockRequest = { user: mockUser };
      const dto = {
        amount: 500,
        currency: 'usd',
      };

      const mockPaymentIntent = {
        id: 'pi_456',
        client_secret: 'secret_456',
        amount: 500,
      };

      mockPaymentsService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await controller.createPaymentIntent(mockRequest, dto);

      expect(result).toEqual(mockPaymentIntent);
      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        500,
        'usd',
        {
          userId: 'user-123',
        }
      );
    });

    it('should use default currency if not provided', async () => {
      const mockRequest = { user: mockUser };
      const dto = {
        amount: 750,
      };

      mockPaymentsService.createPaymentIntent.mockResolvedValue({});

      await controller.createPaymentIntent(mockRequest, dto);

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        750,
        'usd',
        expect.any(Object)
      );
    });

    it('should include userId in metadata', async () => {
      const mockRequest = { user: { id: 'user-456' } };
      const dto = {
        amount: 1200,
        currency: 'eur',
      };

      mockPaymentsService.createPaymentIntent.mockResolvedValue({});

      await controller.createPaymentIntent(mockRequest, dto);

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        1200,
        'eur',
        {
          userId: 'user-456',
        }
      );
    });
  });

  describe('handleWebhook', () => {
    it('should return false when signature is missing', async () => {
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const result = await controller.handleWebhook('', mockRequest);

      expect(result).toEqual({ received: false });
      expect(mockPaymentsService.constructWebhookEvent).not.toHaveBeenCalled();
    });

    it('should handle payment_intent.succeeded event', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: {
              orderId: 'order-123',
            },
            payment_method_types: ['card'],
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockOrdersService.updateOrderPayment.mockResolvedValue({});

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
      expect(mockPaymentsService.constructWebhookEvent).toHaveBeenCalledWith(
        mockRequest.rawBody,
        signature
      );
      expect(mockOrdersService.updateOrderPayment).toHaveBeenCalledWith(
        'order-123',
        'pi_123',
        'card'
      );
    });

    it('should handle payment_intent.succeeded without orderId', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_456',
            metadata: {},
            payment_method_types: ['card'],
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
      expect(mockOrdersService.updateOrderPayment).not.toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_789',
            metadata: {
              orderId: 'order-456',
            },
            last_payment_error: {
              message: 'Card declined',
            },
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
      expect(mockPaymentsService.constructWebhookEvent).toHaveBeenCalled();
    });

    it('should handle payment_intent.canceled event', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.canceled',
        data: {
          object: {
            id: 'pi_canceled',
            metadata: {},
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
    });

    it('should handle unhandled event types', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'customer.created',
        data: {
          object: {},
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
    });

    it('should handle webhook construction errors', async () => {
      const signature = 'invalid-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      mockPaymentsService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: false });
    });

    it('should handle order update errors gracefully', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_error',
            metadata: {
              orderId: 'order-error',
            },
            payment_method_types: ['card'],
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockOrdersService.updateOrderPayment.mockRejectedValue(new Error('Database error'));

      const result = await controller.handleWebhook(signature, mockRequest);

      expect(result).toEqual({ received: true });
    });

    it('should use default payment method if not provided', async () => {
      const signature = 'test-signature';
      const mockRequest = { rawBody: Buffer.from('test') } as any;

      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_no_method',
            metadata: {
              orderId: 'order-789',
            },
            payment_method_types: [],
          },
        },
      };

      mockPaymentsService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockOrdersService.updateOrderPayment.mockResolvedValue({});

      await controller.handleWebhook(signature, mockRequest);

      expect(mockOrdersService.updateOrderPayment).toHaveBeenCalledWith(
        'order-789',
        'pi_no_method',
        'card'
      );
    });
  });
});
