import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    searchSuggestion: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    searchQuery: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    productView: {
      create: jest.fn(),
    },
    savedSearch: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Laptop Computer',
    description: 'High performance laptop',
    price: 999.99,
    stock: 10,
    vendor: {
      id: 'vendor-1',
      name: 'Tech Store',
    },
    category: {
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
    },
    reviews: [
      { rating: 5 },
      { rating: 4 },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchProducts', () => {
    it('should search products with query', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      // Act
      const result = await service.searchProducts(searchDto);

      // Assert
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Laptop Computer');
      expect(result.products[0].avgRating).toBe(4.5); // (5+4)/2
      expect(result.products[0].reviewCount).toBe(2);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('should filter by category', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        categoryId: 'cat-electronics',
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-electronics',
          }),
        }),
      );
    });

    it('should filter by price range', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        minPrice: 500,
        maxPrice: 1500,
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 500, lte: 1500 },
          }),
        }),
      );
    });

    it('should filter by in stock status', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        inStock: true,
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: { gt: 0 },
          }),
        }),
      );
    });

    it('should sort by price ascending', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        sortBy: 'price',
        sortOrder: 'asc' as const,
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });

    it('should sort by newest', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        sortBy: 'newest',
        sortOrder: 'desc' as const,
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        minRating: 4,
        page: 1,
        limit: 20,
      };
      const highRatedProduct = { ...mockProduct, reviews: [{ rating: 5 }, { rating: 5 }] };
      const lowRatedProduct = { ...mockProduct, id: 'product-456', reviews: [{ rating: 2 }] };
      mockPrismaService.product.findMany.mockResolvedValue([highRatedProduct, lowRatedProduct]);
      mockPrismaService.product.count.mockResolvedValue(2);

      // Act
      const result = await service.searchProducts(searchDto);

      // Assert
      expect(result.products).toHaveLength(1);
      expect(result.products[0].avgRating).toBe(5);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        page: 2,
        limit: 10,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(25);

      // Act
      const result = await service.searchProducts(searchDto);

      // Assert
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2-1) * 10
          take: 10,
        }),
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should return filters in response', async () => {
      // Arrange
      const searchDto = {
        query: 'laptop',
        categoryId: 'cat-1',
        minPrice: 500,
        maxPrice: 1500,
        page: 1,
        limit: 20,
      };
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await service.searchProducts(searchDto);

      // Assert
      expect(result.filters).toEqual({
        query: 'laptop',
        categoryId: 'cat-1',
        minPrice: 500,
        maxPrice: 1500,
        minRating: undefined,
        inStock: undefined,
        vendorId: undefined,
        tags: undefined,
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
    });
  });

  describe('getAutocomplete', () => {
    it('should return empty suggestions for short query', async () => {
      // Arrange
      const dto = { query: 'a', limit: 10 };

      // Act
      const result = await service.getAutocomplete(dto);

      // Assert
      expect(result.suggestions).toEqual([]);
    });

    it('should return suggestions and products for valid query', async () => {
      // Arrange
      const dto = { query: 'laptop', limit: 10 };
      const mockSuggestions = [
        { keyword: 'laptop gaming', searchCount: 100, priority: 1, enabled: true, category: null },
        { keyword: 'laptop dell', searchCount: 80, priority: 1, enabled: true, category: null },
      ];
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Laptop HP',
          slug: 'laptop-hp',
          images: ['image1.jpg'],
          price: 799.99,
        },
      ];
      mockPrismaService.searchSuggestion.findMany.mockResolvedValue(mockSuggestions);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await service.getAutocomplete(dto);

      // Assert
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toEqual({
        keyword: 'laptop gaming',
        type: 'keyword',
        searchCount: 100,
      });
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toEqual({
        id: 'prod-1',
        name: 'Laptop HP',
        slug: 'laptop-hp',
        image: 'image1.jpg',
        price: 799.99,
        type: 'product',
      });
    });

    it('should filter by category when provided', async () => {
      // Arrange
      const dto = { query: 'laptop', limit: 10, categoryId: 'cat-electronics' };
      mockPrismaService.searchSuggestion.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      // Act
      await service.getAutocomplete(dto);

      // Assert
      expect(mockPrismaService.searchSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'cat-electronics',
          }),
        }),
      );
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-electronics',
          }),
        }),
      );
    });
  });

  describe('trackSearch', () => {
    it('should track search query', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        sessionId: 'session-456',
        query: 'laptop',
        resultsCount: 10,
        filters: { categoryId: 'cat-1' },
      };
      const mockSearchQuery = {
        id: 'search-123',
        ...dto,
        clickedItems: [],
        converted: false,
        source: 'SEARCH_BAR',
        createdAt: new Date(),
      };
      mockPrismaService.searchQuery.create.mockResolvedValue(mockSearchQuery);
      jest.spyOn(service as any, 'upsertSearchSuggestion').mockResolvedValue(undefined);

      // Act
      const result = await service.trackSearch(dto);

      // Assert
      expect(result).toEqual(mockSearchQuery);
      expect(mockPrismaService.searchQuery.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          sessionId: 'session-456',
          query: 'laptop',
          filters: { categoryId: 'cat-1' },
          resultsCount: 10,
          clickedItems: [],
          converted: false,
          source: 'SEARCH_BAR',
          metadata: undefined,
        },
      });
    });

    it('should handle anonymous user searches', async () => {
      // Arrange
      const dto = {
        sessionId: 'session-789',
        query: 'mouse',
        resultsCount: 5,
      };
      mockPrismaService.searchQuery.create.mockResolvedValue({ id: 'search-456' });
      jest.spyOn(service as any, 'upsertSearchSuggestion').mockResolvedValue(undefined);

      // Act
      await service.trackSearch(dto);

      // Assert
      expect(mockPrismaService.searchQuery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          sessionId: 'session-789',
          query: 'mouse',
        }),
      });
    });
  });

  describe('updateSearchClick', () => {
    it('should update search with clicked product', async () => {
      // Arrange
      const searchId = 'search-123';
      const productId = 'product-456';
      mockPrismaService.searchQuery.update.mockResolvedValue({
        id: searchId,
        clickedItems: [productId],
      });

      // Act
      const result = await service.updateSearchClick(searchId, productId);

      // Assert
      expect(result.clickedItems).toContain(productId);
      expect(mockPrismaService.searchQuery.update).toHaveBeenCalledWith({
        where: { id: searchId },
        data: {
          clickedItems: {
            push: productId,
          },
        },
      });
    });
  });

  describe('markSearchConverted', () => {
    it('should mark search as converted', async () => {
      // Arrange
      const searchId = 'search-123';
      mockPrismaService.searchQuery.update.mockResolvedValue({
        id: searchId,
        converted: true,
      });

      // Act
      const result = await service.markSearchConverted(searchId);

      // Assert
      expect(result.converted).toBe(true);
      expect(mockPrismaService.searchQuery.update).toHaveBeenCalledWith({
        where: { id: searchId },
        data: {
          converted: true,
        },
      });
    });
  });

  describe('trackProductView', () => {
    it('should track product view', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        userId: 'user-456',
        sessionId: 'session-789',
        source: 'search',
      };
      const mockView = {
        id: 'view-123',
        ...dto,
        metadata: undefined,
        createdAt: new Date(),
      };
      mockPrismaService.productView.create.mockResolvedValue(mockView);

      // Act
      const result = await service.trackProductView(dto);

      // Assert
      expect(result).toEqual(mockView);
      expect(mockPrismaService.productView.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-123',
          userId: 'user-456',
          sessionId: 'session-789',
          source: 'search',
          metadata: undefined,
        },
      });
    });

    it('should handle anonymous product views', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        sessionId: 'session-xyz',
      };
      mockPrismaService.productView.create.mockResolvedValue({ id: 'view-456' });

      // Act
      await service.trackProductView(dto);

      // Assert
      expect(mockPrismaService.productView.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-123',
          userId: null,
          sessionId: 'session-xyz',
          source: null,
          metadata: undefined,
        },
      });
    });
  });

  describe('getPopularSearches', () => {
    it('should return popular searches', async () => {
      // Arrange
      const mockSearches = [
        { keyword: 'laptop', searchCount: 1000, priority: 1, enabled: true },
        { keyword: 'mouse', searchCount: 500, priority: 1, enabled: true },
      ];
      mockPrismaService.searchSuggestion.findMany.mockResolvedValue(mockSearches);

      // Act
      const result = await service.getPopularSearches(10);

      // Assert
      expect(result).toEqual(mockSearches);
      expect(mockPrismaService.searchSuggestion.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
        },
        orderBy: [{ searchCount: 'desc' }, { priority: 'desc' }],
        take: 10,
      });
    });

    it('should filter by category when provided', async () => {
      // Arrange
      mockPrismaService.searchSuggestion.findMany.mockResolvedValue([]);

      // Act
      await service.getPopularSearches(10, 'cat-electronics');

      // Assert
      expect(mockPrismaService.searchSuggestion.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
          category: 'cat-electronics',
        },
        orderBy: [{ searchCount: 'desc' }, { priority: 'desc' }],
        take: 10,
      });
    });
  });

  describe('getTrendingSearches', () => {
    it('should return trending searches from last 7 days', async () => {
      // Arrange
      const mockTrending = [
        { query: 'iphone 15', _count: { query: 150 } },
        { query: 'gaming laptop', _count: { query: 100 } },
      ];
      mockPrismaService.searchQuery.groupBy.mockResolvedValue(mockTrending);

      // Act
      const result = await service.getTrendingSearches(10);

      // Assert
      expect(result).toEqual([
        { query: 'iphone 15', count: 150 },
        { query: 'gaming laptop', count: 100 },
      ]);
      expect(mockPrismaService.searchQuery.groupBy).toHaveBeenCalledWith({
        by: ['query'],
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 10,
      });
    });
  });

  describe('getUserSearchHistory', () => {
    it('should return user search history', async () => {
      // Arrange
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'search-1',
          query: 'laptop',
          filters: null,
          resultsCount: 10,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'search-2',
          query: 'mouse',
          filters: null,
          resultsCount: 5,
          createdAt: new Date('2024-01-02'),
        },
      ];
      mockPrismaService.searchQuery.findMany.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getUserSearchHistory(userId, 20);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.searchQuery.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        select: {
          id: true,
          query: true,
          filters: true,
          resultsCount: true,
          createdAt: true,
        },
      });
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear user search history', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.searchQuery.deleteMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.clearSearchHistory(userId);

      // Assert
      expect(result.count).toBe(5);
      expect(mockPrismaService.searchQuery.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
      });
    });
  });
});
