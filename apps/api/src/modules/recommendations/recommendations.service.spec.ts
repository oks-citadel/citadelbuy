import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserActionType } from '@prisma/client';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userBehavior: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    productRecommendation: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  // Mock data
  const mockProduct = {
    id: 'product-123',
    name: 'Laptop',
    price: 999.99,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    reviews: [{ rating: 5 }, { rating: 4 }],
  };

  const mockBehavior = {
    id: 'behavior-1',
    userId: 'user-123',
    sessionId: 'session-1',
    productId: 'product-123',
    categoryId: 'cat-1',
    actionType: 'VIEW' as UserActionType,
    searchQuery: null,
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackBehavior', () => {
    it('should track user behavior', async () => {
      // Arrange
      const behaviorData = {
        userId: 'user-123',
        sessionId: 'session-1',
        productId: 'product-123',
        categoryId: 'cat-1',
        actionType: 'VIEW' as UserActionType,
        searchQuery: 'laptop',
        metadata: { source: 'homepage' },
      };
      mockPrismaService.userBehavior.create.mockResolvedValue(mockBehavior);

      // Act
      const result = await service.trackBehavior(behaviorData);

      // Assert
      expect(result).toEqual(mockBehavior);
      expect(mockPrismaService.userBehavior.create).toHaveBeenCalledWith({
        data: behaviorData,
      });
    });

    it('should track behavior for anonymous users', async () => {
      // Arrange
      const anonymousData = {
        sessionId: 'session-1',
        productId: 'product-123',
        actionType: 'VIEW' as UserActionType,
      };
      mockPrismaService.userBehavior.create.mockResolvedValue({
        ...mockBehavior,
        userId: null,
      });

      // Act
      await service.trackBehavior(anonymousData);

      // Assert
      expect(mockPrismaService.userBehavior.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          productId: 'product-123',
          actionType: 'VIEW',
        }),
      });
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations based on user behavior', async () => {
      // Arrange
      const userId = 'user-123';
      const recentBehaviors = [
        { ...mockBehavior, productId: 'product-1', categoryId: 'cat-1' },
        { ...mockBehavior, productId: 'product-2', categoryId: 'cat-1' },
      ];
      mockPrismaService.userBehavior.findMany.mockResolvedValue(recentBehaviors);
      mockPrismaService.productRecommendation.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getPersonalizedRecommendations(userId, 10);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.userBehavior.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          actionType: { in: ['VIEW', 'PURCHASE', 'WISHLIST'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return trending products for new users with no behaviors', async () => {
      // Arrange
      const userId = 'new-user';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockPrismaService.userBehavior.findMany.mockResolvedValue([]);
      mockPrismaService.userBehavior.groupBy.mockResolvedValue([
        { productId: 'product-123', _count: { productId: 10 } },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getPersonalizedRecommendations(userId, 10);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.userBehavior.groupBy).toHaveBeenCalled();
    });

    it('should exclude products user has already interacted with', async () => {
      // Arrange
      const userId = 'user-123';
      const recentBehaviors = [
        { ...mockBehavior, productId: 'product-1', categoryId: 'cat-1' },
        { ...mockBehavior, productId: 'product-2', categoryId: 'cat-1' },
      ];
      mockPrismaService.userBehavior.findMany.mockResolvedValue(recentBehaviors);
      mockPrismaService.productRecommendation.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      await service.getPersonalizedRecommendations(userId, 10);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['product-1', 'product-2'] },
          }),
        }),
      );
    });
  });

  describe('getSimilarProducts', () => {
    it('should return precomputed similar products', async () => {
      // Arrange
      const productId = 'product-123';
      const recommendations = [
        {
          productId,
          recommendedProductId: 'product-456',
          score: 0.9,
          type: 'SIMILAR',
        },
      ];
      mockPrismaService.productRecommendation.findMany.mockResolvedValue(recommendations);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getSimilarProducts(productId, 6);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.productRecommendation.findMany).toHaveBeenCalledWith({
        where: {
          productId,
          type: 'SIMILAR',
        },
        orderBy: { score: 'desc' },
        take: 6,
      });
    });

    it('should fallback to same category products when no precomputed recommendations', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.productRecommendation.findMany.mockResolvedValue([]);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.findMany.mockResolvedValue([
        { ...mockProduct, id: 'product-456' },
      ]);

      // Act
      const result = await service.getSimilarProducts(productId, 6);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: mockProduct.categoryId,
          id: { not: productId },
        },
        include: { category: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when product not found', async () => {
      // Arrange
      const productId = 'nonexistent';
      mockPrismaService.productRecommendation.findMany.mockResolvedValue([]);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getSimilarProducts(productId, 6);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getFrequentlyBoughtTogether', () => {
    it('should return products frequently bought together', async () => {
      // Arrange
      const productId = 'product-123';
      const orderItems = [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ];
      const coOccurring = [
        { productId: 'product-456', _count: { productId: 5 } },
        { productId: 'product-789', _count: { productId: 3 } },
      ];
      mockPrismaService.orderItem.findMany.mockResolvedValue(orderItems);
      mockPrismaService.orderItem.groupBy.mockResolvedValue(coOccurring);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getFrequentlyBoughtTogether(productId, 4);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.orderItem.groupBy).toHaveBeenCalledWith({
        by: ['productId'],
        where: {
          orderId: { in: ['order-1', 'order-2'] },
          productId: { not: productId },
        },
        _count: { productId: true },
        orderBy: {
          _count: { productId: 'desc' },
        },
        take: 4,
      });
    });

    it('should return empty array when product has no orders', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getFrequentlyBoughtTogether(productId, 4);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTrendingProducts', () => {
    it('should return trending products from last 30 days', async () => {
      // Arrange
      const trending = [
        { productId: 'product-123', _count: { productId: 50 } },
        { productId: 'product-456', _count: { productId: 30 } },
      ];
      mockPrismaService.userBehavior.groupBy.mockResolvedValue(trending);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getTrendingProducts(10);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.userBehavior.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['productId'],
          where: expect.objectContaining({
            actionType: { in: ['VIEW', 'PURCHASE'] },
            productId: { not: null },
            createdAt: { gte: expect.any(Date) },
          }),
          _count: { productId: true },
          orderBy: {
            _count: { productId: 'desc' },
          },
          take: 10,
        }),
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      const trending = [
        { productId: 'product-123', _count: { productId: 50 } },
      ];
      mockPrismaService.userBehavior.groupBy.mockResolvedValue(trending);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      await service.getTrendingProducts(5);

      // Assert
      expect(mockPrismaService.userBehavior.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getRecommendationsByCategory', () => {
    it('should return products from specified category', async () => {
      // Arrange
      const categoryId = 'cat-1';
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getRecommendationsByCategory(categoryId, 10);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { categoryId },
        include: {
          category: true,
          reviews: {
            select: { rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });

  describe('getRecentlyViewed', () => {
    it('should return recently viewed products', async () => {
      // Arrange
      const userId = 'user-123';
      const recentViews = [
        { ...mockBehavior, productId: 'product-1' },
        { ...mockBehavior, productId: 'product-2' },
        { ...mockBehavior, productId: 'product-3' },
      ];
      mockPrismaService.userBehavior.findMany.mockResolvedValue(recentViews);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      const result = await service.getRecentlyViewed(userId, 10);

      // Assert
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.userBehavior.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          actionType: 'VIEW',
          productId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['productId'],
        take: 10,
      });
    });

    it('should return distinct products only', async () => {
      // Arrange
      const userId = 'user-123';
      const recentViews = [
        { ...mockBehavior, productId: 'product-1' },
        { ...mockBehavior, productId: 'product-1' }, // Duplicate
        { ...mockBehavior, productId: 'product-2' },
      ];
      mockPrismaService.userBehavior.findMany.mockResolvedValue(recentViews);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      // Act
      await service.getRecentlyViewed(userId, 10);

      // Assert
      expect(mockPrismaService.userBehavior.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['productId'],
        }),
      );
    });
  });

  describe('computeProductRecommendations', () => {
    it('should compute and store product recommendations', async () => {
      // Arrange
      const productId = 'product-123';
      const orderItems = [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ];
      const coOccurring = [
        { productId: 'product-456', _count: { productId: 10 } },
        { productId: 'product-789', _count: { productId: 5 } },
      ];
      mockPrismaService.orderItem.findMany.mockResolvedValue(orderItems);
      mockPrismaService.orderItem.groupBy.mockResolvedValue(coOccurring);
      mockPrismaService.productRecommendation.upsert.mockResolvedValue({
        productId,
        recommendedProductId: 'product-456',
        score: 1.0,
        type: 'SIMILAR',
      });

      // Act
      const result = await service.computeProductRecommendations(productId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        productId,
        recommendedProductId: 'product-456',
        score: 1.0,
        type: 'SIMILAR',
      });
      expect(mockPrismaService.productRecommendation.upsert).toHaveBeenCalledTimes(2);
    });

    it('should upsert recommendations with correct score', async () => {
      // Arrange
      const productId = 'product-123';
      const orderItems = [{ orderId: 'order-1' }];
      const coOccurring = [
        { productId: 'product-456', _count: { productId: 10 } },
        { productId: 'product-789', _count: { productId: 5 } },
      ];
      mockPrismaService.orderItem.findMany.mockResolvedValue(orderItems);
      mockPrismaService.orderItem.groupBy.mockResolvedValue(coOccurring);
      mockPrismaService.productRecommendation.upsert.mockResolvedValue({});

      // Act
      const result = await service.computeProductRecommendations(productId);

      // Assert
      expect(result[0].score).toBe(1.0); // 10/10 = 1.0
      expect(result[1].score).toBe(0.5); // 5/10 = 0.5
      expect(mockPrismaService.productRecommendation.upsert).toHaveBeenCalledWith({
        where: {
          productId_recommendedProductId_type: {
            productId,
            recommendedProductId: 'product-456',
            type: 'SIMILAR',
          },
        },
        update: { score: 1.0 },
        create: {
          productId,
          recommendedProductId: 'product-456',
          score: 1.0,
          type: 'SIMILAR',
        },
      });
    });
  });

  describe('recomputeAllRecommendations', () => {
    it('should recompute recommendations for all products', async () => {
      // Arrange
      const products = [
        { id: 'product-1' },
        { id: 'product-2' },
        { id: 'product-3' },
      ];
      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);

      // Act
      const result = await service.recomputeAllRecommendations();

      // Assert
      expect(result).toEqual({ processed: 3 });
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
    });
  });
});
