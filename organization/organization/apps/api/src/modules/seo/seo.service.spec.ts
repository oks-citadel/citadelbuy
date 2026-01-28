import { Test, TestingModule } from '@nestjs/testing';
import { SeoService } from './seo.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('SeoService', () => {
  let service: SeoService;
  let prisma: PrismaService;

  const mockPrismaService = {
    seoMeta: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    sitemap: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertSeoMeta', () => {
    it('should upsert SEO meta data for an entity', async () => {
      const entityType = 'product';
      const entityId = 'product-123';
      const data = {
        metaTitle: 'Test Product',
        metaDescription: 'Test description',
      };

      const expectedResult = {
        id: 'seo-meta-1',
        entityType,
        entityId,
        ...data,
      };

      mockPrismaService.seoMeta.upsert.mockResolvedValue(expectedResult);

      const result = await service.upsertSeoMeta(entityType, entityId, data);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.seoMeta.upsert).toHaveBeenCalledWith({
        where: { entityType_entityId: { entityType, entityId } },
        update: data,
        create: { entityType, entityId, ...data },
      });
    });

    it('should handle upsert with all fields', async () => {
      const entityType = 'category';
      const entityId = 'category-456';
      const data = {
        metaTitle: 'Category Title',
        metaDescription: 'Category Description',
        keywords: ['keyword1', 'keyword2'],
        ogImage: 'https://example.com/image.jpg',
      };

      mockPrismaService.seoMeta.upsert.mockResolvedValue({
        id: 'seo-meta-2',
        entityType,
        entityId,
        ...data,
      });

      await service.upsertSeoMeta(entityType, entityId, data);

      expect(mockPrismaService.seoMeta.upsert).toHaveBeenCalledWith({
        where: { entityType_entityId: { entityType, entityId } },
        update: data,
        create: { entityType, entityId, ...data },
      });
    });

    it('should throw error when prisma upsert fails', async () => {
      const entityType = 'product';
      const entityId = 'product-123';
      const data = { metaTitle: 'Test' };

      mockPrismaService.seoMeta.upsert.mockRejectedValue(new Error('Database error'));

      await expect(service.upsertSeoMeta(entityType, entityId, data)).rejects.toThrow('Database error');
    });
  });

  describe('getSeoMeta', () => {
    it('should return SEO meta data for an entity', async () => {
      const entityType = 'product';
      const entityId = 'product-123';
      const expectedMeta = {
        id: 'seo-meta-1',
        entityType,
        entityId,
        metaTitle: 'Test Product',
        metaDescription: 'Test description',
      };

      mockPrismaService.seoMeta.findUnique.mockResolvedValue(expectedMeta);

      const result = await service.getSeoMeta(entityType, entityId);

      expect(result).toEqual(expectedMeta);
      expect(mockPrismaService.seoMeta.findUnique).toHaveBeenCalledWith({
        where: { entityType_entityId: { entityType, entityId } },
      });
    });

    it('should return null when SEO meta does not exist', async () => {
      const entityType = 'product';
      const entityId = 'nonexistent-123';

      mockPrismaService.seoMeta.findUnique.mockResolvedValue(null);

      const result = await service.getSeoMeta(entityType, entityId);

      expect(result).toBeNull();
    });

    it('should throw error when prisma findUnique fails', async () => {
      const entityType = 'product';
      const entityId = 'product-123';

      mockPrismaService.seoMeta.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getSeoMeta(entityType, entityId)).rejects.toThrow('Database error');
    });
  });

  describe('generateSitemap', () => {
    it('should generate sitemap from products and categories', async () => {
      const products = [
        { slug: 'product-1', updatedAt: new Date('2024-01-01') },
        { slug: 'product-2', updatedAt: new Date('2024-01-02') },
      ];

      const categories = [
        { slug: 'category-1', updatedAt: new Date('2024-01-03') },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(products);
      mockPrismaService.category.findMany.mockResolvedValue(categories);
      mockPrismaService.sitemap.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.sitemap.createMany.mockResolvedValue({ count: 3 });

      const result = await service.generateSitemap();

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ url: '/products/product-1', priority: 0.8 }),
        expect.objectContaining({ url: '/products/product-2', priority: 0.8 }),
        expect.objectContaining({ url: '/categories/category-1', priority: 0.6 }),
      ]));

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        select: { slug: true, updatedAt: true },
      });
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        select: { slug: true, updatedAt: true },
      });
      expect(mockPrismaService.sitemap.deleteMany).toHaveBeenCalledWith({});
      expect(mockPrismaService.sitemap.createMany).toHaveBeenCalled();
    });

    it('should return empty array when no products or categories exist', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockPrismaService.sitemap.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.sitemap.createMany.mockResolvedValue({ count: 0 });

      const result = await service.generateSitemap();

      expect(result).toHaveLength(0);
      expect(mockPrismaService.sitemap.createMany).toHaveBeenCalledWith({ data: [] });
    });

    it('should throw error when database operations fail', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.generateSitemap()).rejects.toThrow('Database error');
    });
  });

  describe('getSitemap', () => {
    it('should return sitemap entries ordered by priority', async () => {
      const sitemapEntries = [
        { url: '/products/product-1', lastMod: new Date(), priority: 0.8 },
        { url: '/categories/category-1', lastMod: new Date(), priority: 0.6 },
      ];

      mockPrismaService.sitemap.findMany.mockResolvedValue(sitemapEntries);

      const result = await service.getSitemap();

      expect(result).toEqual(sitemapEntries);
      expect(mockPrismaService.sitemap.findMany).toHaveBeenCalledWith({
        orderBy: { priority: 'desc' },
      });
    });

    it('should return empty array when no sitemap entries exist', async () => {
      mockPrismaService.sitemap.findMany.mockResolvedValue([]);

      const result = await service.getSitemap();

      expect(result).toHaveLength(0);
    });

    it('should throw error when prisma findMany fails', async () => {
      mockPrismaService.sitemap.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getSitemap()).rejects.toThrow('Database error');
    });
  });
});
