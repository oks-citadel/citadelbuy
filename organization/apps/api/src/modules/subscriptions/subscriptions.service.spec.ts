import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  SubscriptionPlanType,
  SubscriptionStatus,
  BillingInterval,
} from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    subscriptionPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    subscriptionInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    advertisement: {
      count: jest.fn(),
    },
  };

  // Mock data
  const mockPlan = {
    id: 'plan-123',
    name: 'Pro Plan',
    description: 'Professional plan',
    type: SubscriptionPlanType.VENDOR_PROFESSIONAL,
    price: 99.99,
    billingInterval: 'MONTHLY' as BillingInterval,
    trialDays: 14,
    benefits: { analytics: true, priorityListing: true },
    maxProducts: 100,
    maxAds: 10,
    commissionRate: 5.0,
    prioritySupport: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubscription = {
    id: 'sub-123',
    userId: 'user-123',
    planId: 'plan-123',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    trialStart: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    plan: mockPlan,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlan', () => {
    it('should create a new subscription plan', async () => {
      // Arrange
      const dto = {
        name: 'Pro Plan',
        description: 'Professional plan',
        type: SubscriptionPlanType.VENDOR_PROFESSIONAL,
        price: 99.99,
        billingInterval: 'MONTHLY' as BillingInterval,
        trialDays: 14,
        benefits: { analytics: true },
        maxProducts: 100,
        maxAds: 10,
        commissionRate: 5.0,
        prioritySupport: true,
      };
      mockPrismaService.subscriptionPlan.create.mockResolvedValue(mockPlan);

      // Act
      const result = await service.createPlan(dto);

      // Assert
      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.subscriptionPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          price: dto.price,
          type: dto.type,
        }),
      });
    });
  });

  describe('findAllPlans', () => {
    it('should return only active plans by default', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([mockPlan]);

      // Act
      const result = await service.findAllPlans();

      // Assert
      expect(result).toEqual([mockPlan]);
      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });

    it('should return all plans when includeInactive is true', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([mockPlan]);

      // Act
      await service.findAllPlans(true);

      // Assert
      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });
  });

  describe('findPlansByType', () => {
    it('should return customer plans', async () => {
      // Arrange
      const customerPlan = { ...mockPlan, type: SubscriptionPlanType.CUSTOMER_PREMIUM };
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([customerPlan]);

      // Act
      const result = await service.findPlansByType('customer');

      // Assert
      expect(result).toEqual([customerPlan]);
      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: {
          type: {
            in: [
              SubscriptionPlanType.CUSTOMER_BASIC,
              SubscriptionPlanType.CUSTOMER_PREMIUM,
              SubscriptionPlanType.CUSTOMER_PRO,
            ],
          },
          isActive: true,
        },
        orderBy: { price: 'asc' },
      });
    });

    it('should return vendor plans', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue([mockPlan]);

      // Act
      const result = await service.findPlansByType('vendor');

      // Assert
      expect(result).toEqual([mockPlan]);
      expect(mockPrismaService.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: {
          type: {
            in: [
              SubscriptionPlanType.VENDOR_STARTER,
              SubscriptionPlanType.VENDOR_PROFESSIONAL,
              SubscriptionPlanType.VENDOR_ENTERPRISE,
            ],
          },
          isActive: true,
        },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('findOnePlan', () => {
    it('should return a plan by id', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);

      // Act
      const result = await service.findOnePlan('plan-123');

      // Assert
      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
      });
    });

    it('should throw NotFoundException when plan not found', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOnePlan('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePlan', () => {
    it('should update a subscription plan', async () => {
      // Arrange
      const dto = { name: 'Updated Plan', price: 149.99 };
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.subscriptionPlan.update.mockResolvedValue({
        ...mockPlan,
        ...dto,
      });

      // Act
      const result = await service.updatePlan('plan-123', dto);

      // Assert
      expect(result.name).toBe('Updated Plan');
      expect(mockPrismaService.subscriptionPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: expect.objectContaining({
          name: 'Updated Plan',
          price: 149.99,
        }),
      });
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan with no active subscriptions', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.subscription.count.mockResolvedValue(0);
      mockPrismaService.subscriptionPlan.delete.mockResolvedValue(mockPlan);

      // Act
      const result = await service.deletePlan('plan-123');

      // Assert
      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.subscriptionPlan.delete).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
      });
    });

    it('should throw BadRequestException when plan has active subscriptions', async () => {
      // Arrange
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.subscription.count.mockResolvedValue(5);

      // Act & Assert
      await expect(service.deletePlan('plan-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      // Arrange
      const dto = { planId: 'plan-123' };
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.subscription.create.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionInvoice.create.mockResolvedValue({});

      // Act
      const result = await service.subscribe('user-123', dto);

      // Assert
      expect(result).toEqual(mockSubscription);
      expect(mockPrismaService.subscription.create).toHaveBeenCalled();
    });

    it('should create subscription with trial status when plan has trial days', async () => {
      // Arrange
      const dto = { planId: 'plan-123' };
      const planWithTrial = { ...mockPlan, trialDays: 14 };
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(planWithTrial);
      mockPrismaService.subscription.create.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.TRIAL,
      });

      // Act
      const result = await service.subscribe('user-123', dto);

      // Assert
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.TRIAL,
          }),
        }),
      );
    });

    it('should throw ConflictException when user already has active subscription', async () => {
      // Arrange
      const dto = { planId: 'plan-123' };
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(service.subscribe('user-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when plan is inactive', async () => {
      // Arrange
      const dto = { planId: 'plan-123' };
      const inactivePlan = { ...mockPlan, isActive: false };
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(inactivePlan);

      // Act & Assert
      await expect(service.subscribe('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserSubscription', () => {
    it('should return user current subscription', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.getUserSubscription('user-123');

      // Assert
      expect(result).toEqual(mockSubscription);
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.PAST_DUE,
            ],
          },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return all user subscriptions', async () => {
      // Arrange
      mockPrismaService.subscription.findMany.mockResolvedValue([mockSubscription]);

      // Act
      const result = await service.getUserSubscriptions('user-123');

      // Assert
      expect(result).toEqual([mockSubscription]);
      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription', async () => {
      // Arrange
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscription.update.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      });

      // Act
      const result = await service.cancelSubscription('user-123', 'sub-123');

      // Assert
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: expect.any(Date),
        },
        include: { plan: true },
      });
    });

    it('should throw NotFoundException when subscription not found', async () => {
      // Arrange
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelSubscription('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when subscription already cancelled', async () => {
      // Arrange
      const cancelledSub = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      };
      mockPrismaService.subscription.findUnique.mockResolvedValue(cancelledSub);

      // Act & Assert
      await expect(
        service.cancelSubscription('user-123', 'sub-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a cancelled subscription', async () => {
      // Arrange
      const cancelledSub = {
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      };
      mockPrismaService.subscription.findUnique.mockResolvedValue(cancelledSub);
      mockPrismaService.subscription.update.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: false,
      });

      // Act
      const result = await service.reactivateSubscription('user-123', 'sub-123');

      // Assert
      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
        include: { plan: true },
      });
    });

    it('should throw BadRequestException when subscription is not cancelled', async () => {
      // Arrange
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(
        service.reactivateSubscription('user-123', 'sub-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePlan', () => {
    it('should change subscription plan', async () => {
      // Arrange
      const newPlan = { ...mockPlan, id: 'plan-456', name: 'Enterprise Plan' };
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(newPlan);
      mockPrismaService.subscription.update.mockResolvedValue({
        ...mockSubscription,
        planId: 'plan-456',
      });

      // Act
      const result = await service.changePlan('user-123', 'sub-123', 'plan-456');

      // Assert
      expect(result.planId).toBe('plan-456');
      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          planId: 'plan-456',
        },
        include: { plan: true },
      });
    });

    it('should throw BadRequestException when new plan is inactive', async () => {
      // Arrange
      const inactivePlan = { ...mockPlan, id: 'plan-456', isActive: false };
      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionPlan.findUnique.mockResolvedValue(inactivePlan);

      // Act & Assert
      await expect(
        service.changePlan('user-123', 'sub-123', 'plan-456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('hasBenefit', () => {
    it('should return true when user has the benefit', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.hasBenefit('user-123', 'analytics');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has no subscription', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.hasBenefit('user-123', 'analytics');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserBenefits', () => {
    it('should return user subscription benefits', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.getUserBenefits('user-123');

      // Assert
      expect(result.hasSubscription).toBe(true);
      expect(result.planName).toBe(mockPlan.name);
      expect(result.benefits).toEqual(mockPlan.benefits);
    });

    it('should return empty benefits when user has no subscription', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getUserBenefits('user-123');

      // Assert
      expect(result.hasSubscription).toBe(false);
      expect(result.benefits).toEqual({});
    });
  });

  describe('canPerformAction', () => {
    it('should return true when user can create product within limit', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);
      mockPrismaService.product.count.mockResolvedValue(50);

      // Act
      const result = await service.canPerformAction('user-123', 'createProduct');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user exceeds product limit', async () => {
      // Arrange
      mockPrismaService.subscription.findFirst.mockResolvedValue(mockSubscription);
      mockPrismaService.product.count.mockResolvedValue(100);

      // Act
      const result = await service.canPerformAction('user-123', 'createProduct');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for unlimited products', async () => {
      // Arrange
      const unlimitedPlan = { ...mockPlan, maxProducts: null };
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        plan: unlimitedPlan,
      });

      // Act
      const result = await service.canPerformAction('user-123', 'createProduct');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getInvoices', () => {
    it('should return user invoices', async () => {
      // Arrange
      const mockInvoice = {
        id: 'invoice-123',
        subscriptionId: 'sub-123',
        amount: 99.99,
        subscription: mockSubscription,
      };
      mockPrismaService.subscriptionInvoice.findMany.mockResolvedValue([mockInvoice]);

      // Act
      const result = await service.getInvoices('user-123');

      // Assert
      expect(result).toEqual([mockInvoice]);
      expect(mockPrismaService.subscriptionInvoice.findMany).toHaveBeenCalledWith({
        where: {
          subscription: {
            userId: 'user-123',
          },
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark invoice as paid', async () => {
      // Arrange
      const mockInvoice = {
        id: 'invoice-123',
        status: 'paid',
        paidAt: new Date(),
      };
      mockPrismaService.subscriptionInvoice.update.mockResolvedValue(mockInvoice);

      // Act
      const result = await service.markInvoicePaid('invoice-123', 'pi_123');

      // Assert
      expect(result.status).toBe('paid');
      expect(mockPrismaService.subscriptionInvoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-123' },
        data: {
          status: 'paid',
          paidAt: expect.any(Date),
          stripePaymentIntentId: 'pi_123',
        },
      });
    });
  });

  describe('processSubscriptions', () => {
    it('should expire trials and renew active subscriptions', async () => {
      // Arrange
      mockPrismaService.subscription.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.subscription.findMany.mockResolvedValue([mockSubscription]);
      mockPrismaService.subscription.update.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionInvoice.create.mockResolvedValue({});

      // Act
      await service.processSubscriptions();

      // Assert
      expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.subscription.findMany).toHaveBeenCalled();
    });
  });
});
