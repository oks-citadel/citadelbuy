import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ContentSeoService } from './content-seo.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  KeywordDifficulty,
  ContentFreshnessStatus,
} from '../dto/content-seo.dto';

describe('ContentSeoService', () => {
  let service: ContentSeoService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://example.com'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentSeoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContentSeoService>(ContentSeoService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('researchKeywords', () => {
    it('should return cached results if available', async () => {
      const cachedResult = {
        seedKeyword: 'test keyword',
        primaryKeywords: [],
        longTailKeywords: [],
        questionKeywords: [],
        relatedTopics: [],
        searchIntent: { informational: 0.25, navigational: 0.25, transactional: 0.25, commercial: 0.25 },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.researchKeywords({ keyword: 'test keyword' });

      expect(result).toEqual(cachedResult);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should generate keyword research when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({ keyword: 'test keyword' });

      expect(result.seedKeyword).toBe('test keyword');
      expect(result.primaryKeywords).toBeInstanceOf(Array);
      expect(result.longTailKeywords).toBeInstanceOf(Array);
      expect(result.questionKeywords).toBeInstanceOf(Array);
      expect(result.relatedTopics).toBeInstanceOf(Array);
      expect(result.searchIntent).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should respect includeLongTail option', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({
        keyword: 'test',
        includeLongTail: false,
      });

      expect(result.longTailKeywords).toHaveLength(0);
    });

    it('should respect includeQuestions option', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({
        keyword: 'test',
        includeQuestions: false,
      });

      expect(result.questionKeywords).toHaveLength(0);
    });

    it('should respect limit option', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({
        keyword: 'test',
        limit: 9,
      });

      const totalKeywords =
        result.primaryKeywords.length +
        result.longTailKeywords.length +
        result.questionKeywords.length;

      expect(totalKeywords).toBeLessThanOrEqual(9);
    });

    it('should detect transactional intent for buy keywords', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({ keyword: 'buy shoes online' });

      expect(result.searchIntent.transactional).toBeGreaterThan(0.25);
    });

    it('should detect informational intent for how-to keywords', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({ keyword: 'how to cook pasta' });

      expect(result.searchIntent.informational).toBeGreaterThan(0.25);
    });

    it('should detect commercial intent for comparison keywords', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.researchKeywords({ keyword: 'best laptop review' });

      expect(result.searchIntent.commercial).toBeGreaterThan(0.25);
    });
  });

  describe('optimizeContent', () => {
    it('should analyze content and return optimization results', async () => {
      const dto = {
        content: 'This is a test content with some words for analysis.',
        targetKeyword: 'test',
        title: 'Test Title',
        metaDescription: 'This is a test meta description for SEO purposes.',
      };

      const result = await service.optimizeContent(dto);

      expect(result.seoScore).toBeDefined();
      expect(result.readabilityScore).toBeDefined();
      expect(result.keywordDensity).toBeDefined();
      expect(result.wordCount).toBeDefined();
      expect(result.titleAnalysis).toBeDefined();
      expect(result.metaDescriptionAnalysis).toBeDefined();
      expect(result.headingAnalysis).toBeDefined();
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should detect missing meta title', async () => {
      const dto = {
        content: 'Content without any HTML headings.',
        title: '',
      };

      const result = await service.optimizeContent(dto);

      expect(result.titleAnalysis.length).toBe(0);
      expect(result.titleAnalysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect short meta title', async () => {
      const dto = {
        content: 'Some content here',
        title: 'Short',
      };

      const result = await service.optimizeContent(dto);

      expect(result.titleAnalysis.isOptimalLength).toBe(false);
      expect(result.titleAnalysis.suggestions.some((s) => s.includes('short'))).toBe(true);
    });

    it('should detect long meta title', async () => {
      const dto = {
        content: 'Some content here',
        title: 'This is a very long title that exceeds the recommended length for SEO purposes and should be truncated',
      };

      const result = await service.optimizeContent(dto);

      expect(result.titleAnalysis.isOptimalLength).toBe(false);
      expect(result.titleAnalysis.suggestions.some((s) => s.includes('truncated') || s.includes('60'))).toBe(true);
    });

    it('should detect missing keyword in title', async () => {
      const dto = {
        content: 'Content about shoes',
        title: 'Some Generic Title',
        targetKeyword: 'shoes',
      };

      const result = await service.optimizeContent(dto);

      expect(result.titleAnalysis.hasKeyword).toBe(false);
      expect(result.titleAnalysis.suggestions.some((s) => s.includes('shoes'))).toBe(true);
    });

    it('should detect thin content', async () => {
      const dto = {
        content: 'Short content.',
      };

      const result = await service.optimizeContent(dto);

      expect(result.suggestions.some((s) => s.category === 'content' && s.message.includes('thin'))).toBe(true);
    });

    it('should calculate keyword density', async () => {
      const dto = {
        content: 'Test keyword test keyword test keyword test other words here more words test',
        targetKeyword: 'test',
      };

      const result = await service.optimizeContent(dto);

      expect(result.keywordDensity).toBeGreaterThan(0);
    });

    it('should detect keyword stuffing', async () => {
      const dto = {
        content: 'test test test test test test test test test test test test test test test test test test test',
        targetKeyword: 'test',
      };

      const result = await service.optimizeContent(dto);

      expect(result.suggestions.some((s) => s.message.toLowerCase().includes('stuffing'))).toBe(true);
    });

    it('should analyze H1 headings', async () => {
      const dto = {
        content: '<h1>Main Heading</h1><p>Some content here</p>',
      };

      const result = await service.optimizeContent(dto);

      expect(result.headingAnalysis.hasH1).toBe(true);
      expect(result.headingAnalysis.h1Count).toBe(1);
    });

    it('should detect multiple H1 headings', async () => {
      const dto = {
        content: '<h1>First Heading</h1><h1>Second Heading</h1>',
      };

      const result = await service.optimizeContent(dto);

      expect(result.headingAnalysis.h1Count).toBe(2);
      expect(result.headingAnalysis.suggestions.some((s) => s.includes('one H1'))).toBe(true);
    });

    it('should detect missing H1 heading', async () => {
      const dto = {
        content: '<h2>Subheading</h2><p>Content without H1</p>',
      };

      const result = await service.optimizeContent(dto);

      expect(result.headingAnalysis.hasH1).toBe(false);
      expect(result.headingAnalysis.suggestions.some((s) => s.includes('H1'))).toBe(true);
    });

    it('should generate LSI keywords', async () => {
      const dto = {
        content: 'This content talks about shoes and footwear and sneakers and running shoes and athletic footwear',
        targetKeyword: 'shoes',
      };

      const result = await service.optimizeContent(dto);

      expect(result.lsiKeywords).toBeInstanceOf(Array);
    });
  });

  describe('analyzeInternalLinks', () => {
    it('should analyze internal links from products and categories', async () => {
      const products = [
        { id: '1', slug: 'product-1', name: 'Product 1', categoryId: 'cat-1', description: 'Description' },
        { id: '2', slug: 'product-2', name: 'Product 2', categoryId: 'cat-1', description: 'Description' },
      ];

      const categories = [
        { id: 'cat-1', slug: 'category-1', name: 'Category 1' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.analyzeInternalLinks();

      expect(result.totalPages).toBe(3);
      expect(result.totalInternalLinks).toBeGreaterThan(0);
      expect(result.averageLinksPerPage).toBeDefined();
      expect(result.orphanPages).toBeInstanceOf(Array);
      expect(result.underlinkedPages).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should return empty analysis when no products or categories', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.analyzeInternalLinks();

      expect(result.totalPages).toBe(0);
      expect(result.totalInternalLinks).toBe(0);
    });

    it('should calculate link equity distribution', async () => {
      const products = [
        { id: '1', slug: 'product-1', name: 'Product 1', categoryId: 'cat-1', description: 'Description' },
      ];

      const categories = [
        { id: 'cat-1', slug: 'category-1', name: 'Category 1' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.analyzeInternalLinks();

      expect(result.linkEquityDistribution).toBeDefined();
      expect(result.linkEquityDistribution.highAuthority).toBeInstanceOf(Array);
      expect(result.linkEquityDistribution.mediumAuthority).toBeInstanceOf(Array);
      expect(result.linkEquityDistribution.lowAuthority).toBeInstanceOf(Array);
    });
  });

  describe('getContentFreshness', () => {
    it('should return content freshness report', async () => {
      const products = [
        { slug: 'product-1', name: 'Product 1', updatedAt: new Date() },
        { slug: 'product-2', name: 'Product 2', updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness();

      expect(result.totalContent).toBe(2);
      expect(result.items).toBeInstanceOf(Array);
      expect(result.freshCount).toBeDefined();
      expect(result.needsUpdateCount).toBeDefined();
      expect(result.staleCount).toBeDefined();
      expect(result.outdatedCount).toBeDefined();
    });

    it('should filter by status', async () => {
      const products = [
        { slug: 'product-1', name: 'Fresh Product', updatedAt: new Date() },
        { slug: 'product-2', name: 'Old Product', updatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness({
        status: ContentFreshnessStatus.FRESH,
      });

      expect(result.items.every((i) => i.status === ContentFreshnessStatus.FRESH)).toBe(true);
    });

    it('should filter by minDaysSinceUpdate', async () => {
      const products = [
        { slug: 'product-1', name: 'Fresh Product', updatedAt: new Date() },
        { slug: 'product-2', name: 'Old Product', updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness({
        minDaysSinceUpdate: 50,
      });

      expect(result.items.every((i) => i.daysSinceUpdate >= 50)).toBe(true);
    });

    it('should filter by maxDaysSinceUpdate', async () => {
      const products = [
        { slug: 'product-1', name: 'Fresh Product', updatedAt: new Date() },
        { slug: 'product-2', name: 'Old Product', updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness({
        maxDaysSinceUpdate: 50,
      });

      expect(result.items.every((i) => i.daysSinceUpdate <= 50)).toBe(true);
    });

    it('should respect pagination', async () => {
      const products = [
        { slug: 'product-1', name: 'Product 1', updatedAt: new Date() },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      await service.getContentFreshness({ page: 2, limit: 10 });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10,
        }),
      );
    });

    it('should sort by custom field', async () => {
      const products = [
        { slug: 'product-1', name: 'Product 1', updatedAt: new Date() },
        { slug: 'product-2', name: 'Product 2', updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness({
        sortBy: 'daysSinceUpdate',
        sortOrder: 'desc',
      });

      expect(result.items).toBeInstanceOf(Array);
    });

    it('should return top priority updates', async () => {
      const products = [
        { slug: 'product-1', name: 'Old Product', updatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness();

      expect(result.topPriorityUpdates).toBeInstanceOf(Array);
    });

    it('should provide recommendations for stale content', async () => {
      const products = [
        { slug: 'product-1', name: 'Old Product', updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getContentFreshness();

      const staleItem = result.items.find((i) => i.status !== ContentFreshnessStatus.FRESH);
      if (staleItem) {
        expect(staleItem.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('configuration', () => {
    it('should work with default APP_URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentSeoService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const newService = module.get<ContentSeoService>(ContentSeoService);
      expect(newService).toBeDefined();
    });
  });
});
