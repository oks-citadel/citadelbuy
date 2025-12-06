import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('PaymentsService', () => {
  let service: PaymentsService;
  let configService: ConfigService;

  const mockStripePaymentIntents = {
    create: jest.fn(),
    retrieve: jest.fn(),
  };

  const mockStripeWebhooks = {
    constructEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Reset Stripe mock
    (Stripe as any).mockImplementation(() => ({
      paymentIntents: mockStripePaymentIntents,
      webhooks: mockStripeWebhooks,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use dummy key when STRIPE_SECRET_KEY is not configured', () => {
    // Arrange
    const mockConfigWithoutKey = {
      get: jest.fn(() => undefined),
    };

    // Act
    new PaymentsService(mockConfigWithoutKey as any);

    // Assert
    expect(Stripe).toHaveBeenCalledWith('sk_test_dummy', {
      apiVersion: '2024-12-18.acacia',
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      // Arrange
      const amount = 99.99;
      const currency = 'usd';
      const metadata = { orderId: 'order-123', userId: 'user-456' };
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'pi_123456789_secret_abc',
        amount: 9999,
        currency: 'usd',
        status: 'requires_payment_method',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await service.createPaymentIntent(
        amount,
        currency,
        metadata,
      );

      // Assert
      expect(result).toEqual({
        clientSecret: 'pi_123456789_secret_abc',
        paymentIntentId: 'pi_123456789',
      });
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith({
        amount: 9999, // 99.99 * 100
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata,
      });
    });

    it('should convert amount to cents correctly', async () => {
      // Arrange
      const amount = 50.5;
      const mockPaymentIntent = {
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await service.createPaymentIntent(amount);

      // Assert
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5050, // 50.5 * 100
        }),
      );
    });

    it('should convert currency to lowercase', async () => {
      // Arrange
      const amount = 100;
      const currency = 'USD';
      const mockPaymentIntent = {
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await service.createPaymentIntent(amount, currency);

      // Assert
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      );
    });

    it('should use default currency when not provided', async () => {
      // Arrange
      const amount = 100;
      const mockPaymentIntent = {
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await service.createPaymentIntent(amount);

      // Assert
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      );
    });

    it('should include empty metadata when not provided', async () => {
      // Arrange
      const amount = 100;
      const mockPaymentIntent = {
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await service.createPaymentIntent(amount);

      // Assert
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        }),
      );
    });

    it('should handle Stripe API errors', async () => {
      // Arrange
      const amount = 100;
      const stripeError = new Error('Stripe API error: Invalid API key');
      mockStripePaymentIntents.create.mockRejectedValue(stripeError);

      // Act & Assert
      await expect(service.createPaymentIntent(amount)).rejects.toThrow(
        'Stripe API error: Invalid API key',
      );
    });

    it('should round fractional cents correctly', async () => {
      // Arrange
      const amount = 99.995; // Should round to 100.00
      const mockPaymentIntent = {
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      };
      mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await service.createPaymentIntent(amount);

      // Assert
      expect(mockStripePaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // Math.round(99.995 * 100) = 10000
        }),
      );
    });
  });

  describe('retrievePaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
        client_secret: 'pi_123456789_secret',
      } as Stripe.PaymentIntent;
      mockStripePaymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await service.retrievePaymentIntent(paymentIntentId);

      // Assert
      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripePaymentIntents.retrieve).toHaveBeenCalledWith(
        paymentIntentId,
      );
    });

    it('should handle retrieval errors', async () => {
      // Arrange
      const paymentIntentId = 'pi_invalid';
      const stripeError = new Error('No such payment_intent');
      mockStripePaymentIntents.retrieve.mockRejectedValue(stripeError);

      // Act & Assert
      await expect(
        service.retrievePaymentIntent(paymentIntentId),
      ).rejects.toThrow('No such payment_intent');
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event successfully', () => {
      // Arrange
      const payload = Buffer.from('webhook_payload');
      const signature = 't=123456789,v1=signature_hash';
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      } as Stripe.Event;
      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);

      // Act
      const result = service.constructWebhookEvent(payload, signature);

      // Assert
      expect(result).toEqual(mockEvent);
      expect(mockStripeWebhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_secret',
      );
    });

    it('should throw error when webhook secret is not configured', () => {
      // Arrange
      const mockConfigWithoutSecret = {
        get: jest.fn((key: string) => {
          if (key === 'STRIPE_SECRET_KEY') return 'sk_test_key';
          return undefined;
        }),
      };
      const serviceWithoutSecret = new PaymentsService(
        mockConfigWithoutSecret as any,
      );
      const payload = Buffer.from('webhook_payload');
      const signature = 't=123456789,v1=signature_hash';

      // Act & Assert
      expect(() =>
        serviceWithoutSecret.constructWebhookEvent(payload, signature),
      ).toThrow('STRIPE_WEBHOOK_SECRET not configured');
    });

    it('should handle invalid webhook signatures', () => {
      // Arrange
      const payload = Buffer.from('webhook_payload');
      const signature = 'invalid_signature';
      const stripeError = new Error('Invalid signature');
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw stripeError;
      });

      // Act & Assert
      expect(() =>
        service.constructWebhookEvent(payload, signature),
      ).toThrow('Invalid signature');
    });
  });
});
