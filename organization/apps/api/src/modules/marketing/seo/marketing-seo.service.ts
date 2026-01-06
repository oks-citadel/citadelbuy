import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  ISeoService,
  GenerateSitemapOptions,
  GenerateRobotsOptions,
  WebAppManifest,
  ReindexRequest,
  ReindexJob,
  SeoAuditQuery,
  SeoAuditResult,
  CoreWebVitalsQuery,
  CoreWebVitalsResult,
  JsonLdRequest,
  JsonLdSchema,
} from './interfaces/seo.interface';

@Injectable()
export class MarketingSeoService implements ISeoService {
  private readonly logger = new Logger(MarketingSeoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateSitemap(options: GenerateSitemapOptions): Promise<string> {
    this.logger.log(`Generating sitemap for organization: ${options.organizationId}`);

    const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }> = [];
    const baseUrl = options.baseUrl || 'https://example.com';

    // Add homepage
    urls.push({
      loc: baseUrl,
      changefreq: 'daily',
      priority: 1.0,
    });

    // Add products if enabled
    if (options.includeProducts !== false) {
      const products = await this.prisma.product.findMany({
        // Products don't have organizationId, use vendorId filter if needed
        select: { id: true, slug: true, updatedAt: true },
        take: 50000, // Sitemap limit
      });

      products.forEach((product) => {
        urls.push({
          loc: `${baseUrl}/products/${product.slug || product.id}`,
          lastmod: product.updatedAt.toISOString(),
          changefreq: 'weekly',
          priority: 0.8,
        });
      });
    }

    // Add categories if enabled
    if (options.includeCategories !== false) {
      const categories = await this.prisma.category.findMany({
        // Categories don't have organizationId
        select: { id: true, slug: true, updatedAt: true },
      });

      categories.forEach((category) => {
        urls.push({
          loc: `${baseUrl}/categories/${category.slug || category.id}`,
          lastmod: category.updatedAt.toISOString(),
          changefreq: 'weekly',
          priority: 0.7,
        });
      });
    }

    // Generate XML
    const xml = this.buildSitemapXml(urls);
    return xml;
  }

  private buildSitemapXml(
    urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }>,
  ): string {
    const urlEntries = urls
      .map((url) => {
        let entry = `  <url>\n    <loc>${this.escapeXml(url.loc)}</loc>`;
        if (url.lastmod) {
          entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
        }
        if (url.changefreq) {
          entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
        }
        if (url.priority !== undefined) {
          entry += `\n    <priority>${url.priority}</priority>`;
        }
        entry += '\n  </url>';
        return entry;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async generateRobotsTxt(options: GenerateRobotsOptions): Promise<string> {
    this.logger.log(`Generating robots.txt for organization: ${options.organizationId}`);

    const defaultRules = [
      { userAgent: '*', allow: ['/'], disallow: ['/admin', '/api', '/checkout', '/account'] },
    ];

    const rules = options.rules || defaultRules;
    const lines: string[] = [];

    rules.forEach((rule) => {
      lines.push(`User-agent: ${rule.userAgent}`);
      if (rule.allow) {
        rule.allow.forEach((path) => lines.push(`Allow: ${path}`));
      }
      if (rule.disallow) {
        rule.disallow.forEach((path) => lines.push(`Disallow: ${path}`));
      }
      if (rule.crawlDelay) {
        lines.push(`Crawl-delay: ${rule.crawlDelay}`);
      }
      lines.push('');
    });

    if (options.sitemaps) {
      options.sitemaps.forEach((sitemap) => {
        lines.push(`Sitemap: ${sitemap}`);
      });
    }

    return lines.join('\n');
  }

  async generateManifest(organizationId: string): Promise<WebAppManifest> {
    this.logger.log(`Generating web app manifest for organization: ${organizationId}`);

    // Fetch organization details for manifest
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true },
    });

    const manifest: WebAppManifest = {
      name: organization?.name || 'E-Commerce Store',
      short_name: organization?.slug || 'Store',
      description: 'Your one-stop shop for all your needs',
      start_url: '/',
      display: 'standalone',
      theme_color: '#1976d2',
      background_color: '#ffffff',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      scope: '/',
      categories: ['shopping', 'ecommerce'],
    };

    return manifest;
  }

  async queueReindex(request: ReindexRequest): Promise<ReindexJob> {
    this.logger.log(`Queueing reindex request for organization: ${request.organizationId}`);

    // In a real implementation, this would queue a job to a message broker
    const job: ReindexJob = {
      id: `reindex-${Date.now()}`,
      status: 'queued',
      urlsQueued: request.urls?.length || (request.fullReindex ? 1000 : 0),
      createdAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 3600000), // 1 hour estimate
    };

    return job;
  }

  async getAuditResults(query: SeoAuditQuery): Promise<SeoAuditResult> {
    this.logger.log(`Getting SEO audit results for organization: ${query.organizationId}`);

    // In a real implementation, this would return actual crawl data
    const result: SeoAuditResult = {
      totalPages: 150,
      crawledPages: 148,
      issues: [
        {
          id: 'issue-1',
          url: '/products/example',
          type: 'missing_meta_description',
          severity: 'warning',
          message: 'Missing meta description',
          recommendation: 'Add a unique meta description between 150-160 characters',
          detectedAt: new Date(),
        },
        {
          id: 'issue-2',
          url: '/categories/electronics',
          type: 'duplicate_title',
          severity: 'critical',
          message: 'Duplicate title tag found',
          recommendation: 'Ensure each page has a unique title tag',
          detectedAt: new Date(),
        },
      ],
      score: 78,
      lastCrawl: new Date(),
      recommendations: [
        'Add meta descriptions to 12 pages',
        'Fix 3 broken internal links',
        'Optimize images on 24 pages',
        'Add alt text to 45 images',
      ],
    };

    return result;
  }

  async getCoreWebVitals(query: CoreWebVitalsQuery): Promise<CoreWebVitalsResult> {
    this.logger.log(`Getting Core Web Vitals for organization: ${query.organizationId}`);

    // In a real implementation, this would fetch data from monitoring service
    const result: CoreWebVitalsResult = {
      lcp: {
        value: 2.1,
        rating: 'good',
        percentile75: 2.5,
      },
      fid: {
        value: 45,
        rating: 'good',
        percentile75: 100,
      },
      cls: {
        value: 0.08,
        rating: 'good',
        percentile75: 0.1,
      },
      fcp: {
        value: 1.2,
        rating: 'good',
        percentile75: 1.8,
      },
      ttfb: {
        value: 350,
        rating: 'good',
        percentile75: 800,
      },
      inp: {
        value: 120,
        rating: 'needs-improvement',
        percentile75: 200,
      },
      history: [
        { date: '2024-01-01', lcp: 2.3, fid: 50, cls: 0.09 },
        { date: '2024-01-08', lcp: 2.2, fid: 48, cls: 0.08 },
        { date: '2024-01-15', lcp: 2.1, fid: 45, cls: 0.08 },
      ],
    };

    return result;
  }

  async generateJsonLd(request: JsonLdRequest): Promise<JsonLdSchema[]> {
    this.logger.log(`Generating JSON-LD schemas for organization: ${request.organizationId}`);

    const schemas: JsonLdSchema[] = [];

    for (const config of request.schemas) {
      const schema = await this.buildSchema(config.type, config.entityId, config.additionalData);
      if (schema) {
        schemas.push(schema);
      }
    }

    return schemas;
  }

  private async buildSchema(
    type: string,
    entityId: string,
    additionalData?: Record<string, any>,
  ): Promise<JsonLdSchema | null> {
    const baseSchema: JsonLdSchema = {
      '@context': 'https://schema.org',
      '@type': type,
    };

    switch (type) {
      case 'Product': {
        const product = await this.prisma.product.findUnique({
          where: { id: entityId },
        });
        if (!product) return null;

        return {
          ...baseSchema,
          name: product.name,
          description: product.description,
          image: product.images?.[0], // images is String[], not an object relation
          // Note: Product doesn't have sku field, variants do
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
          ...additionalData,
        };
      }

      case 'Organization': {
        const org = await this.prisma.organization.findUnique({
          where: { id: entityId },
        });
        if (!org) return null;

        return {
          ...baseSchema,
          name: org.name,
          url: `https://example.com/${org.slug}`,
          ...additionalData,
        };
      }

      case 'BreadcrumbList': {
        return {
          ...baseSchema,
          itemListElement: additionalData?.items || [],
        };
      }

      case 'FAQPage': {
        return {
          ...baseSchema,
          mainEntity: additionalData?.questions || [],
        };
      }

      case 'WebSite': {
        return {
          ...baseSchema,
          url: additionalData?.url || 'https://example.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${additionalData?.url || 'https://example.com'}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
          ...additionalData,
        };
      }

      default:
        return { ...baseSchema, ...additionalData };
    }
  }
}
