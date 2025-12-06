import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('PaymentsService - Enhanced Tests', () => {
  let service: PaymentsService;
  let configService: ConfigService;

  const mockStripePaymentIntents = {
    create: jest.fn(),
    retrieve: jest.fn(),
  };

  const mockStripeRefunds = {
    create: jest.fn(),
    retrieve: jest.fn(),
  };

  const mockStripeWebhooks = {
    constructEvent: jest.fn(),
  };

  const mockStripeApplePayDomains = {
    create: jest.fn(),
    list: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
        PAYPAL_CLIENT_ID: 'paypal_client_id',
        PAYPAL_CLIENT_SECRET: 'paypal_client_secret',
        PAYPAL_MODE: 'sandbox',
        APPLE_MERCHANT_ID: 'merchant.com.citadelbuy',
        GOOGLE_MERCHANT_ID: 'google_merchant_123',
        APP_NAME: 'CitadelBuy',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Reset Stripe mock
    (Stripe as any).mockImplementation(() => ({
      paymentIntents: mockStripePaymentIntents,
      refunds: mockStripeRefunds,
      webhooks: mockStripeWebhooks,
      applePayDomains: mockStripeApplePayDomains,
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

  describe('Refund Operations', () => {
    describe('createStripeRefund', () => {
      it('should create a full refund successfully', async () => {
        // Arrange
        const paymentIntentId = 'pi_123456789';
        const mockRefund = {
          id: 're_123456789',
          status: 'succeeded',
          amount: 10000,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        const result = await service.createStripeRefund(paymentIntentId);

        // Assert
        expect(result).toEqual({
          refundId: 're_123456789',
          status: 'succeeded',
          amount: 100,
        });
        expect(mockStripeRefunds.create).toHaveBeenCalledWith({
          payment_intent: paymentIntentId,
          amount: undefined,
          reason: 'requested_by_customer',
          metadata: {},
        });
      });

      it('should create a partial refund successfully', async () => {
        // Arrange
        const paymentIntentId = 'pi_123456789';
        const amount = 50.0;
        const mockRefund = {
          id: 're_partial',
          status: 'succeeded',
          amount: 5000,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        const result = await service.createStripeRefund(paymentIntentId, amount);

        // Assert
        expect(result).toEqual({
          refundId: 're_partial',
          status: 'succeeded',
          amount: 50,
        });
        expect(mockStripeRefunds.create).toHaveBeenCalledWith({
          payment_intent: paymentIntentId,
          amount: 5000,
          reason: 'requested_by_customer',
          metadata: {},
        });
      });

      it('should create refund with specific reason', async () => {
        // Arrange
        const paymentIntentId = 'pi_123456789';
        const amount = 100;
        const reason = 'fraudulent';
        const mockRefund = {
          id: 're_fraud',
          status: 'succeeded',
          amount: 10000,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        await service.createStripeRefund(paymentIntentId, amount, reason);

        // Assert
        expect(mockStripeRefunds.create).toHaveBeenCalledWith({
          payment_intent: paymentIntentId,
          amount: 10000,
          reason: 'fraudulent',
          metadata: {},
        });
      });

      it('should include metadata in refund', async () => {
        // Arrange
        const paymentIntentId = 'pi_123456789';
        const metadata = { orderId: 'order-123', reason: 'customer request' };
        const mockRefund = {
          id: 're_meta',
          status: 'succeeded',
          amount: 10000,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        await service.createStripeRefund(
          paymentIntentId,
          undefined,
          undefined,
          metadata,
        );

        // Assert
        expect(mockStripeRefunds.create).toHaveBeenCalledWith({
          payment_intent: paymentIntentId,
          amount: undefined,
          reason: 'requested_by_customer',
          metadata,
        });
      });

      it('should handle refund creation errors', async () => {
        // Arrange
        const paymentIntentId = 'pi_invalid';
        const stripeError = new Error('Insufficient funds for refund');
        mockStripeRefunds.create.mockRejectedValue(stripeError);

        // Act & Assert
        await expect(service.createStripeRefund(paymentIntentId)).rejects.toThrow(
          'Insufficient funds for refund',
        );
      });

      it('should handle null status in refund response', async () => {
        // Arrange
        const paymentIntentId = 'pi_123456789';
        const mockRefund = {
          id: 're_pending',
          status: null,
          amount: 10000,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        const result = await service.createStripeRefund(paymentIntentId);

        // Assert
        expect(result.status).toBe('pending');
      });
    });

    describe('retrieveStripeRefund', () => {
      it('should retrieve a refund successfully', async () => {
        // Arrange
        const refundId = 're_123456789';
        const mockRefund = {
          id: refundId,
          amount: 10000,
          status: 'succeeded',
        } as Stripe.Refund;
        mockStripeRefunds.retrieve.mockResolvedValue(mockRefund);

        // Act
        const result = await service.retrieveStripeRefund(refundId);

        // Assert
        expect(result).toEqual(mockRefund);
        expect(mockStripeRefunds.retrieve).toHaveBeenCalledWith(refundId);
      });

      it('should handle retrieval errors', async () => {
        // Arrange
        const refundId = 're_invalid';
        const stripeError = new Error('No such refund');
        mockStripeRefunds.retrieve.mockRejectedValue(stripeError);

        // Act & Assert
        await expect(service.retrieveStripeRefund(refundId)).rejects.toThrow(
          'No such refund',
        );
      });
    });

    describe('processRefund', () => {
      it('should process STRIPE refund successfully', async () => {
        // Arrange
        const paymentMethod = 'STRIPE';
        const transactionId = 'pi_123456789';
        const amount = 99.99;
        const reason = 'Product defective';
        const metadata = { orderId: 'order-123' };

        const mockRefund = {
          id: 're_123456789',
          status: 'succeeded',
          amount: 9999,
        };
        mockStripeRefunds.create.mockResolvedValue(mockRefund);

        // Act
        const result = await service.processRefund(
          paymentMethod,
          transactionId,
          amount,
          reason,
          metadata,
        );

        // Assert
        expect(result).toEqual({
          refundId: 're_123456789',
          status: 'succeeded',
          amount: 99.99,
        });
        expect(mockStripeRefunds.create).toHaveBeenCalledWith({
          payment_intent: transactionId,
          amount: 9999,
          reason: 'requested_by_customer',
          metadata,
        });
      });

      it('should process PAYPAL refund successfully', async () => {
        // Arrange
        const paymentMethod = 'PAYPAL';
        const transactionId = 'CAPTURE-123';
        const amount = 99.99;
        const reason = 'Customer request';

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: 'REFUND-123',
              status: 'COMPLETED',
              amount: { value: '99.99' },
            }),
          }) as any;

        // Act
        const result = await service.processRefund(
          paymentMethod,
          transactionId,
          amount,
          reason,
        );

        // Assert
        expect(result).toEqual({
          refundId: 'REFUND-123',
          status: 'COMPLETED',
          amount: 99.99,
        });
      });

      it('should throw error for zero or negative amount', async () => {
        // Arrange
        const paymentMethod = 'STRIPE';
        const transactionId = 'pi_123456789';
        const amount = 0;

        // Act & Assert
        await expect(
          service.processRefund(paymentMethod, transactionId, amount),
        ).rejects.toThrow('Refund amount must be greater than 0');
      });

      it('should throw error for negative amount', async () => {
        // Arrange
        const paymentMethod = 'STRIPE';
        const transactionId = 'pi_123456789';
        const amount = -10;

        // Act & Assert
        await expect(
          service.processRefund(paymentMethod, transactionId, amount),
        ).rejects.toThrow('Refund amount must be greater than 0');
      });

      it('should throw error for unsupported payment method', async () => {
        // Arrange
        const paymentMethod = 'OTHER' as any;
        const transactionId = 'txn_123';
        const amount = 99.99;

        // Act & Assert
        await expect(
          service.processRefund(paymentMethod, transactionId, amount),
        ).rejects.toThrow('Unsupported payment method: OTHER');
      });
    });
  });

  describe('PayPal Operations', () => {
    describe('createPayPalOrder', () => {
      it('should create PayPal order successfully', async () => {
        // Arrange
        const amount = 99.99;
        const currency = 'USD';
        const orderId = 'order-123';
        const returnUrl = 'https://example.com/return';
        const cancelUrl = 'https://example.com/cancel';

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: 'PAYPAL-ORDER-123',
              links: [{ rel: 'approve', href: 'https://paypal.com/approve-link' }],
            }),
          }) as any;

        // Act
        const result = await service.createPayPalOrder(
          amount,
          currency,
          orderId,
          returnUrl,
          cancelUrl,
        );

        // Assert
        expect(result).toEqual({
          orderId: 'PAYPAL-ORDER-123',
          approvalUrl: 'https://paypal.com/approve-link',
        });
      });

      it('should handle PayPal API errors', async () => {
        // Arrange
        const amount = 99.99;

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Bad Request',
            json: async () => ({ message: 'Invalid amount' }),
          }) as any;

        // Act & Assert
        await expect(service.createPayPalOrder(amount)).rejects.toThrow();
      });
    });

    describe('capturePayPalOrder', () => {
      it('should capture PayPal order successfully', async () => {
        // Arrange
        const paypalOrderId = 'PAYPAL-ORDER-123';

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: 'PAYPAL-ORDER-123',
              status: 'COMPLETED',
              purchase_units: [
                {
                  payments: {
                    captures: [{ id: 'CAPTURE-123', amount: { value: '99.99' } }],
                  },
                },
              ],
            }),
          }) as any;

        // Act
        const result = await service.capturePayPalOrder(paypalOrderId);

        // Assert
        expect(result).toEqual({
          captureId: 'CAPTURE-123',
          status: 'COMPLETED',
          amount: 99.99,
        });
      });

      it('should handle PayPal capture errors', async () => {
        // Arrange
        const paypalOrderId = 'PAYPAL-ORDER-123';

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
          })
          .mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found',
            json: async () => ({ message: 'Order not found' }),
          }) as any;

        // Act & Assert
        await expect(service.capturePayPalOrder(paypalOrderId)).rejects.toThrow();
      });
    });
  });

  describe('Apple Pay / Google Pay', () => {
    describe('createApplePayIntent', () => {
      it('should create Apple Pay payment intent successfully', async () => {
        // Arrange
        const amount = 99.99;
        const currency = 'usd';
        const metadata = { orderId: 'order-123' };
        const mockPaymentIntent = {
          id: 'pi_applepay',
          client_secret: 'pi_applepay_secret',
        };
        mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

        // Act
        const result = await service.createApplePayIntent(amount, currency, metadata);

        // Assert
        expect(result).toEqual({
          clientSecret: 'pi_applepay_secret',
          paymentIntentId: 'pi_applepay',
          applePay: {
            merchantId: 'merchant.com.citadelbuy',
            merchantName: 'CitadelBuy',
            countryCode: 'US',
          },
        });
        expect(mockStripePaymentIntents.create).toHaveBeenCalledWith({
          amount: 9999,
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: {
            ...metadata,
            payment_method: 'apple_pay',
          },
        });
      });

      it('should throw error for invalid amount', async () => {
        // Act & Assert
        await expect(service.createApplePayIntent(0)).rejects.toThrow(
          'Amount must be greater than 0',
        );
      });
    });

    describe('createGooglePayIntent', () => {
      it('should create Google Pay payment intent successfully', async () => {
        // Arrange
        const amount = 99.99;
        const currency = 'usd';
        const metadata = { orderId: 'order-123' };
        const mockPaymentIntent = {
          id: 'pi_googlepay',
          client_secret: 'pi_googlepay_secret',
        };
        mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

        // Act
        const result = await service.createGooglePayIntent(amount, currency, metadata);

        // Assert
        expect(result).toEqual({
          clientSecret: 'pi_googlepay_secret',
          paymentIntentId: 'pi_googlepay',
          googlePay: {
            merchantId: 'google_merchant_123',
            merchantName: 'CitadelBuy',
            environment: 'TEST',
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
            allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          },
        });
        expect(mockStripePaymentIntents.create).toHaveBeenCalledWith({
          amount: 9999,
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: {
            ...metadata,
            payment_method: 'google_pay',
          },
        });
      });
    });

    describe('processWalletPayment', () => {
      it('should process Apple Pay payment successfully', async () => {
        // Arrange
        const walletType = 'apple_pay';
        const paymentMethodId = 'pm_applepay';
        const amount = 99.99;
        const mockPaymentIntent = {
          id: 'pi_wallet',
          status: 'succeeded',
        };
        mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

        // Act
        const result = await service.processWalletPayment(
          walletType,
          paymentMethodId,
          amount,
        );

        // Assert
        expect(result).toEqual({
          success: true,
          paymentIntentId: 'pi_wallet',
          status: 'succeeded',
        });
      });

      it('should process Google Pay payment successfully', async () => {
        // Arrange
        const walletType = 'google_pay';
        const paymentMethodId = 'pm_googlepay';
        const amount = 99.99;
        const mockPaymentIntent = {
          id: 'pi_wallet',
          status: 'succeeded',
        };
        mockStripePaymentIntents.create.mockResolvedValue(mockPaymentIntent);

        // Act
        const result = await service.processWalletPayment(
          walletType,
          paymentMethodId,
          amount,
        );

        // Assert
        expect(result).toEqual({
          success: true,
          paymentIntentId: 'pi_wallet',
          status: 'succeeded',
        });
      });

      it('should handle failed wallet payment', async () => {
        // Arrange
        const walletType = 'apple_pay';
        const paymentMethodId = 'pm_invalid';
        const amount = 99.99;
        const stripeError = new Error('Payment method declined');
        mockStripePaymentIntents.create.mockRejectedValue(stripeError);

        // Act & Assert
        await expect(
          service.processWalletPayment(walletType, paymentMethodId, amount),
        ).rejects.toThrow('Payment failed');
      });
    });

    describe('verifyApplePayDomain', () => {
      it('should verify Apple Pay domain successfully', async () => {
        // Arrange
        const domain = 'example.com';
        const mockApplePayDomain = {
          domain_name: domain,
        };
        mockStripeApplePayDomains.create.mockResolvedValue(mockApplePayDomain);

        // Act
        const result = await service.verifyApplePayDomain(domain);

        // Assert
        expect(result).toEqual({
          success: true,
          domain: domain,
        });
        expect(mockStripeApplePayDomains.create).toHaveBeenCalledWith({
          domain_name: domain,
        });
      });

      it('should handle domain verification errors', async () => {
        // Arrange
        const domain = 'invalid-domain.com';
        const stripeError = new Error('Domain verification failed');
        mockStripeApplePayDomains.create.mockRejectedValue(stripeError);

        // Act & Assert
        await expect(service.verifyApplePayDomain(domain)).rejects.toThrow();
      });
    });

    describe('listApplePayDomains', () => {
      it('should list Apple Pay domains successfully', async () => {
        // Arrange
        const mockDomains = {
          data: [
            { domain_name: 'example.com' },
            { domain_name: 'shop.example.com' },
          ],
        };
        mockStripeApplePayDomains.list.mockResolvedValue(mockDomains);

        // Act
        const result = await service.listApplePayDomains();

        // Assert
        expect(result).toEqual(['example.com', 'shop.example.com']);
      });

      it('should return empty array on error', async () => {
        // Arrange
        mockStripeApplePayDomains.list.mockRejectedValue(new Error('API error'));

        // Act
        const result = await service.listApplePayDomains();

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  describe('Configuration Checks', () => {
    it('should check if wallet payments are configured', () => {
      // Act
      const result = service.isWalletPaymentConfigured();

      // Assert
      expect(result).toEqual({
        applePay: true,
        googlePay: true,
      });
    });

    it('should return false for wallet payments when not configured', () => {
      // Arrange
      const mockConfigWithoutWallet = {
        get: jest.fn(() => undefined),
      };
      const serviceWithoutWallet = new PaymentsService(
        mockConfigWithoutWallet as any,
      );

      // Act
      const result = serviceWithoutWallet.isWalletPaymentConfigured();

      // Assert
      expect(result).toEqual({
        applePay: false,
        googlePay: false,
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors in PayPal operations', async () => {
      // Arrange
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.createPayPalOrder(99.99)).rejects.toThrow();
    });

    it('should handle invalid PayPal responses', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 }),
      }) as any;

      // Act & Assert - Should handle missing order creation response
      await expect(service.createPayPalOrder(99.99)).rejects.toThrow();
    });
  });
});
