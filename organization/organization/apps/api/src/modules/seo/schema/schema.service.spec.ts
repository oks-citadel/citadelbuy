import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { SchemaService } from './schema.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SchemaType } from '../dto/schema.dto';

describe('SchemaService', () => {
  let service: SchemaService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        APP_URL: 'https://example.com',
        ORGANIZATION_NAME: 'Test Company',
        ORGANIZATION_LOGO: 'https://example.com/logo.png',
        ORGANIZATION_DESCRIPTION: 'Test Description',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchemaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SchemaService>(SchemaService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSchema', () => {
    it('should generate Product schema', async () => {
      const dto = {
        type: SchemaType.PRODUCT,
        data: {
          name: 'Test Product',
          description: 'Test Description',
          images: ['https://example.com/image.jpg'],
          offer: {
            price: 99.99,
            priceCurrency: 'USD',
            availability: 'InStock',
            itemCondition: 'NewCondition',
          },
        },
      };

      const result = await service.generateSchema(dto);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Product');
      expect(result.name).toBe('Test Product');
    });

    it('should generate Organization schema', async () => {
      const dto = {
        type: SchemaType.ORGANIZATION,
        data: {
          name: 'Custom Org',
          url: 'https://custom.com',
        },
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe('Organization');
      expect(result.name).toBe('Custom Org');
    });

    it('should generate BreadcrumbList schema', async () => {
      const dto = {
        type: SchemaType.BREADCRUMB_LIST,
        data: {
          items: [
            { position: 1, name: 'Home', item: 'https://example.com/' },
            { position: 2, name: 'Products', item: 'https://example.com/products' },
          ],
        },
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe('BreadcrumbList');
      expect(result.itemListElement).toHaveLength(2);
    });

    it('should generate FAQ schema', async () => {
      const dto = {
        type: SchemaType.FAQ,
        data: {
          items: [
            { question: 'What is this?', answer: 'A test.' },
          ],
        },
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe('FAQPage');
      expect(result.mainEntity).toHaveLength(1);
    });

    it('should generate Article schema', async () => {
      const dto = {
        type: SchemaType.ARTICLE,
        data: {
          headline: 'Test Article',
          description: 'Test Description',
          author: 'John Doe',
          datePublished: '2024-01-01',
        },
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe(SchemaType.ARTICLE);
      expect(result.headline).toBe('Test Article');
    });

    it('should generate WebSite schema', async () => {
      const dto = {
        type: SchemaType.WEBSITE,
        data: {},
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe('WebSite');
      expect(result.potentialAction).toBeDefined();
    });

    it('should generate SearchAction schema', async () => {
      const dto = {
        type: SchemaType.SEARCH_ACTION,
        data: {},
      };

      const result = await service.generateSchema(dto);

      expect(result['@type']).toBe('SearchAction');
      expect(result.target).toBeDefined();
    });

    it('should throw error for unsupported schema type', async () => {
      const dto = {
        type: 'UnsupportedType' as SchemaType,
        data: {},
      };

      await expect(service.generateSchema(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateProductSchema', () => {
    it('should generate complete product schema', () => {
      const dto = {
        name: 'Test Product',
        description: 'Product Description',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        offer: {
          price: 49.99,
          priceCurrency: 'USD',
          availability: 'InStock',
          itemCondition: 'NewCondition',
        },
        sku: 'SKU-123',
        mpn: 'MPN-456',
        gtin: '1234567890123',
        brand: 'Test Brand',
        category: 'Electronics',
        url: 'https://example.com/products/test',
      };

      const result = service.generateProductSchema(dto);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Product');
      expect(result.name).toBe('Test Product');
      expect(result.sku).toBe('SKU-123');
      expect(result.mpn).toBe('MPN-456');
      expect(result.gtin).toBe('1234567890123');
      expect(result.gtin13).toBe('1234567890123');
      expect(result.brand['@type']).toBe('Brand');
      expect(result.brand.name).toBe('Test Brand');
    });

    it('should include aggregate rating when provided', () => {
      const dto = {
        name: 'Test Product',
        description: 'Description',
        images: [],
        offer: {
          price: 29.99,
          priceCurrency: 'USD',
          availability: 'InStock',
          itemCondition: 'NewCondition',
        },
        aggregateRating: {
          ratingValue: 4.5,
          reviewCount: 100,
          bestRating: 5,
          worstRating: 1,
        },
      };

      const result = service.generateProductSchema(dto);

      expect(result.aggregateRating).toBeDefined();
      expect(result.aggregateRating['@type']).toBe('AggregateRating');
      expect(result.aggregateRating.ratingValue).toBe(4.5);
      expect(result.aggregateRating.reviewCount).toBe(100);
    });

    it('should include reviews when provided', () => {
      const dto = {
        name: 'Test Product',
        description: 'Description',
        images: [],
        offer: {
          price: 29.99,
          priceCurrency: 'USD',
          availability: 'InStock',
          itemCondition: 'NewCondition',
        },
        reviews: [
          {
            author: 'John Doe',
            reviewBody: 'Great product!',
            datePublished: '2024-01-01',
            reviewRating: {
              ratingValue: 5,
              bestRating: 5,
              worstRating: 1,
            },
          },
        ],
      };

      const result = service.generateProductSchema(dto);

      expect(result.review).toHaveLength(1);
      expect(result.review[0]['@type']).toBe('Review');
      expect(result.review[0].author['@type']).toBe('Person');
    });

    it('should handle different GTIN lengths', () => {
      const testCases = [
        { gtin: '12345678', expectedField: 'gtin8' },
        { gtin: '123456789012', expectedField: 'gtin12' },
        { gtin: '1234567890123', expectedField: 'gtin13' },
        { gtin: '12345678901234', expectedField: 'gtin14' },
      ];

      for (const testCase of testCases) {
        const dto = {
          name: 'Test',
          description: 'Test',
          images: [],
          offer: { price: 10, priceCurrency: 'USD', availability: 'InStock', itemCondition: 'NewCondition' },
          gtin: testCase.gtin,
        };

        const result = service.generateProductSchema(dto);

        expect(result[testCase.expectedField]).toBe(testCase.gtin);
      }
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate organization schema with defaults', () => {
      const result = service.generateOrganizationSchema();

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Organization');
      // Uses config defaults or falls back to 'Broxiva'
      expect(result.name).toBeDefined();
      expect(result.logo).toBeDefined();
    });

    it('should use provided values over defaults', () => {
      const dto = {
        name: 'Custom Company',
        url: 'https://custom.com',
        logo: 'https://custom.com/logo.png',
        email: 'contact@custom.com',
        telephone: '+1-555-0100',
      };

      const result = service.generateOrganizationSchema(dto);

      expect(result.name).toBe('Custom Company');
      expect(result.url).toBe('https://custom.com');
      expect(result.email).toBe('contact@custom.com');
      expect(result.telephone).toBe('+1-555-0100');
    });

    it('should include social media links', () => {
      const dto = {
        sameAs: [
          'https://facebook.com/company',
          'https://twitter.com/company',
        ],
      };

      const result = service.generateOrganizationSchema(dto);

      expect(result.sameAs).toEqual(dto.sameAs);
    });

    it('should include address when provided', () => {
      const dto = {
        address: {
          streetAddress: '123 Main St',
          addressLocality: 'New York',
          addressRegion: 'NY',
          postalCode: '10001',
          addressCountry: 'US',
        },
      };

      const result = service.generateOrganizationSchema(dto);

      expect(result.address['@type']).toBe('PostalAddress');
      expect(result.address.streetAddress).toBe('123 Main St');
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate breadcrumb list schema', () => {
      const dto = {
        items: [
          { position: 1, name: 'Home', item: 'https://example.com/' },
          { position: 2, name: 'Products', item: 'https://example.com/products' },
          { position: 3, name: 'Shoes', item: 'https://example.com/products/shoes' },
        ],
      };

      const result = service.generateBreadcrumbSchema(dto);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('BreadcrumbList');
      expect(result.itemListElement).toHaveLength(3);
      expect(result.itemListElement[0]['@type']).toBe('ListItem');
      expect(result.itemListElement[0].position).toBe(1);
    });
  });

  describe('generateFAQSchema', () => {
    it('should generate FAQ page schema', () => {
      const dto = {
        items: [
          { question: 'What is your return policy?', answer: 'We offer 30-day returns.' },
          { question: 'Do you ship internationally?', answer: 'Yes, we ship worldwide.' },
        ],
      };

      const result = service.generateFAQSchema(dto);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('FAQPage');
      expect(result.mainEntity).toHaveLength(2);
      expect(result.mainEntity[0]['@type']).toBe('Question');
      expect(result.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    });
  });

  describe('generateArticleSchema', () => {
    it('should generate article schema', () => {
      const dto = {
        headline: 'How to Choose Running Shoes',
        description: 'A guide to selecting the right running shoes',
        author: 'Jane Smith',
        datePublished: '2024-01-15',
        dateModified: '2024-01-20',
        image: 'https://example.com/article-image.jpg',
      };

      const result = service.generateArticleSchema(dto);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe(SchemaType.ARTICLE);
      expect(result.headline).toBe('How to Choose Running Shoes');
      expect(result.author['@type']).toBe('Person');
      expect(result.author.name).toBe('Jane Smith');
    });

    it('should include publisher information', () => {
      const dto = {
        headline: 'Test Article',
        description: 'Test',
        author: 'Author',
        datePublished: '2024-01-01',
        publisher: 'Test Publisher',
        publisherLogo: 'https://example.com/publisher-logo.png',
      };

      const result = service.generateArticleSchema(dto);

      expect(result.publisher['@type']).toBe('Organization');
      expect(result.publisher.name).toBe('Test Publisher');
      expect(result.publisher.logo['@type']).toBe('ImageObject');
    });

    it('should use datePublished as dateModified when not provided', () => {
      const dto = {
        headline: 'Test',
        description: 'Test',
        author: 'Author',
        datePublished: '2024-01-01',
      };

      const result = service.generateArticleSchema(dto);

      expect(result.dateModified).toBe('2024-01-01');
    });
  });

  describe('generateWebsiteSchema', () => {
    it('should generate website schema with search action', () => {
      const result = service.generateWebsiteSchema();

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('WebSite');
      expect(result.potentialAction['@type']).toBe('SearchAction');
      expect(result.potentialAction.target['@type']).toBe('EntryPoint');
    });
  });

  describe('generateSearchActionSchema', () => {
    it('should generate search action schema', () => {
      const result = service.generateSearchActionSchema();

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('SearchAction');
      expect(result.target.urlTemplate).toContain('{search_term_string}');
    });
  });

  describe('generateProductSchemaFromId', () => {
    it('should return null when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.generateProductSchemaFromId('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should generate schema from database product', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Description',
        price: 99.99,
        stock: 10,
        images: ['/images/product.jpg'],
        slug: 'test-product',
        sku: 'SKU-001',
        category: { name: 'Electronics' },
        vendor: { name: 'Test Vendor' },
        reviews: [
          {
            rating: 5,
            comment: 'Great product',
            createdAt: new Date('2024-01-01'),
            user: { name: 'John' },
          },
        ],
        _count: { reviews: 1 },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.generateProductSchemaFromId('prod-1');

      expect(result).not.toBeNull();
      expect(result!['@type']).toBe('Product');
      expect(result!.name).toBe('Test Product');
      expect(result!.aggregateRating).toBeDefined();
      expect(result!.review).toHaveLength(1);
    });

    it('should handle products with no reviews', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Description',
        price: 99.99,
        stock: 10,
        images: [],
        slug: 'test-product',
        category: null,
        vendor: null,
        reviews: [],
        _count: { reviews: 0 },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.generateProductSchemaFromId('prod-1');

      expect(result).not.toBeNull();
      expect(result!.aggregateRating).toBeUndefined();
      expect(result!.review).toBeUndefined();
    });

    it('should handle out of stock products', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Description',
        price: 99.99,
        stock: 0,
        images: [],
        slug: 'test-product',
        category: null,
        vendor: null,
        reviews: [],
        _count: { reviews: 0 },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.generateProductSchemaFromId('prod-1');

      expect(result!.offers.availability).toContain('OutOfStock');
    });
  });

  describe('generateCategoryBreadcrumbSchema', () => {
    it('should return null when category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      const result = await service.generateCategoryBreadcrumbSchema('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should generate breadcrumb schema for category', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Shoes',
        slug: 'shoes',
        parent: null,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.generateCategoryBreadcrumbSchema('cat-1');

      expect(result).not.toBeNull();
      expect(result!['@type']).toBe('BreadcrumbList');
      expect(result!.itemListElement.length).toBeGreaterThanOrEqual(2);
    });

    it('should include parent categories in breadcrumb', async () => {
      const mockCategory = {
        id: 'cat-3',
        name: 'Running Shoes',
        slug: 'running-shoes',
        parent: {
          id: 'cat-2',
          name: 'Shoes',
          slug: 'shoes',
          parent: {
            id: 'cat-1',
            name: 'Footwear',
            slug: 'footwear',
          },
        },
      };

      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.generateCategoryBreadcrumbSchema('cat-3');

      expect(result!.itemListElement.length).toBe(4); // Home + 3 categories
    });
  });

  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Test Product',
        offers: { price: 99.99 },
        image: 'https://example.com/image.jpg',
      };

      const result = service.validateSchema({ schema });

      expect(result.valid).toBe(true);
      expect(result.detectedTypes).toContain('Product');
    });

    it('should detect missing @context', () => {
      const schema = {
        '@type': 'Product',
        name: 'Test',
      };

      const result = service.validateSchema({ schema });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required @context property');
    });

    it('should warn on non-standard @context', () => {
      const schema = {
        '@context': 'https://other-schema.org',
        '@type': 'Product',
        name: 'Test',
      };

      const result = service.validateSchema({ schema });

      expect(result.warnings?.some((w) => w.includes('Non-standard'))).toBe(true);
    });

    it('should detect missing @type', () => {
      const schema = {
        '@context': 'https://schema.org',
        name: 'Test',
      };

      const result = service.validateSchema({ schema });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required @type property');
    });

    it('should validate Product schema requirements', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
      };

      const result = service.validateSchema({ schema });

      expect(result.errors?.some((e) => e.includes('name'))).toBe(true);
    });

    it('should validate Organization schema requirements', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
      };

      const result = service.validateSchema({ schema });

      expect(result.errors?.some((e) => e.includes('name'))).toBe(true);
    });

    it('should validate BreadcrumbList schema requirements', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
      };

      const result = service.validateSchema({ schema });

      expect(result.errors?.some((e) => e.includes('itemListElement'))).toBe(true);
    });

    it('should validate FAQPage schema requirements', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
      };

      const result = service.validateSchema({ schema });

      expect(result.errors?.some((e) => e.includes('mainEntity'))).toBe(true);
    });

    it('should validate Article schema requirements', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
      };

      const result = service.validateSchema({ schema });

      expect(result.errors?.some((e) => e.includes('headline'))).toBe(true);
    });

    it('should warn on empty fields', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Test',
        description: '',
      };

      const result = service.validateSchema({ schema });

      expect(result.warnings?.some((w) => w.includes('description'))).toBe(true);
    });
  });

  describe('toScriptTag', () => {
    it('should wrap schema in script tag', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Test',
      };

      const result = service.toScriptTag(schema);

      expect(result).toContain('<script type="application/ld+json">');
      expect(result).toContain('</script>');
      expect(result).toContain('"@type": "Product"');
    });
  });

  describe('generatePageSchemas', () => {
    it('should generate multiple schemas for a page', () => {
      const result = service.generatePageSchemas({
        includeOrganization: true,
        includeWebsite: true,
      });

      expect(result.length).toBe(2);
      expect(result.some((s) => s['@type'] === 'Organization')).toBe(true);
      expect(result.some((s) => s['@type'] === 'WebSite')).toBe(true);
    });

    it('should include product schema when provided', () => {
      const result = service.generatePageSchemas({
        product: {
          name: 'Test Product',
          description: 'Test',
          images: [],
          offer: { price: 10, priceCurrency: 'USD', availability: 'InStock', itemCondition: 'NewCondition' },
        },
      });

      expect(result.some((s) => s['@type'] === 'Product')).toBe(true);
    });

    it('should include breadcrumbs when provided', () => {
      const result = service.generatePageSchemas({
        breadcrumbs: {
          items: [{ position: 1, name: 'Home', item: 'https://example.com/' }],
        },
      });

      expect(result.some((s) => s['@type'] === 'BreadcrumbList')).toBe(true);
    });

    it('should include FAQ when provided', () => {
      const result = service.generatePageSchemas({
        faq: {
          items: [{ question: 'Q?', answer: 'A.' }],
        },
      });

      expect(result.some((s) => s['@type'] === 'FAQPage')).toBe(true);
    });

    it('should include article when provided', () => {
      const result = service.generatePageSchemas({
        article: {
          headline: 'Test',
          description: 'Test',
          author: 'Author',
          datePublished: '2024-01-01',
        },
      });

      expect(result.some((s) => s['@type'] === 'Article')).toBe(true);
    });
  });
});
