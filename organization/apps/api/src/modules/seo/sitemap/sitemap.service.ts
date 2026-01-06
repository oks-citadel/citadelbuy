import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { SitemapUrl, SitemapIndex, SitemapImage, SitemapAlternate } from '../interfaces/seo.interfaces';
import { GenerateSitemapDto, SitemapChangeFrequency } from '../dto/sitemap.dto';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  private readonly baseUrl: string;
  private readonly cachePrefix = 'seo:sitemap:';
  private readonly maxUrlsPerSitemap = 50000; // Google's limit

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
  }

  /**
   * Generate main sitemap index
   */
  async generateSitemapIndex(): Promise<string> {
    const cacheKey = `${this.cachePrefix}index`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const sitemaps: SitemapIndex['sitemaps'] = [];
    const now = new Date().toISOString();

    // Add main sitemaps
    sitemaps.push(
      { loc: `${this.baseUrl}/api/seo/sitemap/products.xml`, lastmod: now },
      { loc: `${this.baseUrl}/api/seo/sitemap/categories.xml`, lastmod: now },
      { loc: `${this.baseUrl}/api/seo/sitemap/pages.xml`, lastmod: now },
    );

    // Check if we have blog posts
    const blogCount = await this.prisma.knowledgeBaseArticle?.count().catch(() => 0) || 0;
    if (blogCount > 0) {
      sitemaps.push({ loc: `${this.baseUrl}/api/seo/sitemap/blog.xml`, lastmod: now });
    }

    // Get unique locales for tenant-specific sitemaps
    const locales = ['en', 'es', 'fr', 'de']; // Default supported locales
    for (const locale of locales) {
      sitemaps.push({
        loc: `${this.baseUrl}/api/seo/sitemap/default/${locale}.xml`,
        lastmod: now,
      });
    }

    const xml = this.buildSitemapIndexXml(sitemaps);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate product sitemap
   */
  async generateProductSitemap(options?: GenerateSitemapDto): Promise<string> {
    const cacheKey = `${this.cachePrefix}products:${options?.locale || 'default'}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      select: {
        slug: true,
        updatedAt: true,
        images: true,
        name: true,
        description: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: this.maxUrlsPerSitemap,
    });

    const urls: SitemapUrl[] = products.map((product) => {
      const images: SitemapImage[] = (product.images || []).map((img, index) => ({
        loc: img.startsWith('http') ? img : `${this.baseUrl}${img}`,
        title: `${product.name} - Image ${index + 1}`,
        caption: product.description?.substring(0, 200),
      }));

      return {
        loc: `${this.baseUrl}/products/${product.slug}`,
        lastmod: product.updatedAt.toISOString(),
        changefreq: SitemapChangeFrequency.WEEKLY,
        priority: 0.8,
        images: images.length > 0 ? images : undefined,
      };
    });

    const xml = this.buildUrlSetXml(urls, true); // Include image namespace

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate category sitemap
   */
  async generateCategorySitemap(options?: GenerateSitemapDto): Promise<string> {
    const cacheKey = `${this.cachePrefix}categories:${options?.locale || 'default'}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
        thumbnailUrl: true,
        name: true,
        level: true,
      },
      orderBy: [{ level: 'asc' }, { updatedAt: 'desc' }],
    });

    const urls: SitemapUrl[] = categories.map((category) => {
      const images: SitemapImage[] = category.thumbnailUrl
        ? [{
            loc: category.thumbnailUrl.startsWith('http')
              ? category.thumbnailUrl
              : `${this.baseUrl}${category.thumbnailUrl}`,
            title: category.name,
          }]
        : [];

      // Higher priority for top-level categories
      const priority = category.level === 0 ? 0.9 : category.level === 1 ? 0.7 : 0.6;

      return {
        loc: `${this.baseUrl}/categories/${category.slug}`,
        lastmod: category.updatedAt.toISOString(),
        changefreq: SitemapChangeFrequency.WEEKLY,
        priority,
        images: images.length > 0 ? images : undefined,
      };
    });

    const xml = this.buildUrlSetXml(urls, true);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate static pages sitemap
   */
  async generatePagesSitemap(): Promise<string> {
    const cacheKey = `${this.cachePrefix}pages`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date().toISOString();

    // Static pages that should be indexed
    const staticPages: SitemapUrl[] = [
      { loc: `${this.baseUrl}/`, lastmod: now, changefreq: SitemapChangeFrequency.DAILY, priority: 1.0 },
      { loc: `${this.baseUrl}/about`, lastmod: now, changefreq: SitemapChangeFrequency.MONTHLY, priority: 0.5 },
      { loc: `${this.baseUrl}/contact`, lastmod: now, changefreq: SitemapChangeFrequency.MONTHLY, priority: 0.5 },
      { loc: `${this.baseUrl}/privacy-policy`, lastmod: now, changefreq: SitemapChangeFrequency.YEARLY, priority: 0.3 },
      { loc: `${this.baseUrl}/terms-of-service`, lastmod: now, changefreq: SitemapChangeFrequency.YEARLY, priority: 0.3 },
      { loc: `${this.baseUrl}/shipping-info`, lastmod: now, changefreq: SitemapChangeFrequency.MONTHLY, priority: 0.4 },
      { loc: `${this.baseUrl}/returns`, lastmod: now, changefreq: SitemapChangeFrequency.MONTHLY, priority: 0.4 },
      { loc: `${this.baseUrl}/faq`, lastmod: now, changefreq: SitemapChangeFrequency.WEEKLY, priority: 0.6 },
      { loc: `${this.baseUrl}/deals`, lastmod: now, changefreq: SitemapChangeFrequency.DAILY, priority: 0.8 },
    ];

    const xml = this.buildUrlSetXml(staticPages);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate blog/content sitemap
   */
  async generateBlogSitemap(): Promise<string> {
    const cacheKey = `${this.cachePrefix}blog`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // Try to get blog/knowledge base articles if they exist
    let articles: any[] = [];
    try {
      articles = await this.prisma.knowledgeBaseArticle.findMany({
        where: {
          isPublished: true,
        },
        select: {
          slug: true,
          updatedAt: true,
          title: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: this.maxUrlsPerSitemap,
      });
    } catch (error) {
      this.logger.warn('KnowledgeBaseArticle model not available for blog sitemap');
      articles = [];
    }

    const urls: SitemapUrl[] = articles.map((article) => ({
      loc: `${this.baseUrl}/blog/${article.slug}`,
      lastmod: article.updatedAt.toISOString(),
      changefreq: SitemapChangeFrequency.MONTHLY,
      priority: 0.6,
    }));

    // Add blog index page
    urls.unshift({
      loc: `${this.baseUrl}/blog`,
      lastmod: new Date().toISOString(),
      changefreq: SitemapChangeFrequency.DAILY,
      priority: 0.7,
    });

    const xml = this.buildUrlSetXml(urls);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate tenant-specific sitemap with locale
   */
  async generateTenantLocaleSitemap(tenantId: string, locale: string): Promise<string> {
    const cacheKey = `${this.cachePrefix}tenant:${tenantId}:${locale}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    // For multi-tenant setup, filter by tenant/organization
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      select: {
        slug: true,
        updatedAt: true,
        translations: {
          where: { languageCode: locale },
          select: { name: true },
        },
      },
      take: this.maxUrlsPerSitemap,
    });

    const urls: SitemapUrl[] = products.map((product) => {
      const alternates: SitemapAlternate[] = [
        { hreflang: locale, href: `${this.baseUrl}/${locale}/products/${product.slug}` },
        { hreflang: 'x-default', href: `${this.baseUrl}/products/${product.slug}` },
      ];

      return {
        loc: `${this.baseUrl}/${locale}/products/${product.slug}`,
        lastmod: product.updatedAt.toISOString(),
        changefreq: SitemapChangeFrequency.WEEKLY,
        priority: 0.8,
        alternates,
      };
    });

    const xml = this.buildUrlSetXml(urls, false, true); // Include xhtml namespace for alternates

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Invalidate all sitemap caches
   */
  async invalidateCache(): Promise<void> {
    await this.cacheService.deletePattern(`${this.cachePrefix}*`);
    this.logger.log('Sitemap cache invalidated');
  }

  /**
   * Build sitemap index XML
   */
  private buildSitemapIndexXml(sitemaps: SitemapIndex['sitemaps']): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const sitemap of sitemaps) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${this.escapeXml(sitemap.loc)}</loc>\n`;
      if (sitemap.lastmod) {
        xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
      }
      xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Build URL set XML
   */
  private buildUrlSetXml(
    urls: SitemapUrl[],
    includeImageNs = false,
    includeXhtmlNs = false,
  ): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

    if (includeImageNs) {
      xml += '\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }
    if (includeXhtmlNs) {
      xml += '\n        xmlns:xhtml="http://www.w3.org/1999/xhtml"';
    }
    xml += '>\n';

    for (const url of urls) {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;

      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }

      // Add images
      if (url.images && url.images.length > 0) {
        for (const image of url.images) {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${this.escapeXml(image.loc)}</image:loc>\n`;
          if (image.title) {
            xml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`;
          }
          if (image.caption) {
            xml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`;
          }
          if (image.geoLocation) {
            xml += `      <image:geo_location>${this.escapeXml(image.geoLocation)}</image:geo_location>\n`;
          }
          if (image.license) {
            xml += `      <image:license>${this.escapeXml(image.license)}</image:license>\n`;
          }
          xml += '    </image:image>\n';
        }
      }

      // Add alternates (hreflang)
      if (url.alternates && url.alternates.length > 0) {
        for (const alt of url.alternates) {
          xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${this.escapeXml(alt.href)}"/>\n`;
        }
      }

      // Add videos
      if (url.videos && url.videos.length > 0) {
        for (const video of url.videos) {
          xml += '    <video:video>\n';
          xml += `      <video:thumbnail_loc>${this.escapeXml(video.thumbnailLoc)}</video:thumbnail_loc>\n`;
          xml += `      <video:title>${this.escapeXml(video.title)}</video:title>\n`;
          xml += `      <video:description>${this.escapeXml(video.description)}</video:description>\n`;
          if (video.contentLoc) {
            xml += `      <video:content_loc>${this.escapeXml(video.contentLoc)}</video:content_loc>\n`;
          }
          if (video.playerLoc) {
            xml += `      <video:player_loc>${this.escapeXml(video.playerLoc)}</video:player_loc>\n`;
          }
          if (video.duration) {
            xml += `      <video:duration>${video.duration}</video:duration>\n`;
          }
          xml += '    </video:video>\n';
        }
      }

      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get sitemap statistics
   */
  async getSitemapStats(): Promise<{
    productCount: number;
    categoryCount: number;
    totalUrls: number;
    lastGenerated?: Date;
  }> {
    const [productCount, categoryCount] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    return {
      productCount,
      categoryCount,
      totalUrls: productCount + categoryCount + 10, // +10 for static pages
      lastGenerated: new Date(),
    };
  }
}
