import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SitemapService } from './sitemap.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { SitemapChangeFrequency } from '../dto/sitemap.dto';

describe('SitemapService', () => {
  let service: SitemapService;
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
    knowledgeBaseArticle: {
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
        SitemapService,
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

    service = module.get<SitemapService>(SitemapService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSitemapIndex', () => {
    it('should return cached sitemap index if available', async () => {
      const cachedXml = '<?xml version="1.0"?><sitemapindex></sitemapindex>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generateSitemapIndex();

      expect(result).toBe(cachedXml);
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should generate and cache sitemap index when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(0);

      const result = await service.generateSitemapIndex();

      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<sitemapindex');
      expect(result).toContain('</sitemapindex>');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should include product and category sitemaps', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(0);

      const result = await service.generateSitemapIndex();

      expect(result).toContain('products.xml');
      expect(result).toContain('categories.xml');
      expect(result).toContain('pages.xml');
    });

    it('should include blog sitemap when articles exist', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(5);

      const result = await service.generateSitemapIndex();

      expect(result).toContain('blog.xml');
    });

    it('should not include blog sitemap when no articles exist', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(0);

      const result = await service.generateSitemapIndex();

      expect(result).not.toContain('blog.xml');
    });

    it('should include locale-specific sitemaps', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.count.mockResolvedValue(0);

      const result = await service.generateSitemapIndex();

      expect(result).toContain('/en.xml');
      expect(result).toContain('/es.xml');
      expect(result).toContain('/fr.xml');
      expect(result).toContain('/de.xml');
    });
  });

  describe('generateProductSitemap', () => {
    it('should return cached sitemap if available', async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generateProductSitemap();

      expect(result).toBe(cachedXml);
    });

    it('should generate product sitemap from database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-1',
          updatedAt: new Date('2024-01-01'),
          images: ['https://example.com/img1.jpg'],
          name: 'Product 1',
          description: 'Description 1',
        },
        {
          slug: 'product-2',
          updatedAt: new Date('2024-01-02'),
          images: [],
          name: 'Product 2',
          description: 'Description 2',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateProductSitemap();

      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<urlset');
      expect(result).toContain('/products/product-1');
      expect(result).toContain('/products/product-2');
      expect(result).toContain(SitemapChangeFrequency.WEEKLY);
    });

    it('should include image information', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-1',
          updatedAt: new Date('2024-01-01'),
          images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
          name: 'Product 1',
          description: 'Description',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateProductSitemap();

      expect(result).toContain('image:image');
      expect(result).toContain('image:loc');
      expect(result).toContain('https://example.com/img1.jpg');
    });

    it('should handle relative image URLs', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-1',
          updatedAt: new Date('2024-01-01'),
          images: ['/images/product.jpg'],
          name: 'Product 1',
          description: 'Description',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateProductSitemap();

      expect(result).toContain('https://example.com/images/product.jpg');
    });

    it('should respect locale option', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.generateProductSitemap({ locale: 'es' });

      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining('es'));
    });
  });

  describe('generateCategorySitemap', () => {
    it('should return cached sitemap if available', async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generateCategorySitemap();

      expect(result).toBe(cachedXml);
    });

    it('should generate category sitemap from database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const categories = [
        {
          slug: 'category-1',
          updatedAt: new Date('2024-01-01'),
          thumbnailUrl: 'https://example.com/cat1.jpg',
          name: 'Category 1',
          level: 0,
        },
        {
          slug: 'category-2',
          updatedAt: new Date('2024-01-02'),
          thumbnailUrl: null,
          name: 'Category 2',
          level: 1,
        },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.generateCategorySitemap();

      expect(result).toContain('/categories/category-1');
      expect(result).toContain('/categories/category-2');
    });

    it('should assign higher priority to top-level categories', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const categories = [
        { slug: 'top-level', updatedAt: new Date(), thumbnailUrl: null, name: 'Top', level: 0 },
        { slug: 'second-level', updatedAt: new Date(), thumbnailUrl: null, name: 'Second', level: 1 },
        { slug: 'third-level', updatedAt: new Date(), thumbnailUrl: null, name: 'Third', level: 2 },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.generateCategorySitemap();

      // Top level should have priority 0.9
      expect(result).toContain('<priority>0.9</priority>');
      // Second level should have priority 0.7
      expect(result).toContain('<priority>0.7</priority>');
      // Third level should have priority 0.6
      expect(result).toContain('<priority>0.6</priority>');
    });

    it('should include category thumbnail image', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const categories = [
        {
          slug: 'category-1',
          updatedAt: new Date(),
          thumbnailUrl: 'https://example.com/thumbnail.jpg',
          name: 'Category 1',
          level: 0,
        },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(categories);

      const result = await service.generateCategorySitemap();

      expect(result).toContain('image:image');
      expect(result).toContain('https://example.com/thumbnail.jpg');
    });
  });

  describe('generatePagesSitemap', () => {
    it('should return cached sitemap if available', async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generatePagesSitemap();

      expect(result).toBe(cachedXml);
    });

    it('should generate static pages sitemap', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generatePagesSitemap();

      expect(result).toContain('<urlset');
      expect(result).toContain('https://example.com/');
      expect(result).toContain('https://example.com/about');
      expect(result).toContain('https://example.com/contact');
      expect(result).toContain('https://example.com/privacy-policy');
      expect(result).toContain('https://example.com/terms-of-service');
    });

    it('should include homepage with highest priority', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generatePagesSitemap();

      expect(result).toContain('<priority>1.0</priority>');
    });

    it('should include deals page with high priority', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.generatePagesSitemap();

      expect(result).toContain('/deals');
      expect(result).toContain('<priority>0.8</priority>');
    });
  });

  describe('generateBlogSitemap', () => {
    it('should return cached sitemap if available', async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generateBlogSitemap();

      expect(result).toBe(cachedXml);
    });

    it('should generate blog sitemap from articles', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const articles = [
        { slug: 'article-1', updatedAt: new Date('2024-01-01'), title: 'Article 1' },
        { slug: 'article-2', updatedAt: new Date('2024-01-02'), title: 'Article 2' },
      ];

      mockPrismaService.knowledgeBaseArticle.findMany.mockResolvedValue(articles);

      const result = await service.generateBlogSitemap();

      expect(result).toContain('/blog/article-1');
      expect(result).toContain('/blog/article-2');
    });

    it('should include blog index page', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.findMany.mockResolvedValue([]);

      const result = await service.generateBlogSitemap();

      expect(result).toContain('https://example.com/blog</loc>');
    });

    it('should handle missing knowledgeBaseArticle model gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockPrismaService.knowledgeBaseArticle.findMany.mockRejectedValue(new Error('Model not found'));

      const result = await service.generateBlogSitemap();

      expect(result).toContain('<urlset');
      expect(result).toContain('/blog');
    });
  });

  describe('generateTenantLocaleSitemap', () => {
    it('should return cached sitemap if available', async () => {
      const cachedXml = '<?xml version="1.0"?><urlset></urlset>';
      mockCacheService.get.mockResolvedValue(cachedXml);

      const result = await service.generateTenantLocaleSitemap('tenant-1', 'es');

      expect(result).toBe(cachedXml);
    });

    it('should generate tenant-specific sitemap with locale', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-1',
          updatedAt: new Date('2024-01-01'),
          translations: [{ name: 'Producto 1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateTenantLocaleSitemap('tenant-1', 'es');

      expect(result).toContain('/es/products/product-1');
      expect(result).toContain('xhtml:link');
      expect(result).toContain('hreflang="es"');
      expect(result).toContain('hreflang="x-default"');
    });

    it('should include alternate language links', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-1',
          updatedAt: new Date(),
          translations: [],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateTenantLocaleSitemap('tenant-1', 'fr');

      expect(result).toContain('xmlns:xhtml');
    });
  });

  describe('invalidateCache', () => {
    it('should delete all sitemap caches', async () => {
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      await service.invalidateCache();

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('seo:sitemap:*');
    });
  });

  describe('getSitemapStats', () => {
    it('should return sitemap statistics', async () => {
      mockPrismaService.product.count.mockResolvedValue(100);
      mockPrismaService.category.count.mockResolvedValue(20);

      const result = await service.getSitemapStats();

      expect(result.productCount).toBe(100);
      expect(result.categoryCount).toBe(20);
      expect(result.totalUrls).toBe(130); // 100 + 20 + 10 static pages
      expect(result.lastGenerated).toBeDefined();
    });

    it('should handle zero products and categories', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.count.mockResolvedValue(0);

      const result = await service.getSitemapStats();

      expect(result.productCount).toBe(0);
      expect(result.categoryCount).toBe(0);
      expect(result.totalUrls).toBe(10); // Only static pages
    });
  });

  describe('XML escaping', () => {
    it('should escape special XML characters in URLs', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const products = [
        {
          slug: 'product-with-ampersand-&-name',
          updatedAt: new Date(),
          images: [],
          name: 'Product & Test',
          description: 'Description with <tags> & "quotes"',
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.generateProductSitemap();

      expect(result).toContain('&amp;');
      expect(result).not.toContain('&name');
    });
  });

  describe('configuration', () => {
    it('should work with default APP_URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SitemapService,
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

      const newService = module.get<SitemapService>(SitemapService);
      expect(newService).toBeDefined();
    });
  });
});
