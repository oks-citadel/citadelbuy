import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BadRequestException } from '@nestjs/common';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: SubscriptionsService;

  const mockSubscriptionsService = {
    createPlan: jest.fn(),
    findAllPlans: jest.fn(),
    findPlansByType: jest.fn(),
    findOnePlan: jest.fn(),
    updatePlan: jest.fn(),
    deletePlan: jest.fn(),
    subscribe: jest.fn(),
    getUserSubscription: jest.fn(),
    getUserSubscriptions: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
    changePlan: jest.fn(),
    getUserBenefits: jest.fn(),
    canPerformAction: jest.fn(),
    getInvoices: jest.fn(),
    processSubscriptions: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
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
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    service = module.get<SubscriptionsService>(SubscriptionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // SUBSCRIPTION PLANS (Admin & Public)
  // ============================================

  describe('createPlan (Admin)', () => {
    it('should create a subscription plan', async () => {
      const dto = {
        name: 'Premium Plan',
        price: 29.99,
        interval: 'monthly' as const,
        features: ['Feature 1', 'Feature 2'],
      };
      const mockPlan = { id: 'plan-123', ...dto };

      mockSubscriptionsService.createPlan.mockResolvedValue(mockPlan);

      const result = await controller.createPlan(dto);

      expect(result).toEqual(mockPlan);
      expect(mockSubscriptionsService.createPlan).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAllPlans (Public)', () => {
    it('should return all active plans when includeInactive is not provided', async () => {
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', isActive: true },
        { id: 'plan-2', name: 'Premium', isActive: true },
      ];

      mockSubscriptionsService.findAllPlans.mockResolvedValue(mockPlans);

      const result = await controller.findAllPlans(undefined);

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionsService.findAllPlans).toHaveBeenCalledWith(false);
    });

    it('should return all plans including inactive when includeInactive is true', async () => {
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', isActive: true },
        { id: 'plan-2', name: 'Old Plan', isActive: false },
      ];

      mockSubscriptionsService.findAllPlans.mockResolvedValue(mockPlans);

      const result = await controller.findAllPlans('true');

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionsService.findAllPlans).toHaveBeenCalledWith(true);
    });

    it('should return only active plans when includeInactive is false', async () => {
      const mockPlans = [{ id: 'plan-1', name: 'Basic', isActive: true }];

      mockSubscriptionsService.findAllPlans.mockResolvedValue(mockPlans);

      const result = await controller.findAllPlans('false');

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionsService.findAllPlans).toHaveBeenCalledWith(false);
    });
  });

  describe('findPlansByType (Public)', () => {
    it('should return plans by type (customer)', async () => {
      const mockPlans = [{ id: 'plan-1', type: 'customer' }];

      mockSubscriptionsService.findPlansByType.mockResolvedValue(mockPlans);

      const result = await controller.findPlansByType('customer');

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionsService.findPlansByType).toHaveBeenCalledWith('customer');
    });

    it('should return plans by type (vendor)', async () => {
      const mockPlans = [{ id: 'plan-2', type: 'vendor' }];

      mockSubscriptionsService.findPlansByType.mockResolvedValue(mockPlans);

      const result = await controller.findPlansByType('vendor');

      expect(result).toEqual(mockPlans);
      expect(mockSubscriptionsService.findPlansByType).toHaveBeenCalledWith('vendor');
    });

    it('should throw error for invalid type', () => {
      expect(() => controller.findPlansByType('invalid' as any)).toThrow(
        BadRequestException
      );
      expect(mockSubscriptionsService.findPlansByType).not.toHaveBeenCalled();
    });
  });

  describe('findOnePlan (Public)', () => {
    it('should return a subscription plan by ID', async () => {
      const mockPlan = { id: 'plan-123', name: 'Premium' };

      mockSubscriptionsService.findOnePlan.mockResolvedValue(mockPlan);

      const result = await controller.findOnePlan('plan-123');

      expect(result).toEqual(mockPlan);
      expect(mockSubscriptionsService.findOnePlan).toHaveBeenCalledWith('plan-123');
    });
  });

  describe('updatePlan (Admin)', () => {
    it('should update a subscription plan', async () => {
      const dto = { name: 'Updated Plan', price: 39.99 };
      const mockPlan = { id: 'plan-123', ...dto };

      mockSubscriptionsService.updatePlan.mockResolvedValue(mockPlan);

      const result = await controller.updatePlan('plan-123', dto);

      expect(result).toEqual(mockPlan);
      expect(mockSubscriptionsService.updatePlan).toHaveBeenCalledWith('plan-123', dto);
    });
  });

  describe('deletePlan (Admin)', () => {
    it('should delete a subscription plan', async () => {
      const mockResult = { success: true };

      mockSubscriptionsService.deletePlan.mockResolvedValue(mockResult);

      const result = await controller.deletePlan('plan-123');

      expect(result).toEqual(mockResult);
      expect(mockSubscriptionsService.deletePlan).toHaveBeenCalledWith('plan-123');
    });
  });

  // ============================================
  // USER SUBSCRIPTIONS
  // ============================================

  describe('subscribe', () => {
    it('should create a subscription for the user', async () => {
      const dto = { planId: 'plan-123', paymentMethodId: 'pm_123' };
      const mockRequest = { user: mockUser };
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        planId: 'plan-123',
      };

      mockSubscriptionsService.subscribe.mockResolvedValue(mockSubscription);

      const result = await controller.subscribe(mockRequest as any, dto);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionsService.subscribe).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getUserSubscription', () => {
    it('should return the current user subscription', async () => {
      const mockRequest = { user: mockUser };
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        status: 'ACTIVE',
      };

      mockSubscriptionsService.getUserSubscription.mockResolvedValue(mockSubscription);

      const result = await controller.getUserSubscription(mockRequest as any);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionsService.getUserSubscription).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return all user subscriptions', async () => {
      const mockRequest = { user: mockUser };
      const mockSubscriptions = [
        { id: 'sub-1', userId: 'user-123', status: 'ACTIVE' },
        { id: 'sub-2', userId: 'user-123', status: 'CANCELLED' },
      ];

      mockSubscriptionsService.getUserSubscriptions.mockResolvedValue(mockSubscriptions);

      const result = await controller.getUserSubscriptions(mockRequest as any);

      expect(result).toEqual(mockSubscriptions);
      expect(mockSubscriptionsService.getUserSubscriptions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a user subscription', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { success: true, message: 'Subscription cancelled' };

      mockSubscriptionsService.cancelSubscription.mockResolvedValue(mockResult);

      const result = await controller.cancelSubscription(mockRequest as any, 'sub-123');

      expect(result).toEqual(mockResult);
      expect(mockSubscriptionsService.cancelSubscription).toHaveBeenCalledWith('user-123', 'sub-123');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a cancelled subscription', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { success: true, message: 'Subscription reactivated' };

      mockSubscriptionsService.reactivateSubscription.mockResolvedValue(mockResult);

      const result = await controller.reactivateSubscription(mockRequest as any, 'sub-123');

      expect(result).toEqual(mockResult);
      expect(mockSubscriptionsService.reactivateSubscription).toHaveBeenCalledWith('user-123', 'sub-123');
    });
  });

  describe('changePlan', () => {
    it('should change subscription plan', async () => {
      const mockRequest = { user: mockUser };
      const body = { planId: 'plan-456' };
      const mockResult = { success: true, newPlanId: 'plan-456' };

      mockSubscriptionsService.changePlan.mockResolvedValue(mockResult);

      const result = await controller.changePlan(mockRequest as any, 'sub-123', body);

      expect(result).toEqual(mockResult);
      expect(mockSubscriptionsService.changePlan).toHaveBeenCalledWith('user-123', 'sub-123', 'plan-456');
    });
  });

  // ============================================
  // BENEFITS & FEATURES
  // ============================================

  describe('getUserBenefits', () => {
    it('should return user subscription benefits', async () => {
      const mockRequest = { user: mockUser };
      const mockBenefits = {
        features: ['Feature 1', 'Feature 2'],
        limits: { products: 100, ads: 10 },
      };

      mockSubscriptionsService.getUserBenefits.mockResolvedValue(mockBenefits);

      const result = await controller.getUserBenefits(mockRequest as any);

      expect(result).toEqual(mockBenefits);
      expect(mockSubscriptionsService.getUserBenefits).toHaveBeenCalledWith('user-123');
    });
  });

  describe('canPerformAction', () => {
    it('should check if user can create product', async () => {
      const mockRequest = { user: mockUser };

      mockSubscriptionsService.canPerformAction.mockResolvedValue(true);

      const result = await controller.canPerformAction(mockRequest as any, 'createProduct');

      expect(result).toEqual({ can: true });
      expect(mockSubscriptionsService.canPerformAction).toHaveBeenCalledWith('user-123', 'createProduct');
    });

    it('should check if user can create ad', async () => {
      const mockRequest = { user: mockUser };

      mockSubscriptionsService.canPerformAction.mockResolvedValue(false);

      const result = await controller.canPerformAction(mockRequest as any, 'createAd');

      expect(result).toEqual({ can: false });
      expect(mockSubscriptionsService.canPerformAction).toHaveBeenCalledWith('user-123', 'createAd');
    });

    it('should throw error for invalid action', async () => {
      const mockRequest = { user: mockUser };

      await expect(
        controller.canPerformAction(mockRequest as any, 'invalidAction')
      ).rejects.toThrow('Invalid action');
      expect(mockSubscriptionsService.canPerformAction).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // INVOICES
  // ============================================

  describe('getInvoices', () => {
    it('should return all user invoices', async () => {
      const mockRequest = { user: mockUser };
      const mockInvoices = [
        { id: 'inv-1', amount: 29.99, status: 'PAID' },
        { id: 'inv-2', amount: 29.99, status: 'PENDING' },
      ];

      mockSubscriptionsService.getInvoices.mockResolvedValue(mockInvoices);

      const result = await controller.getInvoices(mockRequest as any, undefined);

      expect(result).toEqual(mockInvoices);
      expect(mockSubscriptionsService.getInvoices).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should return invoices filtered by subscriptionId', async () => {
      const mockRequest = { user: mockUser };
      const mockInvoices = [{ id: 'inv-1', amount: 29.99, subscriptionId: 'sub-123' }];

      mockSubscriptionsService.getInvoices.mockResolvedValue(mockInvoices);

      const result = await controller.getInvoices(mockRequest as any, 'sub-123');

      expect(result).toEqual(mockInvoices);
      expect(mockSubscriptionsService.getInvoices).toHaveBeenCalledWith('user-123', 'sub-123');
    });
  });

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  describe('processSubscriptions (Admin)', () => {
    it('should process subscriptions', async () => {
      mockSubscriptionsService.processSubscriptions.mockResolvedValue(undefined);

      const result = await controller.processSubscriptions();

      expect(result).toEqual({ message: 'Subscriptions processed successfully' });
      expect(mockSubscriptionsService.processSubscriptions).toHaveBeenCalled();
    });
  });
});
