import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const mockSearchService = {
    searchProducts: jest.fn(),
    getAutocomplete: jest.fn(),
    trackSearch: jest.fn(),
    updateSearchClick: jest.fn(),
    markSearchConverted: jest.fn(),
    trackProductView: jest.fn(),
    getPopularSearches: jest.fn(),
    getTrendingSearches: jest.fn(),
    getUserSearchHistory: jest.fn(),
    clearSearchHistory: jest.fn(),
    createSavedSearch: jest.fn(),
    getSavedSearches: jest.fn(),
    updateSavedSearch: jest.fn(),
    deleteSavedSearch: jest.fn(),
    getSearchAnalytics: jest.fn(),
    getMostViewedProducts: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
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

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchProducts', () => {
    it('should search products with filters', async () => {
      const searchDto = {
        query: 'laptop',
        categoryId: 'cat-1',
        minPrice: 500,
        maxPrice: 2000,
        page: 1,
        limit: 20,
      };
      const mockResults = {
        products: [{ id: 'prod-1', name: 'Dell Laptop' }],
        total: 1,
      };

      mockSearchService.searchProducts.mockResolvedValue(mockResults);

      const result = await controller.searchProducts(searchDto);

      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchProducts).toHaveBeenCalledWith(searchDto);
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const dto = { query: 'lap', limit: 5 };
      const mockSuggestions = ['laptop', 'laptop bag', 'lap desk'];

      mockSearchService.getAutocomplete.mockResolvedValue(mockSuggestions);

      const result = await controller.autocomplete(dto);

      expect(result).toEqual(mockSuggestions);
      expect(mockSearchService.getAutocomplete).toHaveBeenCalledWith(dto);
    });
  });

  describe('trackSearch', () => {
    it('should track a search query', async () => {
      const dto = {
        query: 'laptop',
        userId: 'user-123',
        resultsCount: 25,
      };
      const mockResult = { id: 'search-123', tracked: true };

      mockSearchService.trackSearch.mockResolvedValue(mockResult);

      const result = await controller.trackSearch(dto);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.trackSearch).toHaveBeenCalledWith(dto);
    });
  });

  describe('trackClick', () => {
    it('should track a clicked product from search results', async () => {
      const searchId = 'search-123';
      const productId = 'product-456';
      const mockResult = { success: true };

      mockSearchService.updateSearchClick.mockResolvedValue(mockResult);

      const result = await controller.trackClick(searchId, productId);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.updateSearchClick).toHaveBeenCalledWith(searchId, productId);
    });
  });

  describe('markConverted', () => {
    it('should mark search as converted', async () => {
      const searchId = 'search-123';
      const mockResult = { success: true, converted: true };

      mockSearchService.markSearchConverted.mockResolvedValue(mockResult);

      const result = await controller.markConverted(searchId);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.markSearchConverted).toHaveBeenCalledWith(searchId);
    });
  });

  describe('trackView', () => {
    it('should track a product view', async () => {
      const dto = {
        productId: 'product-123',
        userId: 'user-456',
        sessionId: 'session-789',
      };
      const mockResult = { id: 'view-123', tracked: true };

      mockSearchService.trackProductView.mockResolvedValue(mockResult);

      const result = await controller.trackView(dto);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.trackProductView).toHaveBeenCalledWith(dto);
    });
  });

  describe('getPopularSearches', () => {
    it('should return popular searches with default limit', async () => {
      const mockPopular = [
        { query: 'laptop', count: 150 },
        { query: 'phone', count: 120 },
      ];

      mockSearchService.getPopularSearches.mockResolvedValue(mockPopular);

      const result = await controller.getPopularSearches(undefined, undefined);

      expect(result).toEqual(mockPopular);
      expect(mockSearchService.getPopularSearches).toHaveBeenCalledWith(10, undefined);
    });

    it('should return popular searches with custom limit', async () => {
      const mockPopular = [{ query: 'laptop', count: 150 }];

      mockSearchService.getPopularSearches.mockResolvedValue(mockPopular);

      const result = await controller.getPopularSearches(5, undefined);

      expect(result).toEqual(mockPopular);
      expect(mockSearchService.getPopularSearches).toHaveBeenCalledWith(5, undefined);
    });

    it('should return popular searches filtered by category', async () => {
      const mockPopular = [{ query: 'laptop', count: 150 }];

      mockSearchService.getPopularSearches.mockResolvedValue(mockPopular);

      const result = await controller.getPopularSearches(10, 'cat-123');

      expect(result).toEqual(mockPopular);
      expect(mockSearchService.getPopularSearches).toHaveBeenCalledWith(10, 'cat-123');
    });
  });

  describe('getTrendingSearches', () => {
    it('should return trending searches with default limit', async () => {
      const mockTrending = [
        { query: 'new phone', count: 80 },
        { query: 'gaming laptop', count: 65 },
      ];

      mockSearchService.getTrendingSearches.mockResolvedValue(mockTrending);

      const result = await controller.getTrendingSearches(undefined);

      expect(result).toEqual(mockTrending);
      expect(mockSearchService.getTrendingSearches).toHaveBeenCalledWith(10);
    });

    it('should return trending searches with custom limit', async () => {
      const mockTrending = [{ query: 'new phone', count: 80 }];

      mockSearchService.getTrendingSearches.mockResolvedValue(mockTrending);

      const result = await controller.getTrendingSearches(3);

      expect(result).toEqual(mockTrending);
      expect(mockSearchService.getTrendingSearches).toHaveBeenCalledWith(3);
    });
  });

  describe('getSearchHistory', () => {
    it('should return user search history with default limit', async () => {
      const mockRequest = { user: mockUser };
      const mockHistory = [
        { id: 'search-1', query: 'laptop', timestamp: new Date() },
        { id: 'search-2', query: 'phone', timestamp: new Date() },
      ];

      mockSearchService.getUserSearchHistory.mockResolvedValue(mockHistory);

      const result = await controller.getSearchHistory(mockRequest as any, undefined);

      expect(result).toEqual(mockHistory);
      expect(mockSearchService.getUserSearchHistory).toHaveBeenCalledWith('user-123', 20);
    });

    it('should return user search history with custom limit', async () => {
      const mockRequest = { user: mockUser };
      const mockHistory = [{ id: 'search-1', query: 'laptop' }];

      mockSearchService.getUserSearchHistory.mockResolvedValue(mockHistory);

      const result = await controller.getSearchHistory(mockRequest as any, 5);

      expect(result).toEqual(mockHistory);
      expect(mockSearchService.getUserSearchHistory).toHaveBeenCalledWith('user-123', 5);
    });
  });

  describe('clearHistory', () => {
    it('should clear user search history', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { success: true, message: 'History cleared' };

      mockSearchService.clearSearchHistory.mockResolvedValue(mockResult);

      const result = await controller.clearHistory(mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockSearchService.clearSearchHistory).toHaveBeenCalledWith('user-123');
    });
  });

  describe('createSavedSearch', () => {
    it('should create a saved search for the user', async () => {
      const mockRequest = { user: mockUser };
      const dto = {
        name: 'Gaming Laptops',
        query: 'gaming laptop',
        filters: { minPrice: 800 },
      };
      const mockSavedSearch = { id: 'saved-123', userId: 'user-123', ...dto };

      mockSearchService.createSavedSearch.mockResolvedValue(mockSavedSearch);

      const result = await controller.createSavedSearch(mockRequest as any, dto);

      expect(result).toEqual(mockSavedSearch);
      expect(mockSearchService.createSavedSearch).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getSavedSearches', () => {
    it('should return user saved searches', async () => {
      const mockRequest = { user: mockUser };
      const mockSavedSearches = [
        { id: 'saved-1', name: 'Gaming Laptops', query: 'gaming laptop' },
        { id: 'saved-2', name: 'Phones', query: 'phone' },
      ];

      mockSearchService.getSavedSearches.mockResolvedValue(mockSavedSearches);

      const result = await controller.getSavedSearches(mockRequest as any);

      expect(result).toEqual(mockSavedSearches);
      expect(mockSearchService.getSavedSearches).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateSavedSearch', () => {
    it('should update a saved search', async () => {
      const mockRequest = { user: mockUser };
      const dto = { name: 'Updated Name', notifyOnNewResults: true };
      const mockUpdated = { id: 'saved-123', ...dto };

      mockSearchService.updateSavedSearch.mockResolvedValue(mockUpdated);

      const result = await controller.updateSavedSearch(mockRequest as any, 'saved-123', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockSearchService.updateSavedSearch).toHaveBeenCalledWith('user-123', 'saved-123', dto);
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { success: true };

      mockSearchService.deleteSavedSearch.mockResolvedValue(mockResult);

      const result = await controller.deleteSavedSearch(mockRequest as any, 'saved-123');

      expect(result).toEqual(mockResult);
      expect(mockSearchService.deleteSavedSearch).toHaveBeenCalledWith('user-123', 'saved-123');
    });
  });

  describe('getAnalytics', () => {
    it('should return search analytics without date filters', async () => {
      const mockAnalytics = {
        totalSearches: 1500,
        uniqueQueries: 350,
        conversionRate: 0.15,
      };

      mockSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics(undefined, undefined);

      expect(result).toEqual(mockAnalytics);
      expect(mockSearchService.getSearchAnalytics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return search analytics with date range', async () => {
      const mockAnalytics = {
        totalSearches: 500,
        uniqueQueries: 120,
        conversionRate: 0.18,
      };

      mockSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics('2024-01-01', '2024-01-31');

      expect(result).toEqual(mockAnalytics);
      expect(mockSearchService.getSearchAnalytics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });

  describe('getMostViewed', () => {
    it('should return most viewed products with default parameters', async () => {
      const mockProducts = [
        { productId: 'prod-1', name: 'Laptop', views: 250 },
        { productId: 'prod-2', name: 'Phone', views: 200 },
      ];

      mockSearchService.getMostViewedProducts.mockResolvedValue(mockProducts);

      const result = await controller.getMostViewed(undefined, undefined);

      expect(result).toEqual(mockProducts);
      expect(mockSearchService.getMostViewedProducts).toHaveBeenCalledWith(10, 30);
    });

    it('should return most viewed products with custom limit', async () => {
      const mockProducts = [{ productId: 'prod-1', name: 'Laptop', views: 250 }];

      mockSearchService.getMostViewedProducts.mockResolvedValue(mockProducts);

      const result = await controller.getMostViewed(5, undefined);

      expect(result).toEqual(mockProducts);
      expect(mockSearchService.getMostViewedProducts).toHaveBeenCalledWith(5, 30);
    });

    it('should return most viewed products with custom days', async () => {
      const mockProducts = [{ productId: 'prod-1', name: 'Laptop', views: 100 }];

      mockSearchService.getMostViewedProducts.mockResolvedValue(mockProducts);

      const result = await controller.getMostViewed(10, 7);

      expect(result).toEqual(mockProducts);
      expect(mockSearchService.getMostViewedProducts).toHaveBeenCalledWith(10, 7);
    });

    it('should return most viewed products with both custom limit and days', async () => {
      const mockProducts = [{ productId: 'prod-1', name: 'Laptop', views: 50 }];

      mockSearchService.getMostViewedProducts.mockResolvedValue(mockProducts);

      const result = await controller.getMostViewed(3, 14);

      expect(result).toEqual(mockProducts);
      expect(mockSearchService.getMostViewedProducts).toHaveBeenCalledWith(3, 14);
    });
  });
});
