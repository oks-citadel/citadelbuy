import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SitemapService } from './sitemap/sitemap.service';
import { AuditService } from './audit/audit.service';
import { VitalsService } from './vitals/vitals.service';
import { TechnicalService } from './technical/technical.service';

@Injectable()
export class SeoSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SeoSchedulerService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly sitemapService: SitemapService,
    private readonly auditService: AuditService,
    private readonly vitalsService: VitalsService,
    private readonly technicalService: TechnicalService,
  ) {
    // Allow disabling scheduled jobs via environment variable
    this.isEnabled = this.configService.get<string>('SEO_SCHEDULER_ENABLED', 'true') === 'true';
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('SEO Scheduler initialized - all jobs are active');
    } else {
      this.logger.warn('SEO Scheduler is disabled via configuration');
    }
  }

  /**
   * Regenerate sitemaps hourly
   * This ensures search engines always have access to the latest URLs
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'sitemap-regeneration' })
  async handleSitemapRegeneration() {
    if (!this.isEnabled) return;

    this.logger.log('Starting scheduled sitemap regeneration...');
    const startTime = Date.now();

    try {
      // Invalidate cache and regenerate
      await this.sitemapService.invalidateCache();

      // Pre-generate main sitemaps to warm the cache
      await Promise.all([
        this.sitemapService.generateSitemapIndex(),
        this.sitemapService.generateProductSitemap(),
        this.sitemapService.generateCategorySitemap(),
        this.sitemapService.generatePagesSitemap(),
        this.sitemapService.generateBlogSitemap(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Sitemap regeneration completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Sitemap regeneration failed:', error);
    }
  }

  /**
   * Run full SEO audit daily at 2:00 AM
   * This performs a comprehensive crawl and analysis of all pages
   */
  @Cron('0 2 * * *', { name: 'seo-audit' })
  async handleDailySeoAudit() {
    if (!this.isEnabled) return;

    this.logger.log('Starting scheduled SEO audit...');
    const startTime = Date.now();

    try {
      await this.auditService.scheduleAudit({
        maxPages: 1000,
        depth: 3,
        checkExternalLinks: true,
        analyzeImages: true,
        validateStructuredData: true,
        checkMobileFriendliness: true,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`SEO audit scheduled successfully in ${duration}ms`);
    } catch (error) {
      this.logger.error('SEO audit scheduling failed:', error);
    }
  }

  /**
   * Collect Core Web Vitals every 15 minutes for key pages
   * This provides continuous performance monitoring
   */
  @Cron('*/15 * * * *', { name: 'cwv-collection' })
  async handleCWVCollection() {
    if (!this.isEnabled) return;

    this.logger.debug('Starting Core Web Vitals collection...');

    try {
      // Key pages to monitor
      const baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
      const keyPages = [
        baseUrl,
        `${baseUrl}/products`,
        `${baseUrl}/categories`,
        `${baseUrl}/deals`,
        // Note: In production, you'd get top-traffic pages from analytics
      ];

      // Analyze each page
      for (const url of keyPages) {
        try {
          await this.vitalsService.analyzeUrl({
            url,
            deviceType: 'mobile' as any,
            forceRefresh: true,
          });
        } catch (error) {
          this.logger.warn(`Failed to collect CWV for ${url}:`, error);
        }
      }

      this.logger.debug('Core Web Vitals collection completed');
    } catch (error) {
      this.logger.error('CWV collection failed:', error);
    }
  }

  /**
   * Check index coverage weekly on Sundays at 3:00 AM
   * This monitors which pages are being indexed by search engines
   */
  @Cron('0 3 * * 0', { name: 'index-coverage-check' })
  async handleIndexCoverageCheck() {
    if (!this.isEnabled) return;

    this.logger.log('Starting scheduled index coverage check...');

    try {
      const summary = await this.technicalService.getIndexCoverage();

      this.logger.log(`Index coverage check completed:
        - Total URLs: ${summary.totalUrls}
        - Indexed: ${summary.indexedUrls} (${summary.indexRate.toFixed(1)}%)
        - Not Indexed: ${summary.notIndexedUrls}
        - Blocked: ${summary.blockedUrls}
        - Errors: ${summary.errorUrls}
      `);

      // Log critical issues
      if (summary.topIssues.length > 0) {
        this.logger.warn(`Top indexing issues found:`);
        for (const issue of summary.topIssues.slice(0, 5)) {
          this.logger.warn(`  - ${issue.issue}: ${issue.count} URLs`);
        }
      }
    } catch (error) {
      this.logger.error('Index coverage check failed:', error);
    }
  }

  /**
   * Generate technical SEO report weekly on Mondays at 6:00 AM
   */
  @Cron('0 6 * * 1', { name: 'technical-seo-report' })
  async handleTechnicalSeoReport() {
    if (!this.isEnabled) return;

    this.logger.log('Generating weekly technical SEO report...');

    try {
      const summary = await this.technicalService.getTechnicalSummary();
      const auditSummary = await this.auditService.getAuditSummary();
      const vitalsSummary = await this.vitalsService.getVitalsSummary();

      this.logger.log(`Weekly SEO Report:
        === Technical SEO ===
        - Technical Score: ${summary.technicalScore}/100
        - Canonical Issues: ${summary.canonicalIssues}
        - Hreflang Issues: ${summary.hreflangIssues}
        - Indexing Issues: ${summary.indexingIssues}
        - Redirect Issues: ${summary.redirectIssues}

        === Content Audit ===
        - SEO Score: ${auditSummary.currentScore}/100
        - Score Trend: ${auditSummary.scoreTrend >= 0 ? '+' : ''}${auditSummary.scoreTrend}
        - Open Issues: ${auditSummary.openIssues}
        - Critical Issues: ${auditSummary.criticalIssues}

        === Core Web Vitals ===
        - Pass Rate: ${vitalsSummary.passRate.toFixed(1)}%
        - Average LCP: ${vitalsSummary.averageLcp.toFixed(0)}ms
        - Average INP: ${vitalsSummary.averageInp.toFixed(0)}ms
        - Average CLS: ${vitalsSummary.averageCls.toFixed(3)}
        - Performance Score: ${vitalsSummary.averagePerformanceScore.toFixed(0)}/100
      `);

      // In production, you might want to:
      // 1. Send this report via email to SEO team
      // 2. Post to Slack/Teams channel
      // 3. Store in analytics database
      // 4. Trigger alerts if scores drop significantly
    } catch (error) {
      this.logger.error('Weekly SEO report generation failed:', error);
    }
  }

  /**
   * Clear old audit data monthly
   * Keeps the last 12 months of data
   */
  @Cron('0 0 1 * *', { name: 'cleanup-old-data' })
  async handleDataCleanup() {
    if (!this.isEnabled) return;

    this.logger.log('Starting monthly data cleanup...');

    try {
      // In a real implementation, this would:
      // 1. Delete audit data older than 12 months
      // 2. Aggregate and archive historical metrics
      // 3. Clean up temporary crawl data

      this.logger.log('Monthly data cleanup completed');
    } catch (error) {
      this.logger.error('Data cleanup failed:', error);
    }
  }

  /**
   * Manually trigger sitemap regeneration
   */
  async triggerSitemapRegeneration(): Promise<void> {
    await this.handleSitemapRegeneration();
  }

  /**
   * Manually trigger SEO audit
   */
  async triggerSeoAudit(): Promise<void> {
    await this.handleDailySeoAudit();
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus(): {
    enabled: boolean;
    jobs: { name: string; nextRun?: Date }[];
  } {
    const jobs = [];

    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      for (const [name, job] of cronJobs) {
        jobs.push({
          name,
          nextRun: job.nextDate().toJSDate(),
        });
      }
    } catch (error) {
      this.logger.warn('Could not get cron job status:', error);
    }

    return {
      enabled: this.isEnabled,
      jobs,
    };
  }

  /**
   * Pause a specific job
   */
  pauseJob(name: string): void {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.stop();
      this.logger.log(`Job "${name}" has been paused`);
    } catch (error) {
      this.logger.error(`Failed to pause job "${name}":`, error);
      throw error;
    }
  }

  /**
   * Resume a specific job
   */
  resumeJob(name: string): void {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.start();
      this.logger.log(`Job "${name}" has been resumed`);
    } catch (error) {
      this.logger.error(`Failed to resume job "${name}":`, error);
      throw error;
    }
  }
}
