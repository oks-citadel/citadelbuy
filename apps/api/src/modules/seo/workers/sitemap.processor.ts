import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DistributedLockService } from '@/common/redis/lock.service';
import { REDIS_KEYS, CACHE_TTL } from '@/common/redis/keys';
import { QUEUES, CRON_SCHEDULES } from '@/common/queue/queue.constants';
import {
  SitemapJobData,
  SitemapJobResult,
  GeneratedSitemap,
  SitemapUrl,
  SitemapType,
  SearchEnginePingResult,
  SITEMAP_JOB_NAMES,
  SITEMAP_CONFIG,
  SITEMAP_TEMPLATES,
} from './sitemap.job';

/**
 * Sitemap Generator Processor
 *
 * Background worker that generates sitemaps for SEO.
 *
 * Features:
 * - Generate per-locale sitemaps
 * - Tenant-aware (each tenant gets own sitemap)
 * - Include products, categories, pages
 * - Upload to S3/storage
 * - Ping search engines on update
 */
@Injectable()
@Processor(QUEUES.SITEMAP)
export class SitemapProcessor {
  private readonly logger = new Logger(SitemapProcessor.name);

  constructor(
    @InjectQueue(QUEUES.SITEMAP)
    private readonly sitemapQueue: Queue<SitemapJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lockService: DistributedLockService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule sitemap generation daily at 3 AM UTC
   */
  @Cron('0 3 * * *')
  async scheduleSitemapGeneration() {
    this.logger.log('Scheduling sitemap generation for all tenants');

    // Get all active tenants
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        locales: true,
      },
    });

    for (const tenant of tenants) {
      await this.sitemapQueue.add(
        SITEMAP_JOB_NAMES.GENERATE_ALL,
        {
          jobId: `sitemap:${tenant.id}:${Date.now()}`,
          tenantId: tenant.id,
          types: [
            SitemapType.INDEX,
            SitemapType.PRODUCTS,
            SitemapType.CATEGORIES,
            SitemapType.PAGES,
          ],
          locales: tenant.locales || ['en'],
          uploadToStorage: true,
          pingSearchEngines: true,
          triggeredBy: 'scheduler',
        },
        {
          priority: 10, // Low priority (background)
          delay: Math.random() * 300000, // Random delay up to 5 minutes
        },
      );
    }
  }

  /**
   * Process generate all sitemaps job
   */
  @Process(SITEMAP_JOB_NAMES.GENERATE_ALL)
  async handleGenerateAll(job: Job<SitemapJobData>): Promise<SitemapJobResult> {
    const { jobId, tenantId, types, locales, forceRegenerate } = job.data;
    const startTime = Date.now();

    this.logger.log(`Generating sitemaps for tenant ${tenantId}`);

    // Acquire lock to prevent concurrent generation
    const lockKey = `sitemap:${tenantId}`;
    const lockResult = await this.lockService.acquireLock(lockKey, {
      ttlSeconds: 600, // 10 minute lock
      waitTimeMs: 0,
    });

    if (!lockResult.acquired) {
      this.logger.debug(`Skipping sitemap generation for ${tenantId} - already in progress`);
      return {
        success: true,
        jobId,
        tenantId,
        sitemaps: [],
        totalUrls: 0,
        durationMs: Date.now() - startTime,
        errors: ['Generation already in progress'],
      };
    }

    try {
      // Check if recent generation exists (unless force regenerate)
      if (!forceRegenerate) {
        const lastGenerated = await this.redis.get<string>(
          REDIS_KEYS.SITEMAP_LAST_GENERATED(tenantId),
        );
        if (lastGenerated) {
          const lastGenTime = new Date(lastGenerated).getTime();
          if (Date.now() - lastGenTime < SITEMAP_CONFIG.REGEN_THRESHOLD_MS) {
            this.logger.debug(`Skipping sitemap generation for ${tenantId} - recently generated`);
            return {
              success: true,
              jobId,
              tenantId,
              sitemaps: [],
              totalUrls: 0,
              durationMs: Date.now() - startTime,
              errors: ['Recently generated, skipping'],
            };
          }
        }
      }

      // Get tenant configuration
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          domain: true,
          locales: true,
        },
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const baseUrl = `https://${tenant.domain}`;
      const sitemapLocales = locales || tenant.locales || ['en'];
      const sitemapTypes = types || [SitemapType.PRODUCTS, SitemapType.CATEGORIES, SitemapType.PAGES];

      const generatedSitemaps: GeneratedSitemap[] = [];
      let totalUrls = 0;
      const errors: string[] = [];

      // Generate sitemaps for each locale
      for (const locale of sitemapLocales) {
        for (const type of sitemapTypes) {
          if (type === SitemapType.INDEX) continue; // Generate index last

          try {
            const sitemap = await this.generateSitemap(tenantId, baseUrl, locale, type);
            generatedSitemaps.push(sitemap);
            totalUrls += sitemap.urlCount;

            // Update progress
            const progress = (generatedSitemaps.length / (sitemapLocales.length * sitemapTypes.length)) * 80;
            await job.progress(progress);
          } catch (error) {
            const errorMsg = `Failed to generate ${type} sitemap for ${locale}: ${error}`;
            this.logger.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      // Generate sitemap index
      if (sitemapTypes.includes(SitemapType.INDEX)) {
        const indexSitemap = await this.generateSitemapIndex(tenantId, baseUrl, generatedSitemaps);
        generatedSitemaps.push(indexSitemap);
      }

      // Cache sitemaps
      await this.cacheSitemaps(tenantId, generatedSitemaps);

      // Upload to storage if enabled
      let storageUrls;
      if (job.data.uploadToStorage) {
        storageUrls = await this.uploadSitemaps(tenantId, generatedSitemaps);
      }

      // Ping search engines if enabled
      let pingResults: SearchEnginePingResult[] = [];
      if (job.data.pingSearchEngines && storageUrls) {
        pingResults = await this.pingSearchEngines(storageUrls.index);
      }

      // Update last generated timestamp
      await this.redis.set(
        REDIS_KEYS.SITEMAP_LAST_GENERATED(tenantId),
        new Date().toISOString(),
        CACHE_TTL.DAY,
      );

      await job.progress(100);

      return {
        success: errors.length === 0,
        jobId,
        tenantId,
        sitemaps: generatedSitemaps,
        totalUrls,
        durationMs: Date.now() - startTime,
        storageUrls,
        pingResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } finally {
      if (lockResult.lockId) {
        await this.lockService.releaseLock(lockKey, lockResult.lockId);
      }
    }
  }

  /**
   * Generate sitemap for specific type
   */
  private async generateSitemap(
    tenantId: string,
    baseUrl: string,
    locale: string,
    type: SitemapType,
  ): Promise<GeneratedSitemap> {
    const startTime = Date.now();
    let urls: SitemapUrl[] = [];

    switch (type) {
      case SitemapType.PRODUCTS:
        urls = await this.getProductUrls(tenantId, baseUrl, locale);
        break;
      case SitemapType.CATEGORIES:
        urls = await this.getCategoryUrls(tenantId, baseUrl, locale);
        break;
      case SitemapType.PAGES:
        urls = await this.getPageUrls(tenantId, baseUrl, locale);
        break;
    }

    // Build XML content
    const content = this.buildSitemapXml(urls);

    return {
      type,
      locale,
      urlCount: urls.length,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get product URLs for sitemap
   */
  private async getProductUrls(
    tenantId: string,
    baseUrl: string,
    locale: string,
  ): Promise<SitemapUrl[]> {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        images: true,
        name: true,
      },
      take: SITEMAP_CONFIG.MAX_URLS_PER_FILE,
    });

    return products.map((product) => ({
      loc: `${baseUrl}/${locale}/products/${product.slug || product.id}`,
      lastmod: product.updatedAt.toISOString().split('T')[0],
      changefreq: SITEMAP_CONFIG.PRODUCT_CHANGEFREQ,
      priority: SITEMAP_CONFIG.PRODUCT_PRIORITY,
      images: product.images?.map((img: string) => ({
        loc: img,
        title: product.name,
      })),
    }));
  }

  /**
   * Get category URLs for sitemap
   */
  private async getCategoryUrls(
    tenantId: string,
    baseUrl: string,
    locale: string,
  ): Promise<SitemapUrl[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
      },
    });

    return categories.map((category) => ({
      loc: `${baseUrl}/${locale}/categories/${category.slug || category.id}`,
      lastmod: category.updatedAt.toISOString().split('T')[0],
      changefreq: SITEMAP_CONFIG.CATEGORY_CHANGEFREQ,
      priority: SITEMAP_CONFIG.CATEGORY_PRIORITY,
    }));
  }

  /**
   * Get static page URLs for sitemap
   */
  private async getPageUrls(
    tenantId: string,
    baseUrl: string,
    locale: string,
  ): Promise<SitemapUrl[]> {
    // Static pages
    const staticPages = [
      { path: '', priority: 1.0, changefreq: 'daily' as const },
      { path: 'about', priority: 0.5, changefreq: 'monthly' as const },
      { path: 'contact', priority: 0.5, changefreq: 'monthly' as const },
      { path: 'privacy', priority: 0.3, changefreq: 'yearly' as const },
      { path: 'terms', priority: 0.3, changefreq: 'yearly' as const },
      { path: 'shipping', priority: 0.4, changefreq: 'monthly' as const },
      { path: 'returns', priority: 0.4, changefreq: 'monthly' as const },
    ];

    return staticPages.map((page) => ({
      loc: `${baseUrl}/${locale}/${page.path}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: page.changefreq,
      priority: page.priority,
    }));
  }

  /**
   * Build sitemap XML from URLs
   */
  private buildSitemapXml(urls: SitemapUrl[]): string {
    const urlEntries = urls.map((url) => SITEMAP_TEMPLATES.URL_ENTRY(url)).join('\n');

    return `${SITEMAP_TEMPLATES.XML_HEADER}
${SITEMAP_TEMPLATES.URLSET_OPEN}
${urlEntries}
${SITEMAP_TEMPLATES.URLSET_CLOSE}`;
  }

  /**
   * Generate sitemap index
   */
  private async generateSitemapIndex(
    tenantId: string,
    baseUrl: string,
    sitemaps: GeneratedSitemap[],
  ): Promise<GeneratedSitemap> {
    const lastmod = new Date().toISOString();

    const sitemapEntries = sitemaps
      .filter((s) => s.type !== SitemapType.INDEX)
      .map((s) => {
        const sitemapUrl = `${baseUrl}/sitemaps/${s.type}-${s.locale}.xml`;
        return SITEMAP_TEMPLATES.SITEMAP_ENTRY(sitemapUrl, lastmod);
      })
      .join('\n');

    const content = `${SITEMAP_TEMPLATES.XML_HEADER}
${SITEMAP_TEMPLATES.INDEX_OPEN}
${sitemapEntries}
${SITEMAP_TEMPLATES.INDEX_CLOSE}`;

    return {
      type: SitemapType.INDEX,
      locale: 'all',
      urlCount: sitemaps.length,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Cache sitemaps in Redis
   */
  private async cacheSitemaps(
    tenantId: string,
    sitemaps: GeneratedSitemap[],
  ): Promise<void> {
    for (const sitemap of sitemaps) {
      const cacheKey = REDIS_KEYS.SITEMAP(tenantId, sitemap.locale, sitemap.type);
      await this.redis.set(cacheKey, sitemap.content, CACHE_TTL.DAY);
    }

    // Cache index
    const indexSitemap = sitemaps.find((s) => s.type === SitemapType.INDEX);
    if (indexSitemap) {
      await this.redis.set(
        REDIS_KEYS.SITEMAP_INDEX(tenantId),
        indexSitemap.content,
        CACHE_TTL.DAY,
      );
    }
  }

  /**
   * Upload sitemaps to storage (S3, etc.)
   */
  private async uploadSitemaps(
    tenantId: string,
    sitemaps: GeneratedSitemap[],
  ): Promise<{ index: string; sitemaps: Record<string, string> }> {
    // In production, this would upload to S3/CloudFront
    // For now, return mock URLs
    const storageBase = this.configService.get<string>(
      'SITEMAP_STORAGE_URL',
      `https://storage.broxiva.com/sitemaps/${tenantId}`,
    );

    const sitemapUrls: Record<string, string> = {};
    for (const sitemap of sitemaps) {
      if (sitemap.type !== SitemapType.INDEX) {
        const key = `${sitemap.type}-${sitemap.locale}`;
        sitemapUrls[key] = `${storageBase}/${key}.xml`;
      }
    }

    return {
      index: `${storageBase}/sitemap.xml`,
      sitemaps: sitemapUrls,
    };
  }

  /**
   * Ping search engines about sitemap update
   */
  private async pingSearchEngines(
    sitemapUrl: string,
  ): Promise<SearchEnginePingResult[]> {
    const results: SearchEnginePingResult[] = [];
    const engines = ['google', 'bing'] as const;

    for (const engine of engines) {
      try {
        const pingUrl = SITEMAP_CONFIG.SEARCH_ENGINE_PING_URLS[engine](sitemapUrl);
        const response = await fetch(pingUrl, { method: 'GET' });

        results.push({
          engine,
          success: response.ok,
          statusCode: response.status,
        });

        this.logger.debug(`Pinged ${engine}: ${response.status}`);
      } catch (error) {
        results.push({
          engine,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job<SitemapJobData>) {
    this.logger.debug(`Processing sitemap job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<SitemapJobData>, result: SitemapJobResult) {
    this.logger.log(
      `Sitemap job ${job.id} completed: ${result.totalUrls} URLs in ${result.durationMs}ms`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<SitemapJobData>, error: Error) {
    this.logger.error(`Sitemap job ${job.id} failed: ${error.message}`);
  }
}
