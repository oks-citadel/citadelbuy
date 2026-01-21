import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

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

// Scheduled Jobs
import { SeoSchedulerService } from './seo-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ScheduleModule.forRoot(),
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

    // Scheduler
    SeoSchedulerService,
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
    SeoSchedulerService,
  ],
})
export class SeoModule {}
