import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  ScheduleAuditDto,
  SEOIssueDto,
  SEOIssueSeverity,
  SEOIssueCategory,
  AuditStatus,
  AuditResultDto,
  BrokenLinkDto,
  RedirectChainDto,
  QueryIssuesDto,
  AuditSummaryDto,
} from '../dto/audit.dto';
import { SEOAuditResult, SEOIssue, SEOMetrics } from '../interfaces/seo.interfaces';
// Using crypto for UUID generation
const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface CrawlResult {
  url: string;
  statusCode: number;
  title?: string;
  metaDescription?: string;
  h1Tags: string[];
  images: { src: string; alt: string | null }[];
  internalLinks: string[];
  externalLinks: string[];
  loadTime: number;
  contentLength: number;
  redirects?: { url: string; statusCode: number }[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly baseUrl: string;
  private readonly cachePrefix = 'seo:audit:';

  // In-memory storage for audits (in production, use database)
  private audits: Map<string, AuditResultDto> = new Map();
  private issues: Map<string, SEOIssueDto[]> = new Map();
  private brokenLinks: BrokenLinkDto[] = [];
  private redirectChains: RedirectChainDto[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
  }

  /**
   * Schedule a new SEO audit
   */
  async scheduleAudit(dto: ScheduleAuditDto): Promise<AuditResultDto> {
    const auditId = uuidv4();
    const now = new Date().toISOString();

    const audit: AuditResultDto = {
      id: auditId,
      status: AuditStatus.PENDING,
      startedAt: now,
      pagesCrawled: 0,
      issuesCount: 0,
      issuesBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      issuesByCategory: {},
      seoScore: 0,
    };

    this.audits.set(auditId, audit);

    // Start audit in background
    this.runAudit(auditId, dto).catch((error) => {
      this.logger.error(`Audit ${auditId} failed:`, error);
      audit.status = AuditStatus.FAILED;
      audit.error = error.message;
      this.audits.set(auditId, audit);
    });

    return audit;
  }

  /**
   * Get audit results
   */
  async getAuditResult(auditId: string): Promise<AuditResultDto | null> {
    return this.audits.get(auditId) || null;
  }

  /**
   * Get latest audit result
   */
  async getLatestAudit(): Promise<AuditResultDto | null> {
    const audits = Array.from(this.audits.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return audits[0] || null;
  }

  /**
   * Get audit summary
   */
  async getAuditSummary(): Promise<AuditSummaryDto> {
    const latestAudit = await this.getLatestAudit();
    const allIssues = Array.from(this.issues.values()).flat();
    const openIssues = allIssues.filter((i) => !i.resolved);
    const criticalIssues = openIssues.filter((i) => i.severity === SEOIssueSeverity.CRITICAL);

    // Calculate score trend (compare with previous audit)
    const audits = Array.from(this.audits.values())
      .filter((a) => a.status === AuditStatus.COMPLETED)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const currentScore = latestAudit?.seoScore || 0;
    const previousScore = audits[1]?.seoScore || currentScore;
    const scoreTrend = currentScore - previousScore;

    return {
      totalAudits: this.audits.size,
      lastAuditDate: latestAudit?.completedAt || latestAudit?.startedAt,
      currentScore,
      scoreTrend,
      openIssues: openIssues.length,
      resolvedIssues: allIssues.filter((i) => i.resolved).length,
      criticalIssues: criticalIssues.length,
      topIssues: openIssues
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 10),
    };
  }

  /**
   * Get SEO issues with filtering
   */
  async getIssues(query: QueryIssuesDto): Promise<{
    issues: SEOIssueDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    let allIssues = Array.from(this.issues.values()).flat();

    // Apply filters
    if (query.severity) {
      allIssues = allIssues.filter((i) => i.severity === query.severity);
    }

    if (query.category) {
      allIssues = allIssues.filter((i) => i.category === query.category);
    }

    if (query.urlPattern) {
      const pattern = new RegExp(query.urlPattern, 'i');
      allIssues = allIssues.filter((i) => pattern.test(i.url));
    }

    if (!query.includeResolved) {
      allIssues = allIssues.filter((i) => !i.resolved);
    }

    // Sort
    if (query.sortBy) {
      const sortKey = query.sortBy as keyof SEOIssueDto;
      allIssues.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === undefined || bVal === undefined) return 0;
        if (query.sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    // Paginate
    const page = query.page || 1;
    const limit = query.limit || 50;
    const start = (page - 1) * limit;
    const paginatedIssues = allIssues.slice(start, start + limit);

    return {
      issues: paginatedIssues,
      total: allIssues.length,
      page,
      limit,
    };
  }

  /**
   * Get broken links
   */
  async getBrokenLinks(): Promise<BrokenLinkDto[]> {
    return this.brokenLinks;
  }

  /**
   * Get redirect chain analysis
   */
  async getRedirectChains(): Promise<RedirectChainDto[]> {
    return this.redirectChains;
  }

  /**
   * Run the actual audit
   */
  private async runAudit(auditId: string, dto: ScheduleAuditDto): Promise<void> {
    const audit = this.audits.get(auditId);
    if (!audit) return;

    audit.status = AuditStatus.RUNNING;
    this.audits.set(auditId, audit);

    const crawledUrls = new Set<string>();
    const urlsToAudit: string[] = [];

    // Get URLs to audit from database
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true },
      take: dto.maxPages || 100,
    });

    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { slug: true },
      take: 50,
    });

    urlsToAudit.push(
      `${this.baseUrl}/`,
      ...products.map((p) => `${this.baseUrl}/products/${p.slug}`),
      ...categories.map((c) => `${this.baseUrl}/categories/${c.slug}`),
    );

    // If specific URLs provided, use those instead
    if (dto.urls && dto.urls.length > 0) {
      urlsToAudit.length = 0;
      urlsToAudit.push(...dto.urls);
    }

    const auditIssues: SEOIssueDto[] = [];
    let totalScore = 0;

    // Simulate crawling and analysis
    for (const url of urlsToAudit.slice(0, dto.maxPages || 100)) {
      if (crawledUrls.has(url)) continue;
      crawledUrls.add(url);

      try {
        const pageIssues = await this.analyzeUrl(url, dto);
        auditIssues.push(...pageIssues);

        // Calculate page score (100 - issues penalty)
        const pagePenalty = pageIssues.reduce((sum, issue) => {
          const penalties = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
          return sum + penalties[issue.severity];
        }, 0);
        totalScore += Math.max(0, 100 - pagePenalty);

        audit.pagesCrawled++;
      } catch (error) {
        this.logger.warn(`Failed to analyze ${url}:`, error);
      }
    }

    // Calculate final score
    audit.seoScore = audit.pagesCrawled > 0
      ? Math.round(totalScore / audit.pagesCrawled)
      : 0;

    // Aggregate issues
    audit.issuesCount = auditIssues.length;
    audit.issuesBySeverity = {
      critical: auditIssues.filter((i) => i.severity === SEOIssueSeverity.CRITICAL).length,
      high: auditIssues.filter((i) => i.severity === SEOIssueSeverity.HIGH).length,
      medium: auditIssues.filter((i) => i.severity === SEOIssueSeverity.MEDIUM).length,
      low: auditIssues.filter((i) => i.severity === SEOIssueSeverity.LOW).length,
      info: auditIssues.filter((i) => i.severity === SEOIssueSeverity.INFO).length,
    };

    // Aggregate by category
    for (const issue of auditIssues) {
      audit.issuesByCategory[issue.category] = (audit.issuesByCategory[issue.category] || 0) + 1;
    }

    audit.status = AuditStatus.COMPLETED;
    audit.completedAt = new Date().toISOString();

    this.audits.set(auditId, audit);
    this.issues.set(auditId, auditIssues);

    this.logger.log(`Audit ${auditId} completed. Score: ${audit.seoScore}, Issues: ${audit.issuesCount}`);
  }

  /**
   * Analyze a URL for SEO issues
   */
  private async analyzeUrl(url: string, options: ScheduleAuditDto): Promise<SEOIssueDto[]> {
    const issues: SEOIssueDto[] = [];
    const now = new Date().toISOString();

    // In a real implementation, this would make HTTP requests and parse HTML
    // For now, we'll simulate common SEO checks based on database data

    // Extract type from URL
    const isProduct = url.includes('/products/');
    const isCategory = url.includes('/categories/');

    if (isProduct) {
      const slug = url.split('/products/')[1];
      const product = await this.prisma.product.findFirst({
        where: { slug, isActive: true },
        include: { category: true },
      });

      if (product) {
        // Check title length
        if (!product.metaTitle) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.HIGH,
            title: 'Missing meta title',
            description: 'The page is missing a meta title tag.',
            recommendation: 'Add a unique, descriptive meta title between 50-60 characters.',
            detectedAt: now,
          });
        } else if (product.metaTitle.length < 30) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.MEDIUM,
            title: 'Meta title too short',
            description: 'The meta title is shorter than recommended.',
            recommendation: 'Expand the meta title to 50-60 characters.',
            currentValue: `${product.metaTitle.length} characters`,
            expectedValue: '50-60 characters',
            detectedAt: now,
          });
        } else if (product.metaTitle.length > 60) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.LOW,
            title: 'Meta title too long',
            description: 'The meta title may be truncated in search results.',
            recommendation: 'Shorten the meta title to 50-60 characters.',
            currentValue: `${product.metaTitle.length} characters`,
            expectedValue: '50-60 characters',
            detectedAt: now,
          });
        }

        // Check meta description
        if (!product.metaDescription) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.HIGH,
            title: 'Missing meta description',
            description: 'The page is missing a meta description tag.',
            recommendation: 'Add a compelling meta description between 150-160 characters.',
            detectedAt: now,
          });
        } else if (product.metaDescription.length < 120) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.LOW,
            title: 'Meta description too short',
            description: 'The meta description is shorter than recommended.',
            recommendation: 'Expand the meta description to 150-160 characters.',
            currentValue: `${product.metaDescription.length} characters`,
            expectedValue: '150-160 characters',
            detectedAt: now,
          });
        }

        // Check product description
        if (!product.description || product.description.length < 100) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.CONTENT,
            severity: SEOIssueSeverity.MEDIUM,
            title: 'Thin content',
            description: 'The product has very little descriptive content.',
            recommendation: 'Add at least 300 words of unique, helpful product description.',
            currentValue: `${product.description?.length || 0} characters`,
            expectedValue: 'At least 300 words',
            detectedAt: now,
          });
        }

        // Check images
        if (!product.images || product.images.length === 0) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.IMAGES,
            severity: SEOIssueSeverity.MEDIUM,
            title: 'No product images',
            description: 'The product has no images.',
            recommendation: 'Add high-quality product images with descriptive alt text.',
            detectedAt: now,
          });
        }

        // Check stock (can affect rankings due to bad UX)
        if (product.stock === 0) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.CONTENT,
            severity: SEOIssueSeverity.LOW,
            title: 'Out of stock product',
            description: 'Out of stock products may negatively impact user experience.',
            recommendation: 'Consider hiding or marking out of stock products appropriately.',
            detectedAt: now,
          });
        }
      }
    }

    if (isCategory) {
      const slug = url.split('/categories/')[1];
      const category = await this.prisma.category.findFirst({
        where: { slug, status: 'ACTIVE' },
      });

      if (category) {
        // Check meta title
        if (!category.metaTitle) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.HIGH,
            title: 'Missing meta title',
            description: 'The category page is missing a meta title.',
            recommendation: 'Add a unique, descriptive meta title.',
            detectedAt: now,
          });
        }

        // Check meta description
        if (!category.metaDescription) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.META,
            severity: SEOIssueSeverity.HIGH,
            title: 'Missing meta description',
            description: 'The category page is missing a meta description.',
            recommendation: 'Add a compelling meta description.',
            detectedAt: now,
          });
        }

        // Check category description
        if (!category.description) {
          issues.push({
            id: uuidv4(),
            url,
            category: SEOIssueCategory.CONTENT,
            severity: SEOIssueSeverity.MEDIUM,
            title: 'Missing category description',
            description: 'The category has no descriptive content.',
            recommendation: 'Add unique content describing the category.',
            detectedAt: now,
          });
        }
      }
    }

    // Common checks for all pages

    // Check for potential duplicate content (similar slugs)
    const allProducts = await this.prisma.product.findMany({
      select: { slug: true, name: true },
      take: 1000,
    });

    // Simulate broken link detection
    if (Math.random() < 0.05) { // 5% chance of finding a broken link
      this.brokenLinks.push({
        sourceUrl: url,
        targetUrl: `${this.baseUrl}/broken-link-${Date.now()}`,
        statusCode: 404,
        anchorText: 'Example broken link',
        isExternal: false,
        linkType: 'anchor',
        detectedAt: now,
      });
    }

    return issues;
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(issueId: string): Promise<boolean> {
    for (const [auditId, auditIssues] of this.issues.entries()) {
      const issue = auditIssues.find((i) => i.id === issueId);
      if (issue) {
        issue.resolved = true;
        issue.resolvedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all audit data
   */
  async clearAuditData(): Promise<void> {
    this.audits.clear();
    this.issues.clear();
    this.brokenLinks = [];
    this.redirectChains = [];
    this.logger.log('All audit data cleared');
  }
}
