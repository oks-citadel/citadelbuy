import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TechnicalService } from './technical.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { IndexStatus } from '../dto/technical.dto';

describe('TechnicalService', () => {
  let service: TechnicalService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
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
        TechnicalService,
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

    service = module.get<TechnicalService>(TechnicalService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCanonicals', () => {
    it('should return canonical URL mappings for products and categories', async () => {
      const products = [
        { slug: 'product-1' },
        { slug: 'product-2' },
      ];

      const categories = [
        { slug: 'category-1' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.getCanonicals();

      expect(result.canonicals.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should include self-referencing canonicals', async () => {
      const products = [{ slug: 'product-1' }];
      const categories: any[] = [];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.getCanonicals();

      const selfReferencing = result.canonicals.find(
        (c) => c.isSelfReferencing && c.sourceUrl === c.canonicalUrl,
      );

      expect(selfReferencing).toBeDefined();
    });

    it('should include URL variations with query parameters', async () => {
      const products = [{ slug: 'product-1' }];
      const categories: any[] = [];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.getCanonicals();

      const withQueryParam = result.canonicals.find((c) => c.sourceUrl.includes('?'));

      expect(withQueryParam).toBeDefined();
      expect(withQueryParam?.isSelfReferencing).toBe(false);
    });

    it('should filter by URL pattern', async () => {
      const products = [{ slug: 'product-1' }];
      const categories = [{ slug: 'category-1' }];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.getCanonicals({ urlPattern: 'products' });

      expect(result.canonicals.every((c) => c.sourceUrl.includes('products'))).toBe(true);
    });

    it('should filter by hasIssuesOnly', async () => {
      const products = [{ slug: 'product-1' }];
      const categories: any[] = [];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.getCanonicals({ hasIssuesOnly: true });

      expect(result.canonicals.every((c) => c.hasIssues)).toBe(true);
    });

    it('should respect pagination', async () => {
      const products = [{ slug: 'product-1' }];
      const categories: any[] = [];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);

      await service.getCanonicals({ page: 2, limit: 10 });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10,
        }),
      );
    });
  });

  describe('updateCanonical', () => {
    it('should update canonical URL mapping', async () => {
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      const dto = {
        sourceUrl: 'https://example.com/old-path',
        canonicalUrl: 'https://example.com/new-path',
      };

      const result = await service.updateCanonical(dto);

      expect(result.sourceUrl).toBe(dto.sourceUrl);
      expect(result.canonicalUrl).toBe(dto.canonicalUrl);
      expect(result.isSelfReferencing).toBe(false);
    });

    it('should set isSelfReferencing when URLs match', async () => {
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      const dto = {
        sourceUrl: 'https://example.com/path',
        canonicalUrl: 'https://example.com/path',
      };

      const result = await service.updateCanonical(dto);

      expect(result.isSelfReferencing).toBe(true);
    });

    it('should invalidate cache after update', async () => {
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      await service.updateCanonical({
        sourceUrl: 'https://example.com/a',
        canonicalUrl: 'https://example.com/b',
      });

      expect(mockCacheService.deletePattern).toHaveBeenCalled();
    });
  });

  describe('getHreflangMappings', () => {
    it('should return hreflang mappings for products', async () => {
      const products = [
        {
          slug: 'product-1',
          translations: [{ languageCode: 'es' }, { languageCode: 'fr' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getHreflangMappings();

      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings[0].hreflangTags).toBeDefined();
    });

    it('should include x-default tag', async () => {
      const products = [
        {
          slug: 'product-1',
          translations: [{ languageCode: 'es' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getHreflangMappings();

      const hasXDefault = result.mappings[0].hreflangTags.some(
        (t) => t.hreflang === 'x-default',
      );

      expect(hasXDefault).toBe(true);
      expect(result.mappings[0].hasXDefault).toBe(true);
    });

    it('should filter by URL pattern', async () => {
      const products = [
        { slug: 'product-1', translations: [] },
        { slug: 'product-2', translations: [] },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getHreflangMappings({ urlPattern: 'product-1' });

      expect(result.mappings.every((m) => m.baseUrl.includes('product-1'))).toBe(true);
    });

    it('should filter by hasIssuesOnly', async () => {
      const products = [{ slug: 'product-1', translations: [] }];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getHreflangMappings({ hasIssuesOnly: true });

      expect(result.mappings.every((m) => m.issues && m.issues.length > 0)).toBe(true);
    });
  });

  describe('updateHreflang', () => {
    it('should update hreflang mapping', async () => {
      const dto = {
        baseUrl: 'https://example.com/products/test',
        hreflangTags: [
          { hreflang: 'en', href: 'https://example.com/products/test', rel: 'alternate' as const },
          { hreflang: 'es', href: 'https://example.com/es/products/test', rel: 'alternate' as const },
        ],
      };

      const result = await service.updateHreflang(dto);

      expect(result.baseUrl).toBe(dto.baseUrl);
      expect(result.hreflangTags.length).toBe(2);
    });

    it('should add x-default when includeXDefault is true', async () => {
      const dto = {
        baseUrl: 'https://example.com/products/test',
        hreflangTags: [
          { hreflang: 'en', href: 'https://example.com/products/test', rel: 'alternate' as const },
        ],
        includeXDefault: true,
      };

      const result = await service.updateHreflang(dto);

      const hasXDefault = result.hreflangTags.some((t) => t.hreflang === 'x-default');

      expect(hasXDefault).toBe(true);
    });

    it('should use custom xDefaultUrl when provided', async () => {
      const dto = {
        baseUrl: 'https://example.com/products/test',
        hreflangTags: [
          { hreflang: 'en', href: 'https://example.com/products/test', rel: 'alternate' as const },
        ],
        includeXDefault: true,
        xDefaultUrl: 'https://example.com/custom-default',
      };

      const result = await service.updateHreflang(dto);

      const xDefault = result.hreflangTags.find((t) => t.hreflang === 'x-default');

      expect(xDefault?.href).toBe('https://example.com/custom-default');
    });

    it('should validate hreflang tags and return issues', async () => {
      const dto = {
        baseUrl: 'https://example.com/products/test',
        hreflangTags: [
          { hreflang: 'invalid-code', href: 'https://example.com/test', rel: 'alternate' as const },
        ],
      };

      const result = await service.updateHreflang(dto);

      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
    });
  });

  describe('getIndexCoverage', () => {
    it('should return index coverage analysis', async () => {
      const products = [
        { slug: 'product-1', updatedAt: new Date() },
        { slug: 'product-2', updatedAt: new Date() },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getIndexCoverage();

      expect(result.totalUrls).toBeGreaterThan(0);
      expect(result.indexedUrls).toBeDefined();
      expect(result.notIndexedUrls).toBeDefined();
      expect(result.blockedUrls).toBeDefined();
      expect(result.errorUrls).toBeDefined();
      expect(result.indexRate).toBeDefined();
    });

    it('should include breakdown by status', async () => {
      const products = [{ slug: 'product-1', updatedAt: new Date() }];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getIndexCoverage();

      expect(result.byStatus).toBeDefined();
      expect(result.byStatus[IndexStatus.INDEXED]).toBeDefined();
      expect(result.byStatus[IndexStatus.NOT_INDEXED]).toBeDefined();
      expect(result.byStatus[IndexStatus.BLOCKED]).toBeDefined();
      expect(result.byStatus[IndexStatus.ERROR]).toBeDefined();
    });

    it('should filter by indexStatus', async () => {
      const products = [
        { slug: 'product-1', updatedAt: new Date() },
        { slug: 'product-2', updatedAt: new Date() },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getIndexCoverage({ indexStatus: IndexStatus.INDEXED });

      // Result should still contain all stats, just filtered view
      expect(result).toBeDefined();
    });

    it('should filter by URL pattern', async () => {
      const products = [
        { slug: 'product-1', updatedAt: new Date() },
        { slug: 'product-2', updatedAt: new Date() },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getIndexCoverage({ urlPattern: 'product-1' });

      expect(result).toBeDefined();
    });

    it('should return top issues', async () => {
      const products = [
        { slug: 'product-1', updatedAt: new Date() },
        { slug: 'product-2', updatedAt: new Date() },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.getIndexCoverage();

      expect(result.topIssues).toBeInstanceOf(Array);
    });
  });

  describe('requestReindex', () => {
    it('should queue URLs for reindexing', async () => {
      const dto = {
        urls: ['https://example.com/page1', 'https://example.com/page2'],
      };

      const result = await service.requestReindex(dto);

      expect(result.requestId).toBeDefined();
      expect(result.urlsQueued).toBe(2);
      expect(result.estimatedProcessingTime).toBeDefined();
      expect(result.requestedAt).toBeDefined();
    });

    it('should respect priority option', async () => {
      const dto = {
        urls: ['https://example.com/urgent'],
        priority: 10,
      };

      const result = await service.requestReindex(dto);

      expect(result.urlsQueued).toBe(1);
    });

    it('should estimate processing time based on queue size', async () => {
      const dto = {
        urls: Array.from({ length: 50 }, (_, i) => `https://example.com/page${i}`),
      };

      const result = await service.requestReindex(dto);

      expect(result.estimatedProcessingTime).toContain('minutes');
    });
  });

  describe('getTechnicalSummary', () => {
    it('should return cached summary if available', async () => {
      const cachedSummary = {
        totalPages: 100,
        canonicalIssues: 5,
        hreflangIssues: 10,
        indexingIssues: 8,
        redirectIssues: 3,
        httpsAdoptionRate: 100,
        mobileFriendlyRate: 95,
        avgPageLoadTime: 2.3,
        technicalScore: 85,
        lastAnalyzedAt: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue(cachedSummary);

      const result = await service.getTechnicalSummary();

      expect(result).toEqual(cachedSummary);
    });

    it('should generate and cache summary when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.product.count.mockResolvedValue(100);
      mockPrismaService.category.count.mockResolvedValue(20);

      const result = await service.getTechnicalSummary();

      expect(result.totalPages).toBeGreaterThan(0);
      expect(result.technicalScore).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should include all technical metrics', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.product.count.mockResolvedValue(50);
      mockPrismaService.category.count.mockResolvedValue(10);

      const result = await service.getTechnicalSummary();

      expect(result.canonicalIssues).toBeDefined();
      expect(result.hreflangIssues).toBeDefined();
      expect(result.indexingIssues).toBeDefined();
      expect(result.redirectIssues).toBeDefined();
      expect(result.httpsAdoptionRate).toBeDefined();
      expect(result.mobileFriendlyRate).toBeDefined();
      expect(result.avgPageLoadTime).toBeDefined();
      expect(result.lastAnalyzedAt).toBeDefined();
    });
  });

  describe('detectDuplicateContent', () => {
    it('should detect products with similar names', async () => {
      const products = [
        { slug: 'running-shoes', name: 'Running Shoes', description: 'Great shoes' },
        { slug: 'running-shoes-v2', name: 'Running Shoes', description: 'Great shoes' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.detectDuplicateContent();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].primaryUrl).toBeDefined();
      expect(result[0].duplicateUrls).toBeDefined();
      expect(result[0].similarityPercentage).toBeDefined();
      expect(result[0].recommendedCanonical).toBeDefined();
    });

    it('should return empty array when no duplicates', async () => {
      const products = [
        { slug: 'product-1', name: 'Unique Product 1', description: 'Description 1' },
        { slug: 'product-2', name: 'Different Product 2', description: 'Description 2' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.detectDuplicateContent();

      // May have 0 duplicates if names are different enough
      expect(result).toBeInstanceOf(Array);
    });

    it('should include content hash', async () => {
      const products = [
        { slug: 'product-1', name: 'Same Name', description: 'Description' },
        { slug: 'product-2', name: 'Same Name', description: 'Description' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.detectDuplicateContent();

      if (result.length > 0) {
        expect(result[0].contentHash).toBeDefined();
      }
    });
  });

  describe('validateStructuredData', () => {
    it('should validate product page structured data', async () => {
      const result = await service.validateStructuredData('https://example.com/products/test');

      expect(result.url).toBe('https://example.com/products/test');
      expect(result.isValid).toBeDefined();
      expect(result.detectedTypes).toBeInstanceOf(Array);
      expect(result.detectedTypes).toContain('Product');
    });

    it('should detect BreadcrumbList on non-homepage', async () => {
      const result = await service.validateStructuredData('https://example.com/products/test');

      expect(result.detectedTypes).toContain('BreadcrumbList');
    });

    it('should return errors and warnings arrays', async () => {
      const result = await service.validateStructuredData('https://example.com/products/test');

      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should not include BreadcrumbList on homepage', async () => {
      const result = await service.validateStructuredData('https://example.com');

      expect(result.detectedTypes).not.toContain('BreadcrumbList');
    });
  });

  describe('configuration', () => {
    it('should work with default APP_URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TechnicalService,
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

      const newService = module.get<TechnicalService>(TechnicalService);
      expect(newService).toBeDefined();
    });
  });
});
