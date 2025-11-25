import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserActionType } from '@prisma/client';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  const mockRecommendationsService = {
    trackBehavior: jest.fn(),
    getPersonalizedRecommendations: jest.fn(),
    getSimilarProducts: jest.fn(),
    getFrequentlyBoughtTogether: jest.fn(),
    getTrendingProducts: jest.fn(),
    getRecentlyViewed: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
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

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('trackBehavior', () => {
    it('should track user behavior with all parameters', async () => {
      const data = {
        userId: 'user-123',
        sessionId: 'session-456',
        productId: 'product-789',
        categoryId: 'cat-1',
        actionType: UserActionType.VIEW,
      };
      const mockResult = { success: true, tracked: true };

      mockRecommendationsService.trackBehavior.mockResolvedValue(mockResult);

      const result = await controller.trackBehavior(data);

      expect(result).toEqual(mockResult);
      expect(mockRecommendationsService.trackBehavior).toHaveBeenCalledWith(data);
    });

    it('should track behavior with only session and product', async () => {
      const data = {
        sessionId: 'session-456',
        productId: 'product-789',
        actionType: UserActionType.ADD_TO_CART,
      };
      const mockResult = { success: true, tracked: true };

      mockRecommendationsService.trackBehavior.mockResolvedValue(mockResult);

      const result = await controller.trackBehavior(data);

      expect(result).toEqual(mockResult);
      expect(mockRecommendationsService.trackBehavior).toHaveBeenCalledWith(data);
    });

    it('should track category view behavior', async () => {
      const data = {
        userId: 'user-123',
        categoryId: 'cat-1',
        actionType: UserActionType.VIEW,
      };
      const mockResult = { success: true, tracked: true };

      mockRecommendationsService.trackBehavior.mockResolvedValue(mockResult);

      const result = await controller.trackBehavior(data);

      expect(result).toEqual(mockResult);
      expect(mockRecommendationsService.trackBehavior).toHaveBeenCalledWith(data);
    });
  });

  describe('getPersonalized', () => {
    it('should get personalized recommendations with default limit', async () => {
      const mockRequest = { user: mockUser };
      const mockRecommendations = [
        { id: 'prod-1', name: 'Laptop', score: 0.95 },
        { id: 'prod-2', name: 'Mouse', score: 0.88 },
      ];

      mockRecommendationsService.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);

      const result = await controller.getPersonalized(mockRequest as any, undefined);

      expect(result).toEqual(mockRecommendations);
      expect(mockRecommendationsService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123',
        10
      );
    });

    it('should get personalized recommendations with custom limit', async () => {
      const mockRequest = { user: mockUser };
      const mockRecommendations = [{ id: 'prod-1', name: 'Laptop', score: 0.95 }];

      mockRecommendationsService.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);

      const result = await controller.getPersonalized(mockRequest as any, '5');

      expect(result).toEqual(mockRecommendations);
      expect(mockRecommendationsService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123',
        5
      );
    });
  });

  describe('getSimilar', () => {
    it('should get similar products with default limit', async () => {
      const mockSimilar = [
        { id: 'prod-2', name: 'Similar Laptop 1', similarity: 0.92 },
        { id: 'prod-3', name: 'Similar Laptop 2', similarity: 0.88 },
      ];

      mockRecommendationsService.getSimilarProducts.mockResolvedValue(mockSimilar);

      const result = await controller.getSimilar('product-123', undefined);

      expect(result).toEqual(mockSimilar);
      expect(mockRecommendationsService.getSimilarProducts).toHaveBeenCalledWith('product-123', 6);
    });

    it('should get similar products with custom limit', async () => {
      const mockSimilar = [{ id: 'prod-2', name: 'Similar Laptop', similarity: 0.92 }];

      mockRecommendationsService.getSimilarProducts.mockResolvedValue(mockSimilar);

      const result = await controller.getSimilar('product-123', '3');

      expect(result).toEqual(mockSimilar);
      expect(mockRecommendationsService.getSimilarProducts).toHaveBeenCalledWith('product-123', 3);
    });
  });

  describe('getFrequentlyBought', () => {
    it('should get frequently bought together products', async () => {
      const mockFrequentlyBought = [
        { id: 'prod-2', name: 'Mouse', frequency: 150 },
        { id: 'prod-3', name: 'Keyboard', frequency: 120 },
      ];

      mockRecommendationsService.getFrequentlyBoughtTogether.mockResolvedValue(mockFrequentlyBought);

      const result = await controller.getFrequentlyBought('product-123');

      expect(result).toEqual(mockFrequentlyBought);
      expect(mockRecommendationsService.getFrequentlyBoughtTogether).toHaveBeenCalledWith(
        'product-123'
      );
    });
  });

  describe('getTrending', () => {
    it('should get trending products with default limit', async () => {
      const mockTrending = [
        { id: 'prod-1', name: 'Hot Product', trendScore: 0.98 },
        { id: 'prod-2', name: 'Popular Item', trendScore: 0.95 },
      ];

      mockRecommendationsService.getTrendingProducts.mockResolvedValue(mockTrending);

      const result = await controller.getTrending(undefined);

      expect(result).toEqual(mockTrending);
      expect(mockRecommendationsService.getTrendingProducts).toHaveBeenCalledWith(10);
    });

    it('should get trending products with custom limit', async () => {
      const mockTrending = [{ id: 'prod-1', name: 'Hot Product', trendScore: 0.98 }];

      mockRecommendationsService.getTrendingProducts.mockResolvedValue(mockTrending);

      const result = await controller.getTrending('5');

      expect(result).toEqual(mockTrending);
      expect(mockRecommendationsService.getTrendingProducts).toHaveBeenCalledWith(5);
    });
  });

  describe('getRecentlyViewed', () => {
    it('should get recently viewed products with default limit', async () => {
      const mockRequest = { user: mockUser };
      const mockRecentlyViewed = [
        { id: 'prod-1', name: 'Laptop', viewedAt: new Date() },
        { id: 'prod-2', name: 'Phone', viewedAt: new Date() },
      ];

      mockRecommendationsService.getRecentlyViewed.mockResolvedValue(mockRecentlyViewed);

      const result = await controller.getRecentlyViewed(mockRequest as any, undefined);

      expect(result).toEqual(mockRecentlyViewed);
      expect(mockRecommendationsService.getRecentlyViewed).toHaveBeenCalledWith('user-123', 10);
    });

    it('should get recently viewed products with custom limit', async () => {
      const mockRequest = { user: mockUser };
      const mockRecentlyViewed = [{ id: 'prod-1', name: 'Laptop', viewedAt: new Date() }];

      mockRecommendationsService.getRecentlyViewed.mockResolvedValue(mockRecentlyViewed);

      const result = await controller.getRecentlyViewed(mockRequest as any, '3');

      expect(result).toEqual(mockRecentlyViewed);
      expect(mockRecommendationsService.getRecentlyViewed).toHaveBeenCalledWith('user-123', 3);
    });
  });
});
