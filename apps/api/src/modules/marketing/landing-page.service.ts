import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLandingPageDto, UpdateLandingPageDto, LandingPageStatus } from './dto/landing-page.dto';

@Injectable()
export class LandingPageService {
  private readonly logger = new Logger(LandingPageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new landing page
   */
  async createLandingPage(data: CreateLandingPageDto) {
    try {
      // Check if slug is unique
      const existing = await this.prisma.landingPage.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Landing page with slug '${data.slug}' already exists`);
      }

      this.logger.log(`Creating landing page: ${data.name}`);

      const page = await this.prisma.landingPage.create({
        data: {
          name: data.name,
          slug: data.slug,
          title: data.title || data.name,
          description: data.description,
          template: data.template,
          status: LandingPageStatus.DRAFT,
          region: data.region,
          language: data.language || 'en',
          organizationId: data.organizationId,
          campaignId: data.campaignId,
          seoMetadata: data.seoMetadata as any,
          primaryCTA: data.primaryCTA as any,
          secondaryCTA: data.secondaryCTA as any,
          content: data.content as any,
          tags: data.tags,
          analytics: {
            views: 0,
            uniqueVisitors: 0,
            conversions: 0,
            bounceRate: 0,
            avgTimeOnPage: 0,
          },
        },
      });

      this.logger.log(`Landing page created: ${page.id}`);
      return page;
    } catch (error) {
      this.logger.error(`Failed to create landing page: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all landing pages with optional filters
   */
  async getLandingPages(filters?: {
    organizationId?: string;
    campaignId?: string;
    status?: LandingPageStatus;
    region?: string;
    language?: string;
  }) {
    const where: any = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.region) {
      where.region = filters.region;
    }

    if (filters?.language) {
      where.language = filters.language;
    }

    const pages = await this.prisma.landingPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return pages;
  }

  /**
   * Get a landing page by ID
   */
  async getLandingPageById(id: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id },
      include: {
        organization: true,
        campaign: true,
      },
    });

    if (!page) {
      throw new NotFoundException(`Landing page ${id} not found`);
    }

    return page;
  }

  /**
   * Get a landing page by slug
   */
  async getLandingPageBySlug(slug: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Landing page with slug '${slug}' not found`);
    }

    // Track page view
    await this.trackPageView(page.id);

    return page;
  }

  /**
   * Update a landing page
   */
  async updateLandingPage(id: string, data: UpdateLandingPageDto) {
    try {
      await this.getLandingPageById(id);

      const updated = await this.prisma.landingPage.update({
        where: { id },
        data: {
          name: data.name,
          title: data.title,
          description: data.description,
          status: data.status,
          seoMetadata: data.seoMetadata as any,
          primaryCTA: data.primaryCTA as any,
          secondaryCTA: data.secondaryCTA as any,
          content: data.content as any,
          tags: data.tags,
        },
      });

      this.logger.log(`Landing page updated: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update landing page: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a landing page
   */
  async deleteLandingPage(id: string) {
    await this.getLandingPageById(id);

    await this.prisma.landingPage.delete({
      where: { id },
    });

    this.logger.log(`Landing page deleted: ${id}`);
    return { success: true };
  }

  /**
   * Publish a landing page
   */
  async publishLandingPage(id: string) {
    const page = await this.getLandingPageById(id);

    if (page.status === LandingPageStatus.PUBLISHED) {
      throw new BadRequestException('Page is already published');
    }

    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: {
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    this.logger.log(`Landing page published: ${id}`);
    return updated;
  }

  /**
   * Archive a landing page
   */
  async archiveLandingPage(id: string) {
    await this.getLandingPageById(id);

    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: {
        status: LandingPageStatus.ARCHIVED,
      },
    });

    this.logger.log(`Landing page archived: ${id}`);
    return updated;
  }

  /**
   * Track page view
   */
  async trackPageView(pageId: string, visitorId?: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return;
    }

    const analytics = (page.analytics as any) || {
      views: 0,
      uniqueVisitors: 0,
      conversions: 0,
      bounceRate: 0,
      avgTimeOnPage: 0,
    };

    analytics.views += 1;

    if (visitorId) {
      // In a real implementation, track unique visitors using Redis or similar
      analytics.uniqueVisitors += 1;
    }

    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: {
        analytics: analytics,
      },
    });

    this.logger.debug(`Page view tracked: ${pageId}`);
  }

  /**
   * Track conversion (CTA click)
   */
  async trackConversion(pageId: string, ctaType: 'primary' | 'secondary') {
    const page = await this.getLandingPageById(pageId);

    const analytics = (page.analytics as any) || {
      views: 0,
      uniqueVisitors: 0,
      conversions: 0,
      bounceRate: 0,
      avgTimeOnPage: 0,
    };

    analytics.conversions += 1;

    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: {
        analytics: analytics,
      },
    });

    // Also track in campaign if linked
    if (page.campaignId) {
      await this.prisma.marketingCampaign.update({
        where: { id: page.campaignId },
        data: {
          metrics: {
            ...(page.campaign?.metrics as any),
            conversions: ((page.campaign?.metrics as any)?.conversions || 0) + 1,
          },
        },
      });
    }

    this.logger.log(`Conversion tracked: ${pageId} - ${ctaType}`);
    return { success: true };
  }

  /**
   * Get landing page analytics
   */
  async getPageAnalytics(pageId: string) {
    const page = await this.getLandingPageById(pageId);

    const analytics = (page.analytics as any) || {
      views: 0,
      uniqueVisitors: 0,
      conversions: 0,
      bounceRate: 0,
      avgTimeOnPage: 0,
    };

    const conversionRate = analytics.views > 0
      ? (analytics.conversions / analytics.views) * 100
      : 0;

    return {
      pageId: page.id,
      pageName: page.name,
      slug: page.slug,
      status: page.status,
      views: analytics.views,
      uniqueVisitors: analytics.uniqueVisitors,
      conversions: analytics.conversions,
      conversionRate: conversionRate.toFixed(2),
      bounceRate: analytics.bounceRate,
      avgTimeOnPage: analytics.avgTimeOnPage,
      createdAt: page.createdAt,
      publishedAt: page.publishedAt,
    };
  }

  /**
   * Duplicate a landing page
   */
  async duplicateLandingPage(id: string, newSlug: string) {
    const original = await this.getLandingPageById(id);

    // Check if new slug is unique
    const existing = await this.prisma.landingPage.findUnique({
      where: { slug: newSlug },
    });

    if (existing) {
      throw new ConflictException(`Landing page with slug '${newSlug}' already exists`);
    }

    const duplicate = await this.prisma.landingPage.create({
      data: {
        name: `${original.name} (Copy)`,
        slug: newSlug,
        title: original.title,
        description: original.description,
        template: original.template,
        status: LandingPageStatus.DRAFT,
        region: original.region,
        language: original.language,
        organizationId: original.organizationId,
        campaignId: original.campaignId,
        seoMetadata: original.seoMetadata as any,
        primaryCTA: original.primaryCTA as any,
        secondaryCTA: original.secondaryCTA as any,
        content: original.content as any,
        tags: original.tags,
        analytics: {
          views: 0,
          uniqueVisitors: 0,
          conversions: 0,
          bounceRate: 0,
          avgTimeOnPage: 0,
        },
      },
    });

    this.logger.log(`Landing page duplicated: ${id} -> ${duplicate.id}`);
    return duplicate;
  }

  /**
   * Get pages by region
   */
  async getPagesByRegion(region: string) {
    const pages = await this.prisma.landingPage.findMany({
      where: {
        region,
        status: LandingPageStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'desc' },
    });

    return pages;
  }
}
