import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { SitemapChangeFrequency } from '../dto/sitemap.dto';

/**
 * Supported locales for sitemap generation
 */
const SUPPORTED_LOCALES = [
  { code: 'en', hreflang: 'en-us' },
  { code: 'en-GB', hreflang: 'en-gb' },
  { code: 'fr', hreflang: 'fr-fr' },
  { code: 'fr-CA', hreflang: 'fr-ca' },
  { code: 'es', hreflang: 'es-es' },
  { code: 'es-MX', hreflang: 'es-mx' },
  { code: 'de', hreflang: 'de-de' },
  { code: 'pt', hreflang: 'pt-br' },
  { code: 'ar', hreflang: 'ar-ae' },
  { code: 'zh', hreflang: 'zh-cn' },
  { code: 'ja', hreflang: 'ja-jp' },
  { code: 'ko', hreflang: 'ko-kr' },
];

interface LocaleSitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  alternates?: Array<{ hreflang: string; href: string }>;
}

@Injectable()
export class LocaleSitemapService {
  private readonly logger = new Logger(LocaleSitemapService.name);
  private readonly baseUrl: string;
  private readonly cachePrefix = 'seo:sitemap:locale:';
  private readonly maxUrlsPerSitemap = 50000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://broxiva.com';
  }

  /**
   * Generate sitemap index with per-locale sitemaps
   */
  async generateLocaleSitemapIndex(tenantId?: string): Promise<string> {
    const cacheKey = `${this.cachePrefix}index:${tenantId || 'default'}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date().toISOString();
    const sitemaps: Array<{ loc: string; lastmod: string }> = [];

    // Add per-locale sitemaps
    for (const locale of SUPPORTED_LOCALES) {
      sitemaps.push({
        loc: `${this.baseUrl}/api/seo/sitemap/${locale.code}.xml`,
        lastmod: now,
      });
    }

    // Add general sitemaps
    sitemaps.push(
      { loc: `${this.baseUrl}/api/seo/sitemap/products.xml`, lastmod: now },
      { loc: `${this.baseUrl}/api/seo/sitemap/categories.xml`, lastmod: now },
      { loc: `${this.baseUrl}/api/seo/sitemap/pages.xml`, lastmod: now },
      { loc: `${this.baseUrl}/api/seo/sitemap/vendors.xml`, lastmod: now },
    );

    // Check product count for chunked sitemaps
    const productCount = await this.prisma.product.count({
      where: { isActive: true, status: 'ACTIVE' },
    });

    // If more than 50k products, create chunked sitemaps
    if (productCount > this.maxUrlsPerSitemap) {
      const chunks = Math.ceil(productCount / this.maxUrlsPerSitemap);
      for (let i = 1; i <= chunks; i++) {
        sitemaps.push({
          loc: `${this.baseUrl}/api/seo/sitemap/products-${i}.xml`,
          lastmod: now,
        });
      }
    }

    const xml = this.buildSitemapIndexXml(sitemaps);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate locale-specific sitemap
   */
  async generateLocaleSitemap(locale: string, tenantId?: string): Promise<string> {
    const cacheKey = `${this.cachePrefix}${locale}:${tenantId || 'default'}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Generating sitemap for locale: ${locale}`);

    const urls: LocaleSitemapUrl[] = [];

    // Add static pages with alternates
    const staticPages = [
      { path: '', priority: 1.0, changefreq: SitemapChangeFrequency.DAILY },
      { path: '/categories', priority: 0.9, changefreq: SitemapChangeFrequency.DAILY },
      { path: '/products', priority: 0.9, changefreq: SitemapChangeFrequency.DAILY },
      { path: '/deals', priority: 0.8, changefreq: SitemapChangeFrequency.DAILY },
      { path: '/about', priority: 0.5, changefreq: SitemapChangeFrequency.MONTHLY },
      { path: '/contact', priority: 0.5, changefreq: SitemapChangeFrequency.MONTHLY },
      { path: '/help', priority: 0.6, changefreq: SitemapChangeFrequency.WEEKLY },
      { path: '/shipping', priority: 0.5, changefreq: SitemapChangeFrequency.MONTHLY },
      { path: '/returns', priority: 0.5, changefreq: SitemapChangeFrequency.MONTHLY },
    ];

    const now = new Date().toISOString();

    for (const page of staticPages) {
      const alternates = this.generateAlternates(page.path);
      urls.push({
        loc: `${this.baseUrl}/${locale}${page.path}`,
        lastmod: now,
        changefreq: page.changefreq,
        priority: page.priority,
        alternates,
      });
    }

    // Add products with translations
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
          select: { slug: true },
        },
      },
      take: this.maxUrlsPerSitemap - staticPages.length,
      orderBy: { updatedAt: 'desc' },
    });

    for (const product of products) {
      // Use translated slug if available
      const translatedSlug = product.translations[0]?.slug || product.slug;
      const productPath = `/products/${translatedSlug}`;

      urls.push({
        loc: `${this.baseUrl}/${locale}${productPath}`,
        lastmod: product.updatedAt.toISOString(),
        changefreq: SitemapChangeFrequency.WEEKLY,
        priority: 0.8,
        alternates: this.generateProductAlternates(product.slug, product.translations),
      });
    }

    // Add categories with translations
    const categories = await this.prisma.category.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
        translations: {
          where: { languageCode: locale },
          select: { slug: true },
        },
      },
      orderBy: [{ level: 'asc' }, { updatedAt: 'desc' }],
    });

    for (const category of categories) {
      const translatedSlug = category.translations?.[0]?.slug || category.slug;
      const categoryPath = `/categories/${translatedSlug}`;

      urls.push({
        loc: `${this.baseUrl}/${locale}${categoryPath}`,
        lastmod: category.updatedAt.toISOString(),
        changefreq: SitemapChangeFrequency.WEEKLY,
        priority: 0.7,
        alternates: this.generateAlternates(`/categories/${category.slug}`),
      });
    }

    const xml = this.buildUrlSetXml(urls);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate chunked product sitemap
   */
  async generateChunkedProductSitemap(
    chunk: number,
    locale?: string,
  ): Promise<string> {
    const cacheKey = `${this.cachePrefix}products:${chunk}:${locale || 'all'}`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (chunk - 1) * this.maxUrlsPerSitemap;

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
      },
      skip,
      take: this.maxUrlsPerSitemap,
      orderBy: { updatedAt: 'desc' },
    });

    const urls: LocaleSitemapUrl[] = products.map((product) => ({
      loc: locale
        ? `${this.baseUrl}/${locale}/products/${product.slug}`
        : `${this.baseUrl}/products/${product.slug}`,
      lastmod: product.updatedAt.toISOString(),
      changefreq: SitemapChangeFrequency.WEEKLY,
      priority: 0.8,
      alternates: this.generateAlternates(`/products/${product.slug}`),
    }));

    const xml = this.buildUrlSetXml(urls);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate vendor sitemap
   */
  async generateVendorSitemap(): Promise<string> {
    const cacheKey = `${this.cachePrefix}vendors`;

    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const vendors = await this.prisma.organization.findMany({
      where: {
        type: 'VENDOR',
        status: 'ACTIVE',
      },
      select: {
        slug: true,
        updatedAt: true,
        name: true,
        logoUrl: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: this.maxUrlsPerSitemap,
    });

    const urls: LocaleSitemapUrl[] = vendors.map((vendor) => ({
      loc: `${this.baseUrl}/vendor/${vendor.slug}`,
      lastmod: vendor.updatedAt.toISOString(),
      changefreq: SitemapChangeFrequency.WEEKLY,
      priority: 0.6,
      alternates: this.generateAlternates(`/vendor/${vendor.slug}`),
    }));

    const xml = this.buildUrlSetXml(urls);

    await this.cacheService.set(cacheKey, xml, { ttl: CacheTTL.LONG });

    return xml;
  }

  /**
   * Generate alternates for a given path
   */
  private generateAlternates(path: string): Array<{ hreflang: string; href: string }> {
    const alternates: Array<{ hreflang: string; href: string }> = [];

    // Add x-default
    alternates.push({
      hreflang: 'x-default',
      href: `${this.baseUrl}${path}`,
    });

    // Add all locale variants
    for (const locale of SUPPORTED_LOCALES) {
      alternates.push({
        hreflang: locale.hreflang,
        href: `${this.baseUrl}/${locale.code}${path}`,
      });
    }

    return alternates;
  }

  /**
   * Generate product alternates with translations
   */
  private generateProductAlternates(
    baseSlug: string,
    translations: Array<{ slug?: string; languageCode?: string }>,
  ): Array<{ hreflang: string; href: string }> {
    const alternates: Array<{ hreflang: string; href: string }> = [];

    // Add x-default
    alternates.push({
      hreflang: 'x-default',
      href: `${this.baseUrl}/products/${baseSlug}`,
    });

    // Create a map of translations
    const translationMap = new Map(
      translations
        .filter((t) => t.slug && t.languageCode)
        .map((t) => [t.languageCode!, t.slug!])
    );

    // Add all locale variants
    for (const locale of SUPPORTED_LOCALES) {
      const slug = translationMap.get(locale.code) || baseSlug;
      alternates.push({
        hreflang: locale.hreflang,
        href: `${this.baseUrl}/${locale.code}/products/${slug}`,
      });
    }

    return alternates;
  }

  /**
   * Build sitemap index XML
   */
  private buildSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod: string }>): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const sitemap of sitemaps) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${this.escapeXml(sitemap.loc)}</loc>\n`;
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Build URL set XML with alternates (hreflang)
   */
  private buildUrlSetXml(urls: LocaleSitemapUrl[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

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

      // Add hreflang alternates
      if (url.alternates && url.alternates.length > 0) {
        for (const alt of url.alternates) {
          xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${this.escapeXml(alt.href)}"/>\n`;
        }
      }

      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Escape XML special characters
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
   * Invalidate all locale sitemap caches
   */
  async invalidateCache(): Promise<void> {
    await this.cacheService.deletePattern(`${this.cachePrefix}*`);
    this.logger.log('Locale sitemap cache invalidated');
  }
}
