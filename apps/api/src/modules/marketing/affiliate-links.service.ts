import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
// @ts-ignore
import { customAlphabet } from 'nanoid';

// Generate short, URL-safe affiliate codes
const generateAffiliateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

/**
 * UTM Parameters for tracking
 */
export interface UTMParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/**
 * Affiliate Link Configuration
 */
export interface AffiliateLinkConfig {
  affiliateCode: string;
  productSlug: string;
  utmParams: UTMParams;
  customParams?: Record<string, string>;
}

/**
 * Affiliate Link Result
 */
export interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId: string;
  shortUrl: string;
  fullUrl: string;
  affiliateCode: string;
  utmParams: UTMParams;
  clickCount: number;
  conversionCount: number;
  totalRevenue: number;
  commission: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Click tracking data
 */
export interface ClickData {
  linkId: string;
  affiliateCode: string;
  productSlug: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  timestamp: Date;
}

/**
 * Conversion tracking data
 */
export interface ConversionData {
  affiliateCode: string;
  orderId: string;
  productId: string;
  amount: number;
  currency: string;
  customerId?: string;
}

/**
 * Commission structure
 */
export interface CommissionStructure {
  type: 'percentage' | 'fixed';
  value: number;
  currency?: string;
  tiers?: Array<{
    minRevenue: number;
    maxRevenue?: number;
    rate: number;
  }>;
}

@Injectable()
export class AffiliateLinksService {
  private readonly logger = new Logger(AffiliateLinksService.name);
  private readonly cachePrefix = 'affiliate:';
  private readonly baseUrl: string;
  private readonly defaultCommission: CommissionStructure = {
    type: 'percentage',
    value: 5, // 5% default commission
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://broxiva.com';
  }

  /**
   * Generate an affiliate link for a product
   */
  async generateAffiliateLink(config: {
    affiliateId: string;
    productId?: string;
    productSlug?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    customParams?: Record<string, string>;
    expiresAt?: Date;
  }): Promise<AffiliateLink> {
    const {
      affiliateId,
      productId,
      productSlug,
      utmSource = 'affiliate',
      utmMedium = 'referral',
      utmCampaign,
      customParams,
      expiresAt,
    } = config;

    // Verify affiliate exists
    const affiliate = await this.prisma.user.findUnique({
      where: { id: affiliateId },
      select: { id: true, affiliateCode: true } as any,
    }) as any;

    if (!affiliate) {
      throw new NotFoundException('Affiliate not found');
    }

    // Get or generate affiliate code
    let affiliateCode = affiliate.affiliateCode;
    if (!affiliateCode) {
      affiliateCode = generateAffiliateCode();
      await this.prisma.user.update({
        where: { id: affiliateId },
        data: { affiliateCode } as any,
      });
    }

    // Get product if specified
    let product = null;
    let resolvedProductId = productId;
    let resolvedProductSlug = productSlug;

    if (productId || productSlug) {
      product = await this.prisma.product.findFirst({
        where: {
          OR: [
            { id: productId || undefined },
            { slug: productSlug || undefined },
          ],
        },
        select: { id: true, slug: true, name: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      resolvedProductId = product.id;
      resolvedProductSlug = product.slug;
    }

    // Build UTM parameters
    const utmParams: UTMParams = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      ...(utmCampaign && { utm_campaign: utmCampaign }),
    };

    // Generate short URL path
    // Format: /go/{affiliate_code}/{product_slug}
    const shortPath = resolvedProductSlug
      ? `/go/${affiliateCode}/${resolvedProductSlug}`
      : `/go/${affiliateCode}`;

    const shortUrl = `${this.baseUrl}${shortPath}`;

    // Build full destination URL with UTM params
    const destinationPath = resolvedProductSlug
      ? `/products/${resolvedProductSlug}`
      : '/';

    const queryParams = new URLSearchParams({
      ...utmParams,
      ref: affiliateCode,
      ...customParams,
    });

    const fullUrl = `${this.baseUrl}${destinationPath}?${queryParams.toString()}`;

    // Create or update affiliate link record
    const affiliateLink = await (this.prisma as any).affiliateLink?.upsert({
      where: {
        affiliateId_productId: {
          affiliateId,
          productId: resolvedProductId || 'general',
        },
      },
      update: {
        shortUrl,
        fullUrl,
        utmParams: utmParams as any,
        customParams: customParams as any,
        updatedAt: new Date(),
      },
      create: {
        affiliateId,
        productId: resolvedProductId || 'general',
        affiliateCode,
        shortUrl,
        fullUrl,
        utmParams: utmParams as any,
        customParams: customParams as any,
        expiresAt,
        isActive: true,
      },
    }).catch(async () => {
      // Fallback if AffiliateLink model doesn't exist
      return {
        id: `${affiliateId}_${resolvedProductId || 'general'}`,
        affiliateId,
        productId: resolvedProductId || 'general',
        affiliateCode,
        shortUrl,
        fullUrl,
        utmParams,
        customParams,
        clickCount: 0,
        conversionCount: 0,
        totalRevenue: 0,
        commission: 0,
        isActive: true,
        createdAt: new Date(),
        expiresAt,
      };
    });

    // Cache the link for quick lookup
    await this.cacheService.set(
      `${this.cachePrefix}link:${affiliateCode}:${resolvedProductSlug || 'home'}`,
      affiliateLink,
      { ttl: CacheTTL.LONG }
    );

    return {
      id: affiliateLink.id,
      affiliateId: affiliateLink.affiliateId,
      productId: affiliateLink.productId,
      shortUrl: affiliateLink.shortUrl,
      fullUrl: affiliateLink.fullUrl,
      affiliateCode: affiliateLink.affiliateCode,
      utmParams: affiliateLink.utmParams as UTMParams,
      clickCount: affiliateLink.clickCount || 0,
      conversionCount: affiliateLink.conversionCount || 0,
      totalRevenue: affiliateLink.totalRevenue || 0,
      commission: affiliateLink.commission || 0,
      isActive: affiliateLink.isActive,
      createdAt: affiliateLink.createdAt,
      expiresAt: affiliateLink.expiresAt,
    };
  }

  /**
   * Resolve affiliate link and get destination URL
   */
  async resolveAffiliateLink(affiliateCode: string, productSlug?: string): Promise<{
    destinationUrl: string;
    affiliateId?: string;
    productId?: string;
    linkId?: string;
  }> {
    const cacheKey = `${this.cachePrefix}link:${affiliateCode}:${productSlug || 'home'}`;

    // Check cache first
    const cached = await this.cacheService.get<AffiliateLink>(cacheKey);
    if (cached && cached.isActive) {
      return {
        destinationUrl: cached.fullUrl,
        affiliateId: cached.affiliateId,
        productId: cached.productId,
        linkId: cached.id,
      };
    }

    // Look up affiliate
    const affiliate = await this.prisma.user.findFirst({
      where: { affiliateCode } as any,
      select: { id: true },
    });

    if (!affiliate) {
      // Invalid affiliate code - return base URL
      return {
        destinationUrl: productSlug
          ? `${this.baseUrl}/products/${productSlug}`
          : this.baseUrl,
      };
    }

    // Build destination URL
    const queryParams = new URLSearchParams({
      utm_source: 'affiliate',
      utm_medium: 'referral',
      ref: affiliateCode,
    });

    const destinationUrl = productSlug
      ? `${this.baseUrl}/products/${productSlug}?${queryParams.toString()}`
      : `${this.baseUrl}?${queryParams.toString()}`;

    return {
      destinationUrl,
      affiliateId: affiliate.id,
    };
  }

  /**
   * Track a click on an affiliate link
   */
  async trackClick(data: ClickData): Promise<void> {
    this.logger.debug(`Tracking click for affiliate: ${data.affiliateCode}`);

    try {
      // Increment click count
      await (this.prisma as any).affiliateClick?.create({
        data: {
          affiliateCode: data.affiliateCode,
          productSlug: data.productSlug,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer,
          country: data.country,
          clickedAt: data.timestamp,
        },
      }).catch(() => {
        // AffiliateClick model may not exist
      });

      // Update link stats
      await (this.prisma as any).affiliateLink?.updateMany({
        where: { affiliateCode: data.affiliateCode },
        data: {
          clickCount: { increment: 1 },
          lastClickAt: data.timestamp,
        },
      }).catch(() => {});

      // Store in Redis for real-time analytics
      const dailyKey = `${this.cachePrefix}clicks:${data.affiliateCode}:${new Date().toISOString().split('T')[0]}`;
      await (this.cacheService as any).increment(dailyKey);
    } catch (error) {
      this.logger.error('Error tracking affiliate click:', error);
    }
  }

  /**
   * Track a conversion (purchase)
   */
  async trackConversion(data: ConversionData): Promise<{
    conversionId: string;
    commission: number;
  }> {
    this.logger.log(`Tracking conversion for affiliate: ${data.affiliateCode}, order: ${data.orderId}`);

    // Get affiliate
    const affiliate = await this.prisma.user.findFirst({
      where: { affiliateCode: data.affiliateCode } as any,
      select: { id: true, affiliateCommissionRate: true } as any,
    }) as any;

    if (!affiliate) {
      throw new BadRequestException('Invalid affiliate code');
    }

    // Calculate commission
    const commissionRate = (affiliate as any).affiliateCommissionRate || this.defaultCommission.value;
    const commission = this.defaultCommission.type === 'percentage'
      ? (data.amount * commissionRate) / 100
      : commissionRate;

    // Create conversion record
    const conversion = await (this.prisma as any).affiliateConversion?.create({
      data: {
        affiliateId: affiliate.id,
        affiliateCode: data.affiliateCode,
        orderId: data.orderId,
        productId: data.productId,
        amount: data.amount,
        currency: data.currency,
        commission,
        customerId: data.customerId,
        status: 'PENDING',
        convertedAt: new Date(),
      },
    }).catch(() => {
      return {
        id: `conv_${Date.now()}`,
        commission,
      };
    });

    // Update affiliate link stats
    await (this.prisma as any).affiliateLink?.updateMany({
      where: { affiliateCode: data.affiliateCode },
      data: {
        conversionCount: { increment: 1 },
        totalRevenue: { increment: data.amount },
        commission: { increment: commission },
      },
    }).catch(() => {});

    // Invalidate cache
    await this.cacheService.delete(`${this.cachePrefix}stats:${affiliate.id}`);

    return {
      conversionId: conversion.id,
      commission,
    };
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(affiliateId: string): Promise<{
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalCommission: number;
    conversionRate: number;
    pendingCommission: number;
    paidCommission: number;
    activeLinks: number;
    topPerformingLinks: Array<{
      productSlug: string;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
  }> {
    const cacheKey = `${this.cachePrefix}stats:${affiliateId}`;

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get aggregate stats from affiliate links
    const linkStats = await (this.prisma as any).affiliateLink?.aggregate({
      where: { affiliateId, isActive: true },
      _sum: {
        clickCount: true,
        conversionCount: true,
        totalRevenue: true,
        commission: true,
      },
      _count: true,
    }).catch(() => ({
      _sum: { clickCount: 0, conversionCount: 0, totalRevenue: 0, commission: 0 },
      _count: 0,
    }));

    // Get pending and paid commissions
    const commissionStats = await (this.prisma as any).affiliateConversion?.groupBy({
      by: ['status'],
      where: { affiliateId },
      _sum: { commission: true },
    }).catch(() => []);

    const pendingCommission = commissionStats?.find((s: any) => s.status === 'PENDING')?._sum?.commission || 0;
    const paidCommission = commissionStats?.find((s: any) => s.status === 'PAID')?._sum?.commission || 0;

    // Get top performing links
    const topLinks = await (this.prisma as any).affiliateLink?.findMany({
      where: { affiliateId, isActive: true },
      select: {
        productId: true,
        clickCount: true,
        conversionCount: true,
        totalRevenue: true,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    }).catch(() => []);

    // Get product slugs for top links
    const productIds = (topLinks || []).map((l: any) => l.productId).filter(Boolean);
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, slug: true },
        })
      : [];

    const productSlugMap = new Map(products.map(p => [p.id, p.slug]));

    const totalClicks = linkStats._sum?.clickCount || 0;
    const totalConversions = linkStats._sum?.conversionCount || 0;

    const stats = {
      totalClicks,
      totalConversions,
      totalRevenue: linkStats._sum?.totalRevenue || 0,
      totalCommission: linkStats._sum?.commission || 0,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      pendingCommission,
      paidCommission,
      activeLinks: linkStats._count || 0,
      topPerformingLinks: (topLinks || []).map((link: any) => ({
        productSlug: productSlugMap.get(link.productId) || link.productId,
        clicks: link.clickCount || 0,
        conversions: link.conversionCount || 0,
        revenue: link.totalRevenue || 0,
      })),
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, stats, { ttl: 300 });

    return stats;
  }

  /**
   * Get all affiliate links for an affiliate
   */
  async getAffiliateLinks(
    affiliateId: string,
    options?: {
      page?: number;
      limit?: number;
      isActive?: boolean;
    }
  ): Promise<{
    links: AffiliateLink[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, isActive } = options || {};
    const skip = (page - 1) * limit;

    const where: any = { affiliateId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [links, total] = await Promise.all([
      (this.prisma as any).affiliateLink?.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      (this.prisma as any).affiliateLink?.count({ where }).catch(() => 0),
    ]);

    return {
      links: (links || []).map((link: any) => ({
        id: link.id,
        affiliateId: link.affiliateId,
        productId: link.productId,
        shortUrl: link.shortUrl,
        fullUrl: link.fullUrl,
        affiliateCode: link.affiliateCode,
        utmParams: link.utmParams as UTMParams,
        clickCount: link.clickCount || 0,
        conversionCount: link.conversionCount || 0,
        totalRevenue: link.totalRevenue || 0,
        commission: link.commission || 0,
        isActive: link.isActive,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
      })),
      total: total || 0,
      page,
      limit,
    };
  }

  /**
   * Deactivate an affiliate link
   */
  async deactivateLink(linkId: string, affiliateId: string): Promise<void> {
    await (this.prisma as any).affiliateLink?.update({
      where: {
        id: linkId,
        affiliateId, // Ensure ownership
      },
      data: { isActive: false },
    }).catch(() => {});

    // Clear cache
    const link = await (this.prisma as any).affiliateLink?.findUnique({
      where: { id: linkId },
      select: { affiliateCode: true, productId: true },
    }).catch(() => null);

    if (link) {
      await this.cacheService.delete(
        `${this.cachePrefix}link:${link.affiliateCode}:${link.productId}`
      );
    }
  }

  /**
   * Get commission structure for a product/category
   */
  async getCommissionStructure(productId?: string, categoryId?: string): Promise<CommissionStructure> {
    // Check for product-specific commission
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { affiliateCommissionRate: true } as any,
      }) as any;

      if (product?.affiliateCommissionRate) {
        return {
          type: 'percentage',
          value: (product as any).affiliateCommissionRate,
        };
      }
    }

    // Check for category-specific commission
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { affiliateCommissionRate: true } as any,
      }) as any;

      if (category?.affiliateCommissionRate) {
        return {
          type: 'percentage',
          value: (category as any).affiliateCommissionRate,
        };
      }
    }

    // Return default commission
    return this.defaultCommission;
  }
}
