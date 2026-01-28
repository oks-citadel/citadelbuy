import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  CanonicalUrlDto,
  HreflangMappingDto,
  HreflangTagDto,
  IndexCoverageDto,
  IndexCoverageSummaryDto,
  IndexStatus,
  UpdateCanonicalDto,
  UpdateHreflangDto,
  ReindexRequestDto,
  ReindexResponseDto,
  TechnicalSEOSummaryDto,
  QueryTechnicalDto,
  DuplicateContentDto,
  StructuredDataValidationDto,
} from '../dto/technical.dto';
// Inline UUID v4 generator to avoid external dependency
const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

@Injectable()
export class TechnicalService {
  private readonly logger = new Logger(TechnicalService.name);
  private readonly baseUrl: string;
  private readonly cachePrefix = 'seo:technical:';

  // In-memory storage (in production, use database)
  private canonicals: Map<string, CanonicalUrlDto> = new Map();
  private hreflangMappings: Map<string, HreflangMappingDto> = new Map();
  private indexCoverage: Map<string, IndexCoverageDto> = new Map();
  private reindexQueue: Array<{ url: string; requestId: string; priority: number; requestedAt: Date }> = [];

  // Supported locales
  private readonly supportedLocales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
    this.initializeData();
  }

  /**
   * Initialize with sample data
   */
  private async initializeData() {
    // This would typically be populated from database or crawl data
  }

  /**
   * Get all canonical URL mappings
   */
  async getCanonicals(query?: QueryTechnicalDto): Promise<{
    canonicals: CanonicalUrlDto[];
    total: number;
  }> {
    // Get products and categories to generate canonical mappings
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true },
        take: query?.limit || 100,
        skip: ((query?.page || 1) - 1) * (query?.limit || 100),
      }),
      this.prisma.category.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { slug: true },
        take: 50,
      }),
    ]);

    const canonicals: CanonicalUrlDto[] = [];

    // Generate canonical URLs for products
    for (const product of products) {
      const sourceUrl = `${this.baseUrl}/products/${product.slug}`;
      canonicals.push({
        sourceUrl,
        canonicalUrl: sourceUrl,
        isSelfReferencing: true,
      });

      // Add URL variations that should point to canonical
      canonicals.push({
        sourceUrl: `${this.baseUrl}/products/${product.slug}?ref=homepage`,
        canonicalUrl: sourceUrl,
        isSelfReferencing: false,
      });
    }

    // Generate canonical URLs for categories
    for (const category of categories) {
      const sourceUrl = `${this.baseUrl}/categories/${category.slug}`;
      canonicals.push({
        sourceUrl,
        canonicalUrl: sourceUrl,
        isSelfReferencing: true,
      });
    }

    // Check for issues
    for (const canonical of canonicals) {
      if (!canonical.isSelfReferencing && canonical.canonicalUrl === canonical.sourceUrl) {
        canonical.hasIssues = true;
        canonical.issueDescription = 'Canonical URL is the same as source but not self-referencing';
      }
    }

    // Apply URL pattern filter
    let filteredCanonicals = canonicals;
    if (query?.urlPattern) {
      const pattern = new RegExp(query.urlPattern, 'i');
      filteredCanonicals = canonicals.filter((c) => pattern.test(c.sourceUrl));
    }

    if (query?.hasIssuesOnly) {
      filteredCanonicals = filteredCanonicals.filter((c) => c.hasIssues);
    }

    return {
      canonicals: filteredCanonicals,
      total: filteredCanonicals.length,
    };
  }

  /**
   * Update canonical URL mapping
   */
  async updateCanonical(dto: UpdateCanonicalDto): Promise<CanonicalUrlDto> {
    const canonical: CanonicalUrlDto = {
      sourceUrl: dto.sourceUrl,
      canonicalUrl: dto.canonicalUrl,
      isSelfReferencing: dto.sourceUrl === dto.canonicalUrl,
    };

    this.canonicals.set(dto.sourceUrl, canonical);

    // Invalidate cache
    await this.cacheService.deletePattern(`${this.cachePrefix}canonicals:*`);

    return canonical;
  }

  /**
   * Get hreflang mappings
   */
  async getHreflangMappings(query?: QueryTechnicalDto): Promise<{
    mappings: HreflangMappingDto[];
    total: number;
  }> {
    // Get products with translations
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        translations: {
          select: { languageCode: true },
        },
      },
      take: query?.limit || 100,
      skip: ((query?.page || 1) - 1) * (query?.limit || 100),
    });

    const mappings: HreflangMappingDto[] = [];

    for (const product of products) {
      const baseUrl = `${this.baseUrl}/products/${product.slug}`;
      const hreflangTags: HreflangTagDto[] = [];

      // Default language
      hreflangTags.push({
        hreflang: 'en',
        href: baseUrl,
        rel: 'alternate' as any,
      });

      // Translated versions
      for (const translation of product.translations) {
        hreflangTags.push({
          hreflang: translation.languageCode,
          href: `${this.baseUrl}/${translation.languageCode}/products/${product.slug}`,
          rel: 'alternate' as any,
        });
      }

      // x-default
      hreflangTags.push({
        hreflang: 'x-default',
        href: baseUrl,
        rel: 'alternate' as any,
      });

      mappings.push({
        baseUrl,
        hreflangTags,
        hasXDefault: true,
        issues: this.validateHreflang(hreflangTags),
      });
    }

    // Apply filters
    let filteredMappings = mappings;
    if (query?.urlPattern) {
      const pattern = new RegExp(query.urlPattern, 'i');
      filteredMappings = mappings.filter((m) => pattern.test(m.baseUrl));
    }

    if (query?.hasIssuesOnly) {
      filteredMappings = filteredMappings.filter((m) => m.issues && m.issues.length > 0);
    }

    return {
      mappings: filteredMappings,
      total: filteredMappings.length,
    };
  }

  /**
   * Update hreflang mapping
   */
  async updateHreflang(dto: UpdateHreflangDto): Promise<HreflangMappingDto> {
    const hreflangTags = dto.hreflangTags;

    // Add x-default if requested
    if (dto.includeXDefault && !hreflangTags.find((t) => t.hreflang === 'x-default')) {
      hreflangTags.push({
        hreflang: 'x-default',
        href: dto.xDefaultUrl || dto.baseUrl,
        rel: 'alternate' as any,
      });
    }

    const mapping: HreflangMappingDto = {
      baseUrl: dto.baseUrl,
      hreflangTags,
      hasXDefault: hreflangTags.some((t) => t.hreflang === 'x-default'),
      issues: this.validateHreflang(hreflangTags),
    };

    this.hreflangMappings.set(dto.baseUrl, mapping);

    return mapping;
  }

  /**
   * Get index coverage analysis
   */
  async getIndexCoverage(query?: QueryTechnicalDto): Promise<IndexCoverageSummaryDto> {
    // Simulate index coverage data
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 500,
    });

    const coverage: IndexCoverageDto[] = [];

    for (const product of products) {
      const url = `${this.baseUrl}/products/${product.slug}`;

      // Simulate various index statuses
      const random = Math.random();
      let status: IndexStatus;
      let issue: string | undefined;

      if (random < 0.85) {
        status = IndexStatus.INDEXED;
      } else if (random < 0.90) {
        status = IndexStatus.NOT_INDEXED;
        issue = 'Crawled - currently not indexed';
      } else if (random < 0.95) {
        status = IndexStatus.BLOCKED;
        issue = 'Blocked by robots.txt';
      } else {
        status = IndexStatus.ERROR;
        issue = 'Server error (5xx)';
      }

      coverage.push({
        url,
        status,
        lastCrawled: product.updatedAt.toISOString(),
        issue,
        hasNoindex: status === IndexStatus.BLOCKED,
      });
    }

    // Apply filters
    let filteredCoverage = coverage;
    if (query?.indexStatus) {
      filteredCoverage = coverage.filter((c) => c.status === query.indexStatus);
    }
    if (query?.urlPattern) {
      const pattern = new RegExp(query.urlPattern, 'i');
      filteredCoverage = filteredCoverage.filter((c) => pattern.test(c.url));
    }

    // Calculate summary
    const indexed = coverage.filter((c) => c.status === IndexStatus.INDEXED).length;
    const notIndexed = coverage.filter((c) => c.status === IndexStatus.NOT_INDEXED).length;
    const blocked = coverage.filter((c) => c.status === IndexStatus.BLOCKED).length;
    const error = coverage.filter((c) => c.status === IndexStatus.ERROR).length;

    // Aggregate issues
    const issueMap = new Map<string, string[]>();
    for (const c of coverage) {
      if (c.issue) {
        if (!issueMap.has(c.issue)) {
          issueMap.set(c.issue, []);
        }
        issueMap.get(c.issue)!.push(c.url);
      }
    }

    const topIssues = Array.from(issueMap.entries())
      .map(([issue, urls]) => ({
        issue,
        count: urls.length,
        urls: urls.slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalUrls: coverage.length,
      indexedUrls: indexed,
      notIndexedUrls: notIndexed,
      blockedUrls: blocked,
      errorUrls: error,
      indexRate: (indexed / coverage.length) * 100,
      byStatus: {
        [IndexStatus.INDEXED]: indexed,
        [IndexStatus.NOT_INDEXED]: notIndexed,
        [IndexStatus.BLOCKED]: blocked,
        [IndexStatus.ERROR]: error,
        [IndexStatus.PENDING]: 0,
      },
      topIssues,
    };
  }

  /**
   * Request reindexing of URLs
   */
  async requestReindex(dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    const requestId = uuidv4();
    const now = new Date();

    for (const url of dto.urls) {
      this.reindexQueue.push({
        url,
        requestId,
        priority: dto.priority || 1,
        requestedAt: now,
      });
    }

    // Sort queue by priority
    this.reindexQueue.sort((a, b) => b.priority - a.priority);

    // Estimate processing time based on queue size
    const estimatedMinutes = Math.ceil(this.reindexQueue.length / 10);

    this.logger.log(`Reindex request ${requestId}: ${dto.urls.length} URLs queued`);

    return {
      requestId,
      urlsQueued: dto.urls.length,
      estimatedProcessingTime: `${estimatedMinutes} minutes`,
      requestedAt: now.toISOString(),
    };
  }

  /**
   * Get technical SEO summary
   */
  async getTechnicalSummary(): Promise<TechnicalSEOSummaryDto> {
    const cacheKey = `${this.cachePrefix}summary`;

    const cached = await this.cacheService.get<TechnicalSEOSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get data for summary
    const [products, categories] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    const totalPages = products + categories + 10; // +10 for static pages

    // Simulate issue counts
    const canonicalIssues = Math.floor(totalPages * 0.02);
    const hreflangIssues = Math.floor(totalPages * 0.05);
    const indexingIssues = Math.floor(totalPages * 0.08);
    const redirectIssues = Math.floor(totalPages * 0.03);

    // Calculate technical score
    const issueRate = (canonicalIssues + hreflangIssues + indexingIssues + redirectIssues) / (totalPages * 4);
    const technicalScore = Math.round((1 - issueRate) * 100);

    const summary: TechnicalSEOSummaryDto = {
      totalPages,
      canonicalIssues,
      hreflangIssues,
      indexingIssues,
      redirectIssues,
      httpsAdoptionRate: 100, // Assume full HTTPS
      mobileFriendlyRate: 95, // Simulated
      avgPageLoadTime: 2.3, // Simulated seconds
      technicalScore,
      lastAnalyzedAt: new Date().toISOString(),
    };

    await this.cacheService.set(cacheKey, summary, { ttl: CacheTTL.LONG });

    return summary;
  }

  /**
   * Detect duplicate content
   */
  async detectDuplicateContent(): Promise<DuplicateContentDto[]> {
    // Get products grouped by name
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        description: true,
      },
    });

    const duplicates: DuplicateContentDto[] = [];
    const nameGroups = new Map<string, typeof products>();

    // Group by similar names
    for (const product of products) {
      const normalizedName = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(product);
    }

    // Find duplicates
    for (const [, group] of nameGroups) {
      if (group.length > 1) {
        const primaryUrl = `${this.baseUrl}/products/${group[0].slug}`;
        const duplicateUrls = group.slice(1).map((p) => `${this.baseUrl}/products/${p.slug}`);

        duplicates.push({
          primaryUrl,
          duplicateUrls,
          similarityPercentage: 85 + Math.random() * 15, // 85-100%
          contentHash: this.simpleHash(group[0].description || ''),
          recommendedCanonical: primaryUrl,
        });
      }
    }

    return duplicates;
  }

  /**
   * Validate structured data on a URL
   */
  async validateStructuredData(url: string): Promise<StructuredDataValidationDto> {
    // In a real implementation, this would fetch the URL and parse JSON-LD
    // For now, simulate validation results

    const errors: StructuredDataValidationDto['errors'] = [];
    const warnings: StructuredDataValidationDto['warnings'] = [];
    const detectedTypes: string[] = [];

    // Simulate finding Product schema
    if (url.includes('/products/')) {
      detectedTypes.push('Product');

      // Random validation issues
      if (Math.random() < 0.1) {
        errors.push({
          type: 'missing_field',
          message: 'Missing required field "offers"',
          path: 'Product',
        });
      }

      if (Math.random() < 0.2) {
        warnings.push({
          type: 'recommended_field',
          message: 'Consider adding "aggregateRating" for better visibility',
          path: 'Product',
        });
      }
    }

    // Simulate finding BreadcrumbList
    if (url !== this.baseUrl) {
      detectedTypes.push('BreadcrumbList');
    }

    return {
      url,
      isValid: errors.length === 0,
      detectedTypes,
      errors,
      warnings,
    };
  }

  // Helper methods

  private validateHreflang(tags: HreflangTagDto[]): string[] {
    const issues: string[] = [];

    // Check for x-default
    if (!tags.find((t) => t.hreflang === 'x-default')) {
      issues.push('Missing x-default tag');
    }

    // Check for self-referencing
    const languages = tags.filter((t) => t.hreflang !== 'x-default');
    for (const tag of languages) {
      // Check if language code is valid
      if (!this.isValidLanguageCode(tag.hreflang)) {
        issues.push(`Invalid language code: ${tag.hreflang}`);
      }
    }

    // Check for duplicate languages
    const seenLanguages = new Set<string>();
    for (const tag of languages) {
      if (seenLanguages.has(tag.hreflang)) {
        issues.push(`Duplicate language code: ${tag.hreflang}`);
      }
      seenLanguages.add(tag.hreflang);
    }

    return issues;
  }

  private isValidLanguageCode(code: string): boolean {
    // Simple validation for language codes
    const pattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    return pattern.test(code) || code === 'x-default';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
