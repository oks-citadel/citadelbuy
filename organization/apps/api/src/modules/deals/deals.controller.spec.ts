import { Test, TestingModule } from '@nestjs/testing';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('DealsController', () => {
  let controller: DealsController;
  let service: DealsService;

  const mockDealsService = {
    getDeals: jest.fn(),
    getFeaturedDeals: jest.fn(),
    getActiveDeals: jest.fn(),
    getDealById: jest.fn(),
    calculateDealPrice: jest.fn(),
    trackDealView: jest.fn(),
    trackDealClick: jest.fn(),
    checkDealEligibility: jest.fn(),
    recordDealPurchase: jest.fn(),
    getUserDealPurchases: jest.fn(),
    createDeal: jest.fn(),
    updateDeal: jest.fn(),
    deleteDeal: jest.fn(),
    addProductsToDeal: jest.fn(),
    removeProductFromDeal: jest.fn(),
    updateDealProduct: jest.fn(),
    getDealAnalytics: jest.fn(),
    getAllDealsAnalytics: jest.fn(),
    notifyDeal: jest.fn(),
    activateScheduledDeals: jest.fn(),
    endExpiredDeals: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  const mockDeal = {
    id: 'deal-1',
    title: 'Flash Sale',
    description: 'Limited time offer',
    discountPercent: 20,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    isActive: true,
    isFeatured: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealsController],
      providers: [
        {
          provide: DealsService,
          useValue: mockDealsService,
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
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<DealsController>(DealsController);
    service = module.get<DealsService>(DealsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Public Endpoints
  describe('getDeals', () => {
    it('should return all deals with query', async () => {
      const query = { page: 1, limit: 20, isActive: true };
      const mockRequest = { user: mockUser };
      mockDealsService.getDeals.mockResolvedValue({ deals: [mockDeal], total: 1 });

      const result = await controller.getDeals(query, mockRequest as any);

      expect(result).toEqual({ deals: [mockDeal], total: 1 });
      expect(mockDealsService.getDeals).toHaveBeenCalledWith(query, 'user-123');
    });

    it('should work without authenticated user', async () => {
      const query = { page: 1, limit: 20 };
      mockDealsService.getDeals.mockResolvedValue({ deals: [], total: 0 });

      await controller.getDeals(query, undefined);

      expect(mockDealsService.getDeals).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('getFeaturedDeals', () => {
    it('should return featured deals', async () => {
      const featuredDeals = [{ ...mockDeal, isFeatured: true }];
      mockDealsService.getFeaturedDeals.mockResolvedValue(featuredDeals);

      const result = await controller.getFeaturedDeals(undefined);

      expect(result).toEqual(featuredDeals);
      expect(mockDealsService.getFeaturedDeals).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getActiveDeals', () => {
    it('should return active deals', async () => {
      const activeDeals = [mockDeal];
      mockDealsService.getActiveDeals.mockResolvedValue(activeDeals);

      const result = await controller.getActiveDeals(undefined);

      expect(result).toEqual(activeDeals);
      expect(mockDealsService.getActiveDeals).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getDealById', () => {
    it('should return deal by id', async () => {
      mockDealsService.getDealById.mockResolvedValue(mockDeal);

      const result = await controller.getDealById('deal-1', undefined);

      expect(result).toEqual(mockDeal);
      expect(mockDealsService.getDealById).toHaveBeenCalledWith('deal-1', undefined);
    });
  });

  describe('calculateDealPrice', () => {
    it('should calculate deal price', async () => {
      const dto = { dealId: 'deal-1', productId: 'product-1', quantity: 2 };
      const mockPrice = { originalPrice: 100, dealPrice: 80, savings: 20 };
      mockDealsService.calculateDealPrice.mockResolvedValue(mockPrice);

      const result = await controller.calculateDealPrice(dto);

      expect(result).toEqual(mockPrice);
      expect(mockDealsService.calculateDealPrice).toHaveBeenCalledWith(dto);
    });
  });

  describe('trackDealView', () => {
    it('should track deal view', async () => {
      const dto = { userId: 'user-123', sessionId: 'session-1' };
      mockDealsService.trackDealView.mockResolvedValue({ success: true });

      const result = await controller.trackDealView('deal-1', dto);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.trackDealView).toHaveBeenCalledWith({
        dealId: 'deal-1',
        ...dto,
      });
    });
  });

  describe('trackDealClick', () => {
    it('should track deal click', async () => {
      const dto = { userId: 'user-123', productId: 'product-1' };
      mockDealsService.trackDealClick.mockResolvedValue({ success: true });

      const result = await controller.trackDealClick('deal-1', dto);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.trackDealClick).toHaveBeenCalledWith({
        dealId: 'deal-1',
        ...dto,
      });
    });
  });

  // Customer Endpoints
  describe('checkDealEligibility', () => {
    it('should check deal eligibility', async () => {
      const mockRequest = { user: mockUser };
      const mockEligibility = { eligible: true, reason: null };
      mockDealsService.checkDealEligibility.mockResolvedValue(mockEligibility);

      const result = await controller.checkDealEligibility('deal-1', mockRequest as any, 2);

      expect(result).toEqual(mockEligibility);
      expect(mockDealsService.checkDealEligibility).toHaveBeenCalledWith({
        dealId: 'deal-1',
        userId: 'user-123',
        quantity: 2,
      });
    });
  });

  describe('recordDealPurchase', () => {
    it('should record deal purchase', async () => {
      const dto = { dealId: 'deal-1', productId: 'product-1', quantity: 2, orderId: 'order-1' };
      const mockRequest = { user: mockUser };
      mockDealsService.recordDealPurchase.mockResolvedValue({ success: true });

      const result = await controller.recordDealPurchase(dto, mockRequest as any);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.recordDealPurchase).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('getMyDealPurchases', () => {
    it('should return user deal purchases', async () => {
      const mockRequest = { user: mockUser };
      const mockPurchases = [{ id: 'purchase-1', dealId: 'deal-1' }];
      mockDealsService.getUserDealPurchases.mockResolvedValue(mockPurchases);

      const result = await controller.getMyDealPurchases(mockRequest as any, 20);

      expect(result).toEqual(mockPurchases);
      expect(mockDealsService.getUserDealPurchases).toHaveBeenCalledWith('user-123', 20);
    });

    it('should use default limit', async () => {
      const mockRequest = { user: mockUser };
      mockDealsService.getUserDealPurchases.mockResolvedValue([]);

      await controller.getMyDealPurchases(mockRequest as any, undefined);

      expect(mockDealsService.getUserDealPurchases).toHaveBeenCalledWith('user-123', 20);
    });
  });

  // Admin Endpoints
  describe('createDeal', () => {
    it('should create deal', async () => {
      const createDto = {
        title: 'New Deal',
        description: 'Great deal',
        discountPercent: 25,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      };
      mockDealsService.createDeal.mockResolvedValue(mockDeal);

      const result = await controller.createDeal(createDto);

      expect(result).toEqual(mockDeal);
      expect(mockDealsService.createDeal).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateDeal', () => {
    it('should update deal', async () => {
      const updateDto = { title: 'Updated Deal', discountPercent: 30 };
      const updatedDeal = { ...mockDeal, ...updateDto };
      mockDealsService.updateDeal.mockResolvedValue(updatedDeal);

      const result = await controller.updateDeal('deal-1', updateDto);

      expect(result).toEqual(updatedDeal);
      expect(mockDealsService.updateDeal).toHaveBeenCalledWith('deal-1', updateDto);
    });
  });

  describe('deleteDeal', () => {
    it('should delete deal', async () => {
      mockDealsService.deleteDeal.mockResolvedValue({ success: true });

      const result = await controller.deleteDeal('deal-1');

      expect(result).toEqual({ success: true });
      expect(mockDealsService.deleteDeal).toHaveBeenCalledWith('deal-1');
    });
  });

  describe('addProductsToDeal', () => {
    it('should add products to deal', async () => {
      const dto = { products: [{ productId: 'product-1', discountPercent: 20 }] };
      mockDealsService.addProductsToDeal.mockResolvedValue({ success: true });

      const result = await controller.addProductsToDeal('deal-1', dto);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.addProductsToDeal).toHaveBeenCalledWith('deal-1', dto);
    });
  });

  describe('removeProductFromDeal', () => {
    it('should remove product from deal', async () => {
      mockDealsService.removeProductFromDeal.mockResolvedValue({ success: true });

      const result = await controller.removeProductFromDeal('deal-1', 'product-1');

      expect(result).toEqual({ success: true });
      expect(mockDealsService.removeProductFromDeal).toHaveBeenCalledWith('deal-1', 'product-1');
    });
  });

  describe('updateDealProduct', () => {
    it('should update deal product', async () => {
      const dto = { discountPercent: 25 };
      mockDealsService.updateDealProduct.mockResolvedValue({ success: true });

      const result = await controller.updateDealProduct('deal-product-1', dto);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.updateDealProduct).toHaveBeenCalledWith('deal-product-1', dto);
    });
  });

  describe('getDealAnalytics', () => {
    it('should return deal analytics', async () => {
      const mockAnalytics = { views: 100, clicks: 50, purchases: 10 };
      mockDealsService.getDealAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getDealAnalytics('deal-1');

      expect(result).toEqual(mockAnalytics);
      expect(mockDealsService.getDealAnalytics).toHaveBeenCalledWith('deal-1');
    });
  });

  describe('getAllDealsAnalytics', () => {
    it('should return all deals analytics', async () => {
      const mockAnalytics = { totalDeals: 5, totalRevenue: 1000 };
      mockDealsService.getAllDealsAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAllDealsAnalytics('2024-01-01', '2024-01-31');

      expect(result).toEqual(mockAnalytics);
      expect(mockDealsService.getAllDealsAnalytics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });

    it('should work without date filters', async () => {
      mockDealsService.getAllDealsAnalytics.mockResolvedValue({});

      await controller.getAllDealsAnalytics(undefined, undefined);

      expect(mockDealsService.getAllDealsAnalytics).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('notifyDeal', () => {
    it('should send deal notifications', async () => {
      const dto = { userIds: ['user-1', 'user-2'], message: 'New deal!' };
      mockDealsService.notifyDeal.mockResolvedValue({ success: true });

      const result = await controller.notifyDeal('deal-1', dto);

      expect(result).toEqual({ success: true });
      expect(mockDealsService.notifyDeal).toHaveBeenCalledWith({
        dealId: 'deal-1',
        ...dto,
      });
    });
  });

  describe('activateScheduledDeals', () => {
    it('should activate scheduled deals', async () => {
      mockDealsService.activateScheduledDeals.mockResolvedValue({ activated: 3 });

      const result = await controller.activateScheduledDeals();

      expect(result).toEqual({ activated: 3 });
      expect(mockDealsService.activateScheduledDeals).toHaveBeenCalled();
    });
  });

  describe('endExpiredDeals', () => {
    it('should end expired deals', async () => {
      mockDealsService.endExpiredDeals.mockResolvedValue({ ended: 2 });

      const result = await controller.endExpiredDeals();

      expect(result).toEqual({ ended: 2 });
      expect(mockDealsService.endExpiredDeals).toHaveBeenCalled();
    });
  });
});
