import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SchemaOrg } from '../interfaces/seo.interfaces';
import {
  SchemaType,
  GenerateProductSchemaDto,
  GenerateOrganizationSchemaDto,
  GenerateBreadcrumbSchemaDto,
  GenerateFAQSchemaDto,
  GenerateArticleSchemaDto,
  GenerateSchemaDto,
  ValidateSchemaDto,
  SchemaValidationResultDto,
} from '../dto/schema.dto';

@Injectable()
export class SchemaService {
  private readonly logger = new Logger(SchemaService.name);
  private readonly baseUrl: string;
  private readonly organizationDefaults: {
    name: string;
    logo: string;
    description: string;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
    this.organizationDefaults = {
      name: this.configService.get<string>('ORGANIZATION_NAME') || 'Broxiva',
      logo: this.configService.get<string>('ORGANIZATION_LOGO') || `${this.baseUrl}/logo.png`,
      description: this.configService.get<string>('ORGANIZATION_DESCRIPTION') ||
        'Your premier multi-vendor e-commerce marketplace',
    };
  }

  /**
   * Generate schema based on type
   */
  async generateSchema(dto: GenerateSchemaDto): Promise<SchemaOrg> {
    switch (dto.type) {
      case SchemaType.PRODUCT:
        return this.generateProductSchema(dto.data as GenerateProductSchemaDto);
      case SchemaType.ORGANIZATION:
        return this.generateOrganizationSchema(dto.data as GenerateOrganizationSchemaDto);
      case SchemaType.BREADCRUMB_LIST:
        return this.generateBreadcrumbSchema(dto.data as GenerateBreadcrumbSchemaDto);
      case SchemaType.FAQ:
        return this.generateFAQSchema(dto.data as GenerateFAQSchemaDto);
      case SchemaType.ARTICLE:
      case SchemaType.BLOG_POSTING:
      case SchemaType.NEWS_ARTICLE:
        return this.generateArticleSchema({ ...dto.data, type: dto.type } as GenerateArticleSchemaDto);
      case SchemaType.WEBSITE:
        return this.generateWebsiteSchema();
      case SchemaType.SEARCH_ACTION:
        return this.generateSearchActionSchema();
      default:
        throw new BadRequestException(`Schema type ${dto.type} not implemented`);
    }
  }

  /**
   * Generate Product schema
   */
  generateProductSchema(dto: GenerateProductSchemaDto): SchemaOrg {
    const schema: SchemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: dto.name,
      description: dto.description,
      image: dto.images,
      offers: {
        '@type': 'Offer',
        price: dto.offer.price,
        priceCurrency: dto.offer.priceCurrency,
        availability: this.mapAvailability(dto.offer.availability),
        itemCondition: this.mapCondition(dto.offer.itemCondition),
        url: dto.url || dto.offer.url,
        priceValidUntil: dto.offer.priceValidUntil,
        seller: dto.offer.seller || {
          '@type': 'Organization',
          name: this.organizationDefaults.name,
        },
      },
    };

    if (dto.sku) {
      schema.sku = dto.sku;
    }

    if (dto.mpn) {
      schema.mpn = dto.mpn;
    }

    if (dto.gtin) {
      schema.gtin = dto.gtin;
      // Also set specific GTIN type based on length
      if (dto.gtin.length === 8) schema.gtin8 = dto.gtin;
      else if (dto.gtin.length === 12) schema.gtin12 = dto.gtin;
      else if (dto.gtin.length === 13) schema.gtin13 = dto.gtin;
      else if (dto.gtin.length === 14) schema.gtin14 = dto.gtin;
    }

    if (dto.brand) {
      schema.brand = {
        '@type': 'Brand',
        name: dto.brand,
      };
    }

    if (dto.category) {
      schema.category = dto.category;
    }

    if (dto.aggregateRating) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: dto.aggregateRating.ratingValue,
        bestRating: dto.aggregateRating.bestRating || 5,
        worstRating: dto.aggregateRating.worstRating || 1,
        reviewCount: dto.aggregateRating.reviewCount,
        ratingCount: dto.aggregateRating.ratingCount,
      };
    }

    if (dto.reviews && dto.reviews.length > 0) {
      schema.review = dto.reviews.map((review) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: review.author,
        },
        reviewBody: review.reviewBody,
        datePublished: review.datePublished,
        reviewRating: review.reviewRating
          ? {
              '@type': 'Rating',
              ratingValue: review.reviewRating.ratingValue,
              bestRating: review.reviewRating.bestRating || 5,
              worstRating: review.reviewRating.worstRating || 1,
            }
          : undefined,
      }));
    }

    if (dto.url) {
      schema.url = dto.url;
    }

    return schema;
  }

  /**
   * Generate Organization schema
   */
  generateOrganizationSchema(dto?: GenerateOrganizationSchemaDto): SchemaOrg {
    const schema: SchemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: dto?.name || this.organizationDefaults.name,
      url: dto?.url || this.baseUrl,
      logo: dto?.logo || this.organizationDefaults.logo,
      description: dto?.description || this.organizationDefaults.description,
    };

    if (dto?.email) {
      schema.email = dto.email;
    }

    if (dto?.telephone) {
      schema.telephone = dto.telephone;
    }

    if (dto?.sameAs && dto.sameAs.length > 0) {
      schema.sameAs = dto.sameAs;
    }

    if (dto?.address) {
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: dto.address.streetAddress,
        addressLocality: dto.address.addressLocality,
        addressRegion: dto.address.addressRegion,
        postalCode: dto.address.postalCode,
        addressCountry: dto.address.addressCountry,
      };
    }

    return schema;
  }

  /**
   * Generate BreadcrumbList schema
   */
  generateBreadcrumbSchema(dto: GenerateBreadcrumbSchemaDto): SchemaOrg {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: dto.items.map((item) => ({
        '@type': 'ListItem',
        position: item.position,
        name: item.name,
        item: item.item,
      })),
    };
  }

  /**
   * Generate FAQ schema
   */
  generateFAQSchema(dto: GenerateFAQSchemaDto): SchemaOrg {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: dto.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }

  /**
   * Generate Article schema
   */
  generateArticleSchema(dto: GenerateArticleSchemaDto): SchemaOrg {
    const type = dto.type || SchemaType.ARTICLE;

    const schema: SchemaOrg = {
      '@context': 'https://schema.org',
      '@type': type,
      headline: dto.headline,
      description: dto.description,
      author: {
        '@type': 'Person',
        name: dto.author,
      },
      datePublished: dto.datePublished,
      dateModified: dto.dateModified || dto.datePublished,
    };

    if (dto.image) {
      schema.image = dto.image;
    }

    if (dto.publisher || this.organizationDefaults.name) {
      schema.publisher = {
        '@type': 'Organization',
        name: dto.publisher || this.organizationDefaults.name,
        logo: {
          '@type': 'ImageObject',
          url: dto.publisherLogo || this.organizationDefaults.logo,
        },
      };
    }

    if (dto.mainEntityOfPage) {
      schema.mainEntityOfPage = {
        '@type': 'WebPage',
        '@id': dto.mainEntityOfPage,
      };
    }

    if (dto.wordCount) {
      schema.wordCount = dto.wordCount;
    }

    if (dto.articleBody) {
      schema.articleBody = dto.articleBody;
    }

    return schema;
  }

  /**
   * Generate WebSite schema with search action
   */
  generateWebsiteSchema(): SchemaOrg {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.organizationDefaults.name,
      url: this.baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  /**
   * Generate SearchAction schema
   */
  generateSearchActionSchema(): SchemaOrg {
    return {
      '@context': 'https://schema.org',
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${this.baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  /**
   * Generate product schema from database product
   */
  async generateProductSchemaFromId(productId: string): Promise<SchemaOrg | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        vendor: { select: { name: true } },
        reviews: {
          where: { status: 'APPROVED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) {
      return null;
    }

    // Calculate aggregate rating
    const reviews = product.reviews || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : 0;

    const dto: GenerateProductSchemaDto = {
      name: product.name,
      description: product.description,
      images: product.images.map((img) =>
        img.startsWith('http') ? img : `${this.baseUrl}${img}`,
      ),
      offer: {
        price: product.price,
        priceCurrency: 'USD',
        availability: product.stock > 0 ? 'InStock' : 'OutOfStock',
        itemCondition: 'NewCondition',
        seller: {
          '@type': 'Organization',
          name: product.vendor?.name || this.organizationDefaults.name,
        },
      },
      sku: product.sku || undefined,
      brand: product.vendor?.name,
      category: product.category?.name,
      url: `${this.baseUrl}/products/${product.slug}`,
    };

    if (reviews.length > 0) {
      dto.aggregateRating = {
        ratingValue: Math.round(avgRating * 10) / 10,
        reviewCount: product._count.reviews,
        bestRating: 5,
        worstRating: 1,
      };

      dto.reviews = reviews.map((r: { rating: number; comment: string | null; createdAt: Date; user: { name: string } | null }) => ({
        author: r.user?.name || 'Anonymous',
        reviewBody: r.comment || '',
        datePublished: r.createdAt.toISOString(),
        reviewRating: {
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
      }));
    }

    return this.generateProductSchema(dto);
  }

  /**
   * Generate breadcrumb schema for a category
   */
  async generateCategoryBreadcrumbSchema(categoryId: string): Promise<SchemaOrg | null> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    const breadcrumbs: { position: number; name: string; item: string }[] = [];
    let position = 1;

    // Build breadcrumb chain
    breadcrumbs.push({
      position: position++,
      name: 'Home',
      item: this.baseUrl,
    });

    // Add parent categories
    const categoryChain: Array<{ name: string; slug: string }> = [];
    let current: { name: string; slug: string; parent?: { name: string; slug: string; parent?: { name: string; slug: string } | null } | null } | null | undefined = category;
    while (current) {
      categoryChain.unshift({ name: current.name, slug: current.slug });
      current = current.parent;
    }

    for (const cat of categoryChain) {
      breadcrumbs.push({
        position: position++,
        name: cat.name,
        item: `${this.baseUrl}/categories/${cat.slug}`,
      });
    }

    return this.generateBreadcrumbSchema({ items: breadcrumbs });
  }

  /**
   * Validate JSON-LD schema
   */
  validateSchema(dto: ValidateSchemaDto): SchemaValidationResultDto {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedTypes: string[] = [];

    const schema = dto.schema;

    // Check for required @context
    if (!schema['@context']) {
      errors.push('Missing required @context property');
    } else if (schema['@context'] !== 'https://schema.org') {
      warnings.push('Non-standard @context. Expected "https://schema.org"');
    }

    // Check for required @type
    if (!schema['@type']) {
      errors.push('Missing required @type property');
    } else {
      const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
      detectedTypes.push(...types);

      // Validate specific types
      for (const type of types) {
        this.validateSchemaType(type, schema, errors, warnings);
      }
    }

    // Check for empty required fields
    this.checkRequiredFields(schema, errors, warnings);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      detectedTypes,
    };
  }

  /**
   * Validate schema by type
   */
  private validateSchemaType(
    type: string,
    schema: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    switch (type) {
      case 'Product':
        if (!schema.name) errors.push('Product schema missing required "name" property');
        if (!schema.offers && !schema.offer) warnings.push('Product schema should have "offers" property');
        if (!schema.image) warnings.push('Product schema should have "image" property');
        break;

      case 'Organization':
        if (!schema.name) errors.push('Organization schema missing required "name" property');
        if (!schema.url) warnings.push('Organization schema should have "url" property');
        break;

      case 'BreadcrumbList':
        if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
          errors.push('BreadcrumbList schema missing required "itemListElement" array');
        }
        break;

      case 'FAQPage':
        if (!schema.mainEntity || !Array.isArray(schema.mainEntity)) {
          errors.push('FAQPage schema missing required "mainEntity" array');
        }
        break;

      case 'Article':
      case 'BlogPosting':
      case 'NewsArticle':
        if (!schema.headline) errors.push(`${type} schema missing required "headline" property`);
        if (!schema.author) warnings.push(`${type} schema should have "author" property`);
        if (!schema.datePublished) warnings.push(`${type} schema should have "datePublished" property`);
        break;
    }
  }

  /**
   * Check for empty required fields
   */
  private checkRequiredFields(
    schema: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    for (const [key, value] of Object.entries(schema)) {
      if (value === '' || value === null) {
        warnings.push(`Field "${key}" is empty`);
      }
      if (Array.isArray(value) && value.length === 0) {
        warnings.push(`Array field "${key}" is empty`);
      }
    }
  }

  /**
   * Map availability string to schema.org value
   */
  private mapAvailability(availability?: string): string {
    const map: Record<string, string> = {
      InStock: 'https://schema.org/InStock',
      OutOfStock: 'https://schema.org/OutOfStock',
      PreOrder: 'https://schema.org/PreOrder',
      BackOrder: 'https://schema.org/BackOrder',
      Discontinued: 'https://schema.org/Discontinued',
      LimitedAvailability: 'https://schema.org/LimitedAvailability',
    };

    return map[availability || 'InStock'] || map.InStock;
  }

  /**
   * Map condition string to schema.org value
   */
  private mapCondition(condition?: string): string {
    const map: Record<string, string> = {
      NewCondition: 'https://schema.org/NewCondition',
      UsedCondition: 'https://schema.org/UsedCondition',
      RefurbishedCondition: 'https://schema.org/RefurbishedCondition',
      DamagedCondition: 'https://schema.org/DamagedCondition',
    };

    return map[condition || 'NewCondition'] || map.NewCondition;
  }

  /**
   * Convert schema to JSON-LD script tag
   */
  toScriptTag(schema: SchemaOrg): string {
    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
  }

  /**
   * Generate multiple schemas for a page
   */
  generatePageSchemas(options: {
    includeOrganization?: boolean;
    includeWebsite?: boolean;
    product?: GenerateProductSchemaDto;
    breadcrumbs?: GenerateBreadcrumbSchemaDto;
    faq?: GenerateFAQSchemaDto;
    article?: GenerateArticleSchemaDto;
  }): SchemaOrg[] {
    const schemas: SchemaOrg[] = [];

    if (options.includeOrganization) {
      schemas.push(this.generateOrganizationSchema());
    }

    if (options.includeWebsite) {
      schemas.push(this.generateWebsiteSchema());
    }

    if (options.product) {
      schemas.push(this.generateProductSchema(options.product));
    }

    if (options.breadcrumbs) {
      schemas.push(this.generateBreadcrumbSchema(options.breadcrumbs));
    }

    if (options.faq) {
      schemas.push(this.generateFAQSchema(options.faq));
    }

    if (options.article) {
      schemas.push(this.generateArticleSchema(options.article));
    }

    return schemas;
  }
}
