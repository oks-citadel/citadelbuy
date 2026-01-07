import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../services/billing.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { StripeService } from '../services/stripe.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let stripeService: jest.Mocked<StripeService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationBilling: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockStripeService = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    attachPaymentMethod: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    stripeService = module.get(StripeService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    const organizationId = 'org-123';
    const createDto = {
      planId: 'price_123',
      paymentMethodId: 'pm_123',
      billingCycle: 'monthly' as const,
    };

    it('should create a subscription successfully for new billing', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        primaryEmail: 'test@example.com',
      };

      const mockStripeCustomer = {
        id: 'cus_123',
        object: 'customer',
      };

      const mockStripeSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: {
          data: [{ price: { nickname: 'Pro Plan' } }],
        },
      };

      const mockBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        planId: 'price_123',
        planName: 'Pro Plan',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date(1609459200 * 1000),
        currentPeriodEnd: new Date(1612137600 * 1000),
        paymentMethodId: 'pm_123',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);
      mockStripeService.createCustomer.mockResolvedValue(mockStripeCustomer as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockStripeService.createSubscription.mockResolvedValue(mockStripeSubscription as any);
      mockPrismaService.organizationBilling.upsert.mockResolvedValue(mockBilling as any);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.createSubscription(organizationId, createDto);

      expect(result).toEqual({
        id: 'billing-123',
        subscriptionId: 'sub_123',
        status: 'active',
        planId: 'price_123',
        billingCycle: 'monthly',
        currentPeriodStart: mockBilling.currentPeriodStart,
        currentPeriodEnd: mockBilling.currentPeriodEnd,
      });

      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockStripeService.createCustomer).toHaveBeenCalledWith({
        name: 'Test Org',
        email: 'test@example.com',
        metadata: {
          organizationId: 'org-123',
          organizationSlug: 'test-org',
        },
      });
      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith('cus_123', 'pm_123');
      expect(mockStripeService.createSubscription).toHaveBeenCalledWith('cus_123', 'price_123');
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.createSubscription(organizationId, createDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: organizationId },
      });
      expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
    });

    it('should reuse existing Stripe customer if billing exists', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        primaryEmail: 'test@example.com',
      };

      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_existing',
        planId: null,
        status: 'inactive',
      };

      const mockStripeSubscription = {
        id: 'sub_new',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: {
          data: [{ price: { nickname: 'Pro Plan' } }],
        },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockStripeService.createSubscription.mockResolvedValue(mockStripeSubscription as any);
      mockPrismaService.organizationBilling.upsert.mockResolvedValue({
        ...existingBilling,
        stripeSubscriptionId: 'sub_new',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.createSubscription(organizationId, createDto);

      expect(mockStripeService.createCustomer).not.toHaveBeenCalled();
      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith('cus_existing', 'pm_123');
    });

    it('should handle subscription with custom plan name', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        primaryEmail: 'test@example.com',
      };

      const mockStripeCustomer = { id: 'cus_123' };
      const mockStripeSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: {
          data: [{ price: { nickname: null } }],
        },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);
      mockStripeService.createCustomer.mockResolvedValue(mockStripeCustomer as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockStripeService.createSubscription.mockResolvedValue(mockStripeSubscription as any);
      mockPrismaService.organizationBilling.upsert.mockResolvedValue({
        id: 'billing-123',
        planName: 'Custom Plan',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.createSubscription(organizationId, createDto);

      expect(mockPrismaService.organizationBilling.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            planName: 'Custom Plan',
          }),
        }),
      );
    });

    it('should clear billing cache after subscription creation', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        primaryEmail: 'test@example.com',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);
      mockStripeService.createCustomer.mockResolvedValue({ id: 'cus_123' } as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockStripeService.createSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: { data: [{ price: { nickname: 'Pro' } }] },
      } as any);
      mockPrismaService.organizationBilling.upsert.mockResolvedValue({
        id: 'billing-123',
        organizationId,
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.createSubscription(organizationId, createDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:subscription:${organizationId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:info:${organizationId}`);
    });
  });

  describe('updateSubscription', () => {
    const organizationId = 'org-123';
    const updateDto = {
      planId: 'price_new',
      billingCycle: 'yearly' as const,
    };

    it('should update subscription plan successfully', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        planId: 'price_old',
        billingCycle: 'monthly',
        status: 'active',
      };

      const updatedSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: {
          data: [{ price: { nickname: 'Enterprise Plan' } }],
        },
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.updateSubscription.mockResolvedValue(updatedSubscription as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({
        ...existingBilling,
        planId: 'price_new',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      jest.spyOn(service, 'getSubscription').mockResolvedValue({
        id: 'billing-123',
        planId: 'price_new',
      } as any);

      const result = await service.updateSubscription(organizationId, updateDto);

      expect(mockStripeService.updateSubscription).toHaveBeenCalledWith('sub_123', 'price_new');
      expect(mockPrismaService.organizationBilling.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId },
          data: expect.objectContaining({
            planId: 'price_new',
            billingCycle: 'yearly',
          }),
        }),
      );
    });

    it('should throw NotFoundException if no active subscription found', async () => {
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      await expect(service.updateSubscription(organizationId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if billing exists but no subscription', async () => {
      const billingWithoutSub = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(billingWithoutSub as any);

      await expect(service.updateSubscription(organizationId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update payment method only when no plan change', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        paymentMethodId: 'pm_old',
      };

      const paymentOnlyDto = {
        paymentMethodId: 'pm_new',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({
        ...existingBilling,
        paymentMethodId: 'pm_new',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      jest.spyOn(service, 'getSubscription').mockResolvedValue({} as any);

      await service.updateSubscription(organizationId, paymentOnlyDto);

      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith('cus_123', 'pm_new');
      expect(mockStripeService.updateSubscription).not.toHaveBeenCalled();
      expect(mockPrismaService.organizationBilling.update).toHaveBeenCalledWith({
        where: { organizationId },
        data: {
          paymentMethodId: 'pm_new',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should update billing cycle only when no plan change', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        billingCycle: 'monthly',
      };

      const cycleOnlyDto = {
        billingCycle: 'yearly' as const,
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({
        ...existingBilling,
        billingCycle: 'yearly',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      jest.spyOn(service, 'getSubscription').mockResolvedValue({} as any);

      await service.updateSubscription(organizationId, cycleOnlyDto);

      expect(mockStripeService.updateSubscription).not.toHaveBeenCalled();
      expect(mockPrismaService.organizationBilling.update).toHaveBeenCalledWith({
        where: { organizationId },
        data: {
          billingCycle: 'yearly',
          paymentMethodId: undefined,
        },
      });
    });

    it('should attach payment method when updating plan and payment method together', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        planId: 'price_old',
      };

      const fullUpdateDto = {
        planId: 'price_new',
        paymentMethodId: 'pm_new',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockStripeService.updateSubscription.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_start: 1609459200,
        current_period_end: 1612137600,
        items: { data: [{ price: { nickname: 'Pro' } }] },
      } as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({} as any);
      mockRedisService.del.mockResolvedValue(1);

      jest.spyOn(service, 'getSubscription').mockResolvedValue({} as any);

      await service.updateSubscription(organizationId, fullUpdateDto);

      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith('cus_123', 'pm_new');
      expect(mockStripeService.updateSubscription).toHaveBeenCalledWith('sub_123', 'price_new');
    });
  });

  describe('cancelSubscription', () => {
    const organizationId = 'org-123';

    it('should cancel subscription successfully', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.cancelSubscription.mockResolvedValue({} as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({
        ...existingBilling,
        status: 'cancelled',
      } as any);
      mockPrismaService.organization.update.mockResolvedValue({} as any);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.cancelSubscription(organizationId);

      expect(result).toEqual({
        success: true,
        message: 'Subscription cancelled successfully',
      });

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockPrismaService.organizationBilling.update).toHaveBeenCalledWith({
        where: { organizationId },
        data: {
          status: 'cancelled',
        },
      });
    });

    it('should throw NotFoundException if no billing record exists', async () => {
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription(organizationId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if billing exists but no subscription', async () => {
      const billingWithoutSub = {
        id: 'billing-123',
        organizationId,
        stripeSubscriptionId: null,
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(billingWithoutSub as any);

      await expect(service.cancelSubscription(organizationId)).rejects.toThrow(NotFoundException);
    });

    it('should clear cache after cancellation', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeSubscriptionId: 'sub_123',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.cancelSubscription.mockResolvedValue({} as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({} as any);
      mockPrismaService.organization.update.mockResolvedValue({} as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.cancelSubscription(organizationId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:subscription:${organizationId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:info:${organizationId}`);
    });
  });

  describe('getSubscription', () => {
    const organizationId = 'org-123';

    it('should return cached subscription if available', async () => {
      const cachedData = {
        id: 'billing-123',
        organizationId,
        planId: 'price_123',
      };

      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getSubscription(organizationId);

      expect(result).toEqual(cachedData);
      expect(mockRedisService.get).toHaveBeenCalledWith(`billing:subscription:${organizationId}`);
      expect(mockPrismaService.organizationBilling.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const billingData = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        planId: 'price_123',
        planName: 'Pro Plan',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date('2021-01-01'),
        currentPeriodEnd: new Date('2021-02-01'),
        paymentMethodId: 'pm_123',
        createdAt: new Date('2020-12-01'),
        updatedAt: new Date('2021-01-01'),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(billingData as any);
      mockRedisService.set.mockResolvedValue('OK' as any);

      const result = await service.getSubscription(organizationId);

      expect(result).toEqual({
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        planId: 'price_123',
        planName: 'Pro Plan',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: billingData.currentPeriodStart,
        currentPeriodEnd: billingData.currentPeriodEnd,
        paymentMethodId: 'pm_123',
        createdAt: billingData.createdAt,
        updatedAt: billingData.updatedAt,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `billing:subscription:${organizationId}`,
        expect.any(Object),
        300,
      );
    });

    it('should throw NotFoundException if billing not found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription(organizationId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBillingInfo', () => {
    const organizationId = 'org-123';

    it('should return cached billing info if available', async () => {
      const cachedInfo = {
        hasActiveSubscription: true,
        subscription: { id: 'billing-123' },
        recentInvoices: [],
      };

      mockRedisService.get.mockResolvedValue(cachedInfo);

      const result = await service.getBillingInfo(organizationId);

      expect(result).toEqual(cachedInfo);
      expect(mockRedisService.get).toHaveBeenCalledWith(`billing:info:${organizationId}`);
    });

    it('should return default structure if no billing exists', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      const result = await service.getBillingInfo(organizationId);

      expect(result).toEqual({
        hasActiveSubscription: false,
        subscription: null,
        recentInvoices: [],
      });
    });

    it('should return billing info with invoices', async () => {
      const billingData = {
        id: 'billing-123',
        organizationId,
        planId: 'price_123',
        planName: 'Pro Plan',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date('2021-01-01'),
        currentPeriodEnd: new Date('2021-02-01'),
        invoices: [
          {
            id: 'inv-1',
            number: 'INV-202101-0001',
            amount: 99.99,
            currency: 'USD',
            status: 'paid',
            dueDate: new Date('2021-01-15'),
            paidAt: new Date('2021-01-10'),
            pdfUrl: 'https://invoice.pdf',
            createdAt: new Date('2021-01-01'),
          },
        ],
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(billingData as any);
      mockRedisService.set.mockResolvedValue('OK' as any);

      const result = await service.getBillingInfo(organizationId);

      expect(result).toEqual({
        hasActiveSubscription: true,
        subscription: {
          id: 'billing-123',
          planId: 'price_123',
          planName: 'Pro Plan',
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodStart: billingData.currentPeriodStart,
          currentPeriodEnd: billingData.currentPeriodEnd,
        },
        recentInvoices: [
          {
            id: 'inv-1',
            number: 'INV-202101-0001',
            amount: 99.99,
            currency: 'USD',
            status: 'paid',
            dueDate: billingData.invoices[0].dueDate,
            paidAt: billingData.invoices[0].paidAt,
            pdfUrl: 'https://invoice.pdf',
            createdAt: billingData.invoices[0].createdAt,
          },
        ],
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `billing:info:${organizationId}`,
        expect.any(Object),
        300,
      );
    });

    it('should correctly identify inactive subscription', async () => {
      const billingData = {
        id: 'billing-123',
        organizationId,
        status: 'cancelled',
        planId: 'price_123',
        planName: 'Pro Plan',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2021-01-01'),
        currentPeriodEnd: new Date('2021-02-01'),
        invoices: [],
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(billingData as any);
      mockRedisService.set.mockResolvedValue('OK' as any);

      const result = await service.getBillingInfo(organizationId);

      expect(result.hasActiveSubscription).toBe(false);
    });
  });

  describe('updatePaymentMethod', () => {
    const organizationId = 'org-123';
    const paymentMethodDto = {
      paymentMethodId: 'pm_new',
    };

    it('should update payment method successfully', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
        paymentMethodId: 'pm_old',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({
        ...existingBilling,
        paymentMethodId: 'pm_new',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.updatePaymentMethod(organizationId, paymentMethodDto);

      expect(result).toEqual({
        success: true,
        message: 'Payment method updated successfully',
        paymentMethodId: 'pm_new',
      });

      expect(mockStripeService.attachPaymentMethod).toHaveBeenCalledWith('cus_123', 'pm_new');
      expect(mockPrismaService.organizationBilling.update).toHaveBeenCalledWith({
        where: { organizationId },
        data: {
          paymentMethodId: 'pm_new',
        },
      });
    });

    it('should throw NotFoundException if billing not found', async () => {
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePaymentMethod(organizationId, paymentMethodDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if billing exists but no customer', async () => {
      const billingWithoutCustomer = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: null,
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(
        billingWithoutCustomer as any,
      );

      await expect(
        service.updatePaymentMethod(organizationId, paymentMethodDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clear cache after payment method update', async () => {
      const existingBilling = {
        id: 'billing-123',
        organizationId,
        stripeCustomerId: 'cus_123',
      };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(existingBilling as any);
      mockStripeService.attachPaymentMethod.mockResolvedValue({} as any);
      mockPrismaService.organizationBilling.update.mockResolvedValue({} as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.updatePaymentMethod(organizationId, paymentMethodDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:subscription:${organizationId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(`billing:info:${organizationId}`);
    });
  });
});
