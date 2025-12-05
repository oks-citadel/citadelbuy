import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from '../services/stripe.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('StripeService', () => {
  let service: StripeService;
  let configService: jest.Mocked<ConfigService>;

  const mockStripeInstance = {
    customers: {
      create: jest.fn(),
      update: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      detach: jest.fn(),
      list: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    invoices: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripeInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    configService = module.get(ConfigService);
  });

  describe('initialization', () => {
    it('should initialize with valid API key', () => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');

      const module = Test.createTestingModule({
        providers: [
          StripeService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      expect(Stripe).toHaveBeenCalledWith('sk_test_validkey123', {
        apiVersion: '2023-10-16',
      });
    });

    it('should throw error in production without API key', () => {
      mockConfigService.get.mockReturnValue(undefined);
      process.env.NODE_ENV = 'production';

      expect(() => {
        new StripeService(mockConfigService as any);
      }).toThrow('STRIPE_SECRET_KEY environment variable is required in production');

      process.env.NODE_ENV = 'test';
    });

    it('should warn in development without API key', () => {
      mockConfigService.get.mockReturnValue(undefined);
      process.env.NODE_ENV = 'development';

      const loggerWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      new StripeService(mockConfigService as any);

      process.env.NODE_ENV = 'test';
      loggerWarnSpy.mockRestore();
    });

    it('should not initialize with invalid API key format', () => {
      mockConfigService.get.mockReturnValue('invalid_key_format');

      new StripeService(mockConfigService as any);

      expect(Stripe).not.toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should create customer successfully', async () => {
      const customerParams = {
        name: 'Test Organization',
        email: 'test@example.com',
        metadata: {
          organizationId: 'org-123',
          organizationSlug: 'test-org',
        },
      };

      const mockCustomer = {
        id: 'cus_123',
        object: 'customer',
        name: 'Test Organization',
        email: 'test@example.com',
      };

      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer(customerParams);

      expect(result).toEqual(mockCustomer);
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        name: 'Test Organization',
        email: 'test@example.com',
        metadata: {
          organizationId: 'org-123',
          organizationSlug: 'test-org',
        },
      });
    });

    it('should create customer without metadata', async () => {
      const customerParams = {
        name: 'Test Org',
        email: 'test@example.com',
      };

      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_123' });

      await service.createCustomer(customerParams);

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        name: 'Test Org',
        email: 'test@example.com',
        metadata: {},
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const customerParams = {
        name: 'Test Org',
        email: 'invalid-email',
      };

      mockStripeInstance.customers.create.mockRejectedValue(
        new Error('Invalid email address'),
      );

      await expect(service.createCustomer(customerParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Stripe not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const unconfiguredService = new StripeService(mockConfigService as any);

      await expect(
        unconfiguredService.createCustomer({ name: 'Test', email: 'test@test.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSubscription', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should create subscription successfully', async () => {
      const customerId = 'cus_123';
      const priceId = 'price_123';

      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        customer: customerId,
        items: {
          data: [{ price: { id: priceId } }],
        },
      };

      mockStripeInstance.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await service.createSubscription(customerId, priceId);

      expect(result).toEqual(mockSubscription);
      expect(mockStripeInstance.subscriptions.create).toHaveBeenCalledWith({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
    });

    it('should throw BadRequestException on invalid price ID', async () => {
      mockStripeInstance.subscriptions.create.mockRejectedValue(
        new Error('No such price: invalid_price'),
      );

      await expect(service.createSubscription('cus_123', 'invalid_price')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateSubscription', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should update subscription successfully', async () => {
      const subscriptionId = 'sub_123';
      const newPriceId = 'price_new';

      const currentSubscription = {
        id: subscriptionId,
        items: {
          data: [{ id: 'si_123', price: { id: 'price_old' } }],
        },
      };

      const updatedSubscription = {
        id: subscriptionId,
        items: {
          data: [{ id: 'si_123', price: { id: newPriceId } }],
        },
      };

      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(currentSubscription);
      mockStripeInstance.subscriptions.update.mockResolvedValue(updatedSubscription);

      const result = await service.updateSubscription(subscriptionId, newPriceId);

      expect(result).toEqual(updatedSubscription);
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        items: [
          {
            id: 'si_123',
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    });

    it('should throw BadRequestException if subscription not found', async () => {
      mockStripeInstance.subscriptions.retrieve.mockRejectedValue(
        new Error('No such subscription'),
      );

      await expect(service.updateSubscription('sub_invalid', 'price_new')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelSubscription', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub_123';
      const cancelledSubscription = {
        id: subscriptionId,
        status: 'canceled',
      };

      mockStripeInstance.subscriptions.cancel.mockResolvedValue(cancelledSubscription);

      const result = await service.cancelSubscription(subscriptionId);

      expect(result).toEqual(cancelledSubscription);
      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
    });

    it('should throw BadRequestException on error', async () => {
      mockStripeInstance.subscriptions.cancel.mockRejectedValue(
        new Error('No such subscription'),
      );

      await expect(service.cancelSubscription('sub_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('attachPaymentMethod', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should attach payment method successfully', async () => {
      const customerId = 'cus_123';
      const paymentMethodId = 'pm_123';

      const mockPaymentMethod = {
        id: paymentMethodId,
        customer: customerId,
      };

      mockStripeInstance.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);
      mockStripeInstance.customers.update.mockResolvedValue({});

      const result = await service.attachPaymentMethod(customerId, paymentMethodId);

      expect(result).toEqual(mockPaymentMethod);
      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
        customer: customerId,
      });
      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    });

    it('should throw BadRequestException on invalid payment method', async () => {
      mockStripeInstance.paymentMethods.attach.mockRejectedValue(
        new Error('No such payment method'),
      );

      await expect(service.attachPaymentMethod('cus_123', 'pm_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('detachPaymentMethod', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should detach payment method successfully', async () => {
      const paymentMethodId = 'pm_123';
      const mockPaymentMethod = {
        id: paymentMethodId,
        customer: null,
      };

      mockStripeInstance.paymentMethods.detach.mockResolvedValue(mockPaymentMethod);

      const result = await service.detachPaymentMethod(paymentMethodId);

      expect(result).toEqual(mockPaymentMethod);
      expect(mockStripeInstance.paymentMethods.detach).toHaveBeenCalledWith(paymentMethodId);
    });

    it('should throw BadRequestException on error', async () => {
      mockStripeInstance.paymentMethods.detach.mockRejectedValue(
        new Error('Payment method not found'),
      );

      await expect(service.detachPaymentMethod('pm_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createPaymentIntent', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should create payment intent successfully', async () => {
      const amount = 99.99;
      const currency = 'usd';

      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 9999,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(amount, currency);

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 9999,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
      });
    });

    it('should use default currency USD', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_123' } as any);

      await service.createPaymentIntent(100);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      );
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      await expect(service.createPaymentIntent(0)).rejects.toThrow(BadRequestException);
      await expect(service.createPaymentIntent(-10)).rejects.toThrow(BadRequestException);
    });

    it('should convert amount to cents correctly', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_123' } as any);

      await service.createPaymentIntent(123.456);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 12346,
        }),
      );
    });

    it('should handle different currencies', async () => {
      mockStripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_123' } as any);

      await service.createPaymentIntent(100, 'EUR');

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'eur',
        }),
      );
    });
  });

  describe('retrievePaymentIntent', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should retrieve payment intent successfully', async () => {
      const paymentIntentId = 'pi_123';
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 9999,
        status: 'succeeded',
      };

      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await service.retrievePaymentIntent(paymentIntentId);

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId);
    });

    it('should throw BadRequestException if not found', async () => {
      mockStripeInstance.paymentIntents.retrieve.mockRejectedValue(
        new Error('No such payment intent'),
      );

      await expect(service.retrievePaymentIntent('pi_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listPaymentMethods', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should list payment methods successfully', async () => {
      const customerId = 'cus_123';
      const mockPaymentMethods = {
        data: [
          { id: 'pm_1', type: 'card' },
          { id: 'pm_2', type: 'card' },
        ],
      };

      mockStripeInstance.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const result = await service.listPaymentMethods(customerId);

      expect(result).toEqual(mockPaymentMethods.data);
      expect(mockStripeInstance.paymentMethods.list).toHaveBeenCalledWith({
        customer: customerId,
        type: 'card',
      });
    });

    it('should return empty array if no payment methods', async () => {
      mockStripeInstance.paymentMethods.list.mockResolvedValue({ data: [] });

      const result = await service.listPaymentMethods('cus_123');

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException on error', async () => {
      mockStripeInstance.paymentMethods.list.mockRejectedValue(
        new Error('No such customer'),
      );

      await expect(service.listPaymentMethods('cus_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('constructWebhookEvent', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should construct webhook event successfully', () => {
      const payload = Buffer.from('{"type":"payment_intent.succeeded"}');
      const signature = 'whsec_test_signature';
      const webhookSecret = 'whsec_test_secret';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_validkey123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return webhookSecret;
        return undefined;
      });

      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = service.constructWebhookEvent(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret,
      );
    });

    it('should throw error if webhook secret not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_validkey123';
        return undefined;
      });

      const payload = Buffer.from('{}');
      const signature = 'sig';

      expect(() => service.constructWebhookEvent(payload, signature)).toThrow(
        'STRIPE_WEBHOOK_SECRET not configured',
      );
    });

    it('should throw BadRequestException on signature verification failure', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_validkey123';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_secret';
        return undefined;
      });

      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const payload = Buffer.from('{}');
      const signature = 'invalid_sig';

      expect(() => service.constructWebhookEvent(payload, signature)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('retrieveSubscription', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should retrieve subscription successfully', async () => {
      const subscriptionId = 'sub_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'active',
      };

      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);

      const result = await service.retrieveSubscription(subscriptionId);

      expect(result).toEqual(mockSubscription);
    });

    it('should throw BadRequestException if not found', async () => {
      mockStripeInstance.subscriptions.retrieve.mockRejectedValue(
        new Error('No such subscription'),
      );

      await expect(service.retrieveSubscription('sub_invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('retrieveInvoice', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      service = new StripeService(mockConfigService as any);
    });

    it('should retrieve invoice successfully', async () => {
      const invoiceId = 'in_123';
      const mockInvoice = {
        id: invoiceId,
        amount_due: 9999,
      };

      mockStripeInstance.invoices.retrieve.mockResolvedValue(mockInvoice);

      const result = await service.retrieveInvoice(invoiceId);

      expect(result).toEqual(mockInvoice);
    });

    it('should throw BadRequestException if not found', async () => {
      mockStripeInstance.invoices.retrieve.mockRejectedValue(new Error('No such invoice'));

      await expect(service.retrieveInvoice('in_invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('isConfigured', () => {
    it('should return true when Stripe is configured', () => {
      mockConfigService.get.mockReturnValue('sk_test_validkey123');
      const configuredService = new StripeService(mockConfigService as any);

      expect(configuredService.isConfigured()).toBe(true);
    });

    it('should return false when Stripe is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const unconfiguredService = new StripeService(mockConfigService as any);

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});
