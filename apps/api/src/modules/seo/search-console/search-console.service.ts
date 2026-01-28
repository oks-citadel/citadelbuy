import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  SearchConsoleQueryDto,
  SearchPerformanceDto,
  SearchQueryDataDto,
  PagePerformanceDto,
  SitemapStatusDto,
  CrawlErrorDto,
  IndexCoverageReportDto,
  SearchAnalyticsFilterDto,
  DeviceType,
  SearchType,
} from '../dto/search-console.dto';

@Injectable()
export class SearchConsoleService {
  private readonly logger = new Logger(SearchConsoleService.name);
  private readonly cachePrefix = 'seo:gsc:';

  // API credentials (would be stored securely)
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(redirectUri: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // In production, make actual API call to Google
    // For now, simulate token exchange
    this.accessToken = `simulated_access_token_${Date.now()}`;
    this.refreshToken = `simulated_refresh_token_${Date.now()}`;

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new BadRequestException('No refresh token available. Please re-authorize.');
    }

    // Simulate token refresh
    this.accessToken = `simulated_access_token_${Date.now()}`;
    return this.accessToken;
  }

  /**
   * Get search performance data
   */
  async getSearchPerformance(
    siteUrl: string,
    query: SearchConsoleQueryDto,
  ): Promise<SearchPerformanceDto> {
    const cacheKey = `${this.cachePrefix}performance:${siteUrl}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<SearchPerformanceDto>(cacheKey);
    if (cached) return cached;

    // Simulate Google Search Console API response
    const startDate = query.startDate || this.getDateString(-28);
    const endDate = query.endDate || this.getDateString(0);

    // Generate simulated data
    const data = this.generateSimulatedPerformanceData(siteUrl, startDate, endDate, query);

    await this.cacheService.set(cacheKey, data, { ttl: CacheTTL.MEDIUM });
    return data;
  }

  /**
   * Get top queries (keywords)
   */
  async getTopQueries(
    siteUrl: string,
    query: SearchConsoleQueryDto,
  ): Promise<SearchQueryDataDto[]> {
    const cacheKey = `${this.cachePrefix}queries:${siteUrl}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<SearchQueryDataDto[]>(cacheKey);
    if (cached) return cached;

    // Generate simulated query data
    const queries = this.generateSimulatedQueries(siteUrl, query.limit || 100);

    await this.cacheService.set(cacheKey, queries, { ttl: CacheTTL.MEDIUM });
    return queries;
  }

  /**
   * Get page performance data
   */
  async getPagePerformance(
    siteUrl: string,
    query: SearchConsoleQueryDto,
  ): Promise<PagePerformanceDto[]> {
    const cacheKey = `${this.cachePrefix}pages:${siteUrl}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<PagePerformanceDto[]>(cacheKey);
    if (cached) return cached;

    // Generate page performance data based on actual products
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      take: query.limit || 50,
    });

    const pages: PagePerformanceDto[] = products.map(product => ({
      page: `${siteUrl}/products/${product.slug}`,
      clicks: Math.floor(Math.random() * 500) + 10,
      impressions: Math.floor(Math.random() * 5000) + 100,
      ctr: Math.random() * 10,
      position: Math.random() * 50 + 1,
      topQueries: [
        `buy ${product.name}`.toLowerCase(),
        `${product.name} price`.toLowerCase(),
        `${product.name} review`.toLowerCase(),
      ],
    }));

    // Sort by clicks
    pages.sort((a, b) => b.clicks - a.clicks);

    await this.cacheService.set(cacheKey, pages, { ttl: CacheTTL.MEDIUM });
    return pages;
  }

  /**
   * Get sitemap status
   */
  async getSitemapStatus(siteUrl: string): Promise<SitemapStatusDto[]> {
    const cacheKey = `${this.cachePrefix}sitemaps:${siteUrl}`;
    const cached = await this.cacheService.get<SitemapStatusDto[]>(cacheKey);
    if (cached) return cached;

    // Simulate sitemap status
    const sitemaps: SitemapStatusDto[] = [
      {
        path: `${siteUrl}/sitemap.xml`,
        lastSubmitted: new Date().toISOString(),
        lastDownloaded: new Date().toISOString(),
        isPending: false,
        isSitemapsIndex: true,
        warnings: 0,
        errors: 0,
        urlsSubmitted: 1500,
        urlsIndexed: 1420,
      },
      {
        path: `${siteUrl}/sitemap-products.xml`,
        lastSubmitted: new Date().toISOString(),
        lastDownloaded: new Date().toISOString(),
        isPending: false,
        isSitemapsIndex: false,
        warnings: 2,
        errors: 0,
        urlsSubmitted: 1200,
        urlsIndexed: 1180,
      },
      {
        path: `${siteUrl}/sitemap-categories.xml`,
        lastSubmitted: new Date().toISOString(),
        lastDownloaded: new Date().toISOString(),
        isPending: false,
        isSitemapsIndex: false,
        warnings: 0,
        errors: 0,
        urlsSubmitted: 50,
        urlsIndexed: 50,
      },
      {
        path: `${siteUrl}/sitemap-pages.xml`,
        lastSubmitted: new Date().toISOString(),
        lastDownloaded: new Date().toISOString(),
        isPending: false,
        isSitemapsIndex: false,
        warnings: 0,
        errors: 0,
        urlsSubmitted: 20,
        urlsIndexed: 20,
      },
    ];

    await this.cacheService.set(cacheKey, sitemaps, { ttl: CacheTTL.LONG });
    return sitemaps;
  }

  /**
   * Submit sitemap
   */
  async submitSitemap(siteUrl: string, sitemapUrl: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Submitting sitemap: ${sitemapUrl} for site: ${siteUrl}`);

    // In production, make actual API call
    return {
      success: true,
      message: `Sitemap ${sitemapUrl} submitted successfully. It may take some time to be processed.`,
    };
  }

  /**
   * Get crawl errors
   */
  async getCrawlErrors(siteUrl: string): Promise<CrawlErrorDto[]> {
    const cacheKey = `${this.cachePrefix}errors:${siteUrl}`;
    const cached = await this.cacheService.get<CrawlErrorDto[]>(cacheKey);
    if (cached) return cached;

    // Generate simulated crawl errors
    const errors: CrawlErrorDto[] = [
      {
        url: `${siteUrl}/products/deleted-product-123`,
        category: '404_NOT_FOUND',
        platform: 'web',
        firstDetected: this.getDateString(-7),
        lastCrawled: this.getDateString(-1),
        responseCode: 404,
        linkedFromUrls: [`${siteUrl}/category/electronics`],
      },
      {
        url: `${siteUrl}/old-page`,
        category: '404_NOT_FOUND',
        platform: 'web',
        firstDetected: this.getDateString(-30),
        lastCrawled: this.getDateString(-2),
        responseCode: 404,
        linkedFromUrls: [],
      },
      {
        url: `${siteUrl}/products/slow-loading`,
        category: 'SERVER_ERROR',
        platform: 'web',
        firstDetected: this.getDateString(-3),
        lastCrawled: this.getDateString(0),
        responseCode: 500,
        linkedFromUrls: [`${siteUrl}/`, `${siteUrl}/category/all`],
      },
    ];

    await this.cacheService.set(cacheKey, errors, { ttl: CacheTTL.MEDIUM });
    return errors;
  }

  /**
   * Get index coverage report
   */
  async getIndexCoverageReport(siteUrl: string): Promise<IndexCoverageReportDto> {
    const cacheKey = `${this.cachePrefix}coverage:${siteUrl}`;
    const cached = await this.cacheService.get<IndexCoverageReportDto>(cacheKey);
    if (cached) return cached;

    // Get product and category counts
    const [productCount, categoryCount] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { status: 'ACTIVE' } }),
    ]);

    const totalUrls = productCount + categoryCount + 15; // +15 for static pages

    const report: IndexCoverageReportDto = {
      siteUrl,
      lastUpdated: new Date().toISOString(),
      summary: {
        valid: Math.floor(totalUrls * 0.85),
        validWithWarnings: Math.floor(totalUrls * 0.05),
        error: Math.floor(totalUrls * 0.02),
        excluded: Math.floor(totalUrls * 0.08),
      },
      validPages: {
        submittedAndIndexed: Math.floor(totalUrls * 0.80),
        indexedNotSubmitted: Math.floor(totalUrls * 0.05),
      },
      warningPages: {
        indexedThoughBlockedByRobots: 2,
        pageWithRedirect: 5,
        softNotFound: 1,
      },
      errorPages: {
        serverError: 2,
        notFound: Math.floor(totalUrls * 0.015),
        redirectError: 1,
        blockedByRobots: 0,
      },
      excludedPages: {
        blockedByRobots: 10,
        blockedByNoindex: 5,
        duplicateWithoutCanonical: 8,
        notFoundFromSitemap: 3,
        alternatePageWithCanonical: 15,
        crawledNotIndexed: Math.floor(totalUrls * 0.03),
      },
    };

    await this.cacheService.set(cacheKey, report, { ttl: CacheTTL.LONG });
    return report;
  }

  /**
   * Request URL inspection
   */
  async inspectUrl(siteUrl: string, inspectionUrl: string): Promise<{
    verdict: string;
    indexing: {
      indexingState: string;
      lastCrawlTime?: string;
      crawledAs?: string;
      robotsTxtState: string;
    };
    mobileFriendliness: {
      verdict: string;
      issues: string[];
    };
    richResults: {
      detected: boolean;
      types: string[];
      issues: string[];
    };
  }> {
    this.logger.log(`Inspecting URL: ${inspectionUrl}`);

    // Simulate URL inspection
    return {
      verdict: 'PASS',
      indexing: {
        indexingState: 'INDEXED',
        lastCrawlTime: new Date().toISOString(),
        crawledAs: 'DESKTOP',
        robotsTxtState: 'ALLOWED',
      },
      mobileFriendliness: {
        verdict: 'MOBILE_FRIENDLY',
        issues: [],
      },
      richResults: {
        detected: true,
        types: ['Product', 'BreadcrumbList'],
        issues: [],
      },
    };
  }

  /**
   * Request indexing for a URL
   */
  async requestIndexing(url: string): Promise<{
    success: boolean;
    message: string;
    requestId?: string;
  }> {
    this.logger.log(`Requesting indexing for: ${url}`);

    // Simulate indexing request (Indexing API)
    return {
      success: true,
      message: 'URL submitted for indexing. Google will crawl the page within a few hours.',
      requestId: `idx_${Date.now()}`,
    };
  }

  /**
   * Get performance by device
   */
  async getPerformanceByDevice(
    siteUrl: string,
    query: SearchConsoleQueryDto,
  ): Promise<Record<DeviceType, { clicks: number; impressions: number; ctr: number; position: number }>> {
    const cacheKey = `${this.cachePrefix}device:${siteUrl}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const result = {
      [DeviceType.DESKTOP]: {
        clicks: Math.floor(Math.random() * 5000) + 1000,
        impressions: Math.floor(Math.random() * 50000) + 10000,
        ctr: Math.random() * 8 + 2,
        position: Math.random() * 20 + 5,
      },
      [DeviceType.MOBILE]: {
        clicks: Math.floor(Math.random() * 8000) + 2000,
        impressions: Math.floor(Math.random() * 80000) + 20000,
        ctr: Math.random() * 6 + 2,
        position: Math.random() * 25 + 8,
      },
      [DeviceType.TABLET]: {
        clicks: Math.floor(Math.random() * 1000) + 200,
        impressions: Math.floor(Math.random() * 10000) + 2000,
        ctr: Math.random() * 5 + 2,
        position: Math.random() * 22 + 6,
      },
    };

    await this.cacheService.set(cacheKey, result, { ttl: CacheTTL.MEDIUM });
    return result;
  }

  /**
   * Get performance by country
   */
  async getPerformanceByCountry(
    siteUrl: string,
    query: SearchConsoleQueryDto,
  ): Promise<Array<{ country: string; clicks: number; impressions: number; ctr: number; position: number }>> {
    const cacheKey = `${this.cachePrefix}country:${siteUrl}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const countries = ['USA', 'GBR', 'CAN', 'AUS', 'DEU', 'FRA', 'IND', 'JPN', 'BRA', 'NGA'];

    const result = countries.map(country => ({
      country,
      clicks: Math.floor(Math.random() * 3000) + 100,
      impressions: Math.floor(Math.random() * 30000) + 1000,
      ctr: Math.random() * 8 + 1,
      position: Math.random() * 30 + 5,
    }));

    result.sort((a, b) => b.clicks - a.clicks);

    await this.cacheService.set(cacheKey, result, { ttl: CacheTTL.MEDIUM });
    return result;
  }

  // Helper methods

  private generateSimulatedPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    query: SearchConsoleQueryDto,
  ): SearchPerformanceDto {
    const days = this.getDaysBetween(startDate, endDate);
    const rows: Array<{
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }> = [];

    let totalClicks = 0;
    let totalImpressions = 0;
    let totalPosition = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const clicks = Math.floor(Math.random() * 500) + 100;
      const impressions = Math.floor(Math.random() * 5000) + 1000;
      const position = Math.random() * 20 + 5;

      totalClicks += clicks;
      totalImpressions += impressions;
      totalPosition += position;

      rows.push({
        date: date.toISOString().split('T')[0],
        clicks,
        impressions,
        ctr: (clicks / impressions) * 100,
        position,
      });
    }

    return {
      siteUrl,
      startDate,
      endDate,
      rows,
      totals: {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: (totalClicks / totalImpressions) * 100,
        position: totalPosition / days,
      },
    };
  }

  private generateSimulatedQueries(siteUrl: string, limit: number): SearchQueryDataDto[] {
    const baseQueries = [
      'buy products online',
      'best deals',
      'free shipping',
      'discount codes',
      'product reviews',
      'compare prices',
      'top rated',
      'new arrivals',
      'sale items',
      'trending products',
    ];

    const queries: SearchQueryDataDto[] = [];

    for (let i = 0; i < Math.min(limit, 100); i++) {
      const baseQuery = baseQueries[i % baseQueries.length];
      const modifier = i > 10 ? ` ${Math.random().toString(36).substring(7)}` : '';

      const impressions = Math.floor(Math.random() * 5000) + 100;
      const clicks = Math.floor(impressions * (Math.random() * 0.1));

      queries.push({
        query: baseQuery + modifier,
        clicks,
        impressions,
        ctr: (clicks / impressions) * 100,
        position: Math.random() * 30 + 1,
      });
    }

    queries.sort((a, b) => b.clicks - a.clicks);
    return queries;
  }

  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
}
