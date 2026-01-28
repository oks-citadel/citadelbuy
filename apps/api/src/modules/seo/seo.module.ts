import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';
import { QUEUES } from '@/common/queue/queue.constants';

// Main SEO Service (legacy, for backward compatibility)
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';

// Sitemap Module
import { SitemapService } from './sitemap/sitemap.service';
import { SitemapController } from './sitemap/sitemap.controller';

// Robots.txt Module
import { RobotsService } from './robots/robots.service';
import { RobotsController } from './robots/robots.controller';

// Schema.org JSON-LD Module
import { SchemaService } from './schema/schema.service';
import { SchemaController } from './schema/schema.controller';

// SEO Audit Module
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';

// Core Web Vitals Module
import { VitalsService } from './vitals/vitals.service';
import { VitalsController } from './vitals/vitals.controller';

// Technical SEO Module
import { TechnicalService } from './technical/technical.service';
import { TechnicalController } from './technical/technical.controller';

// Content SEO Module
import { ContentSeoService } from './content-seo/content-seo.service';
import { ContentSeoController } from './content-seo/content-seo.controller';

// Redirects Module
import { RedirectsService } from './redirects/redirects.service';
import { RedirectsController } from './redirects/redirects.controller';

// Google Search Console Module
import { SearchConsoleService } from './search-console/search-console.service';
import { SearchConsoleController } from './search-console/search-console.controller';

// Meta Tags Module
import { MetaTagsService } from './meta-tags/meta-tags.service';
import { MetaTagsController } from './meta-tags/meta-tags.controller';

// Local SEO Module
import { LocalSeoService } from './local-seo/local-seo.service';
import { LocalSeoController } from './local-seo/local-seo.controller';

// AI SEO Module
import { AiSeoService } from './ai-seo/ai-seo.service';
import { AiSeoController } from './ai-seo/ai-seo.controller';

// Dashboard Module
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';

// Scheduled Jobs
import { SeoSchedulerService } from './seo-scheduler.service';

// Background Workers
import { SitemapProcessor } from './workers/sitemap.processor';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: QUEUES.SITEMAP,
    }),
  ],
  controllers: [
    SeoController,
    SitemapController,
    RobotsController,
    SchemaController,
    AuditController,
    VitalsController,
    TechnicalController,
    ContentSeoController,
    RedirectsController,
    SearchConsoleController,
    MetaTagsController,
    LocalSeoController,
    AiSeoController,
    DashboardController,
  ],
  providers: [
    // Core Services
    SeoService,
    SitemapService,
    RobotsService,
    SchemaService,
    AuditService,
    VitalsService,
    TechnicalService,
    ContentSeoService,
    RedirectsService,
    SearchConsoleService,
    MetaTagsService,
    LocalSeoService,
    AiSeoService,
    DashboardService,

    // Scheduler
    SeoSchedulerService,

    // Background Workers
    SitemapProcessor,
  ],
  exports: [
    SeoService,
    SitemapService,
    RobotsService,
    SchemaService,
    AuditService,
    VitalsService,
    TechnicalService,
    ContentSeoService,
    RedirectsService,
    SearchConsoleService,
    MetaTagsService,
    LocalSeoService,
    AiSeoService,
    DashboardService,
    SeoSchedulerService,
    SitemapProcessor,
  ],
})
export class SeoModule {}
