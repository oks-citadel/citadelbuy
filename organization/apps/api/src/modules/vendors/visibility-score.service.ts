import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';

/**
 * Vendor Visibility Score Components
 */
export interface VisibilityScoreComponents {
  productListingCompleteness: number; // 0-100
  translationCoverage: number; // 0-100
  responseTime: number; // 0-100
  reviewRating: number; // 0-100
  orderFulfillmentRate: number; // 0-100
  returnRateInverse: number; // 0-100 (higher is better)
}

/**
 * Vendor Visibility Score Result
 */
export interface VisibilityScoreResult {
  vendorId: string;
  overallScore: number; // 0-100
  components: VisibilityScoreComponents;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  recommendations: string[];
  lastCalculated: Date;
}

/**
 * Weight configuration for score components
 */
export interface ScoreWeights {
  productListingCompleteness: number;
  translationCoverage: number;
  responseTime: number;
  reviewRating: number;
  orderFulfillmentRate: number;
  returnRateInverse: number;
}

/**
 * Default weights for visibility score calculation
 */
const DEFAULT_WEIGHTS: ScoreWeights = {
  productListingCompleteness: 0.20, // 20%
  translationCoverage: 0.15, // 15%
  responseTime: 0.15, // 15%
  reviewRating: 0.20, // 20%
  orderFulfillmentRate: 0.20, // 20%
  returnRateInverse: 0.10, // 10%
};

/**
 * Tier thresholds
 */
const TIER_THRESHOLDS = {
  platinum: 90,
  gold: 75,
  silver: 50,
  bronze: 0,
};

@Injectable()
export class VisibilityScoreService {
  private readonly logger = new Logger(VisibilityScoreService.name);
  private readonly cachePrefix = 'vendor:visibility:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Calculate vendor visibility score
   */
  async calculateVisibilityScore(
    vendorId: string,
    weights: ScoreWeights = DEFAULT_WEIGHTS,
  ): Promise<VisibilityScoreResult> {
    const cacheKey = `${this.cachePrefix}${vendorId}`;

    // Check cache first
    const cached = await this.cacheService.get<VisibilityScoreResult>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Calculating visibility score for vendor: ${vendorId}`);

    // Calculate all components in parallel
    const [
      productListingCompleteness,
      translationCoverage,
      responseTime,
      reviewRating,
      orderFulfillmentRate,
      returnRateInverse,
    ] = await Promise.all([
      this.calculateProductListingCompleteness(vendorId),
      this.calculateTranslationCoverage(vendorId),
      this.calculateResponseTimeScore(vendorId),
      this.calculateReviewRatingScore(vendorId),
      this.calculateOrderFulfillmentRate(vendorId),
      this.calculateReturnRateInverse(vendorId),
    ]);

    const components: VisibilityScoreComponents = {
      productListingCompleteness,
      translationCoverage,
      responseTime,
      reviewRating,
      orderFulfillmentRate,
      returnRateInverse,
    };

    // Calculate weighted average
    const overallScore = Math.round(
      productListingCompleteness * weights.productListingCompleteness +
      translationCoverage * weights.translationCoverage +
      responseTime * weights.responseTime +
      reviewRating * weights.reviewRating +
      orderFulfillmentRate * weights.orderFulfillmentRate +
      returnRateInverse * weights.returnRateInverse
    );

    // Determine tier
    const tier = this.determineTier(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(components);

    const result: VisibilityScoreResult = {
      vendorId,
      overallScore,
      components,
      tier,
      recommendations,
      lastCalculated: new Date(),
    };

    // Cache the result
    await this.cacheService.set(cacheKey, result, { ttl: CacheTTL.MEDIUM });

    // Store historical record
    await this.storeScoreHistory(vendorId, result);

    return result;
  }

  /**
   * Calculate product listing completeness score
   * Checks: images, descriptions, specifications, categories, pricing
   */
  private async calculateProductListingCompleteness(vendorId: string): Promise<number> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          vendorId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          images: true,
          price: true,
          categoryId: true,
          specifications: true,
          sku: true,
          brand: true,
          weight: true,
        },
      });

      if (products.length === 0) return 0;

      let totalScore = 0;
      const maxPointsPerProduct = 100;

      for (const product of products) {
        let productScore = 0;

        // Name (10 points) - must be at least 10 chars
        if (product.name && product.name.length >= 10) productScore += 10;

        // Description (20 points) - must be at least 100 chars
        if (product.description && product.description.length >= 100) {
          productScore += 20;
        } else if (product.description && product.description.length >= 50) {
          productScore += 10;
        }

        // Images (25 points) - at least 3 images = full points
        const imageCount = Array.isArray(product.images) ? product.images.length : 0;
        if (imageCount >= 3) {
          productScore += 25;
        } else if (imageCount >= 1) {
          productScore += Math.round((imageCount / 3) * 25);
        }

        // Price (10 points)
        if (product.price && product.price > 0) productScore += 10;

        // Category (10 points)
        if (product.categoryId) productScore += 10;

        // SKU (5 points)
        if (product.sku) productScore += 5;

        // Brand (5 points)
        if (product.brand) productScore += 5;

        // Specifications (10 points)
        const specs = product.specifications as Record<string, any> | null;
        if (specs && Object.keys(specs).length >= 3) {
          productScore += 10;
        } else if (specs && Object.keys(specs).length >= 1) {
          productScore += 5;
        }

        // Weight (5 points)
        if (product.weight) productScore += 5;

        totalScore += (productScore / maxPointsPerProduct) * 100;
      }

      return Math.round(totalScore / products.length);
    } catch (error) {
      this.logger.error(`Error calculating product completeness for vendor ${vendorId}:`, error);
      return 50; // Default mid-score on error
    }
  }

  /**
   * Calculate translation coverage score
   * Checks how many products have translations in supported locales
   */
  private async calculateTranslationCoverage(vendorId: string): Promise<number> {
    try {
      // Get total products
      const totalProducts = await this.prisma.product.count({
        where: { vendorId, isActive: true },
      });

      if (totalProducts === 0) return 0;

      // Get products with translations
      const productsWithTranslations = await this.prisma.product.count({
        where: {
          vendorId,
          isActive: true,
          translations: {
            some: {}, // Has at least one translation
          },
        },
      });

      // Calculate percentage
      const coveragePercent = (productsWithTranslations / totalProducts) * 100;

      // Check average number of translations per product
      const translationStats = await this.prisma.productTranslation.groupBy({
        by: ['productId'],
        where: {
          product: {
            vendorId,
            isActive: true,
          },
        },
        _count: true,
      });

      // Award bonus for multiple translations (up to 5 locales)
      let avgTranslations = 0;
      if (translationStats.length > 0) {
        avgTranslations = translationStats.reduce((sum, t) => sum + t._count, 0) / translationStats.length;
      }
      const multiLocaleBonus = Math.min(avgTranslations / 5, 1) * 20;

      return Math.min(100, Math.round(coveragePercent * 0.8 + multiLocaleBonus));
    } catch (error) {
      this.logger.error(`Error calculating translation coverage for vendor ${vendorId}:`, error);
      return 50;
    }
  }

  /**
   * Calculate response time score
   * Based on average response time to customer inquiries
   */
  private async calculateResponseTimeScore(vendorId: string): Promise<number> {
    try {
      // Get vendor's average response time from support tickets/messages
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Attempt to get from support tickets
      const tickets = await this.prisma.supportTicket?.findMany({
        where: {
          assignedTo: vendorId,
          createdAt: { gte: thirtyDaysAgo },
          responses: { some: {} },
        },
        select: {
          createdAt: true,
          responses: {
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      }).catch(() => []);

      if (!tickets || tickets.length === 0) {
        // No data - return neutral score
        return 70;
      }

      // Calculate average response time in hours
      let totalResponseTime = 0;
      let validResponses = 0;

      for (const ticket of tickets) {
        if (ticket.responses.length > 0) {
          const responseTime = new Date(ticket.responses[0].createdAt).getTime() -
            new Date(ticket.createdAt).getTime();
          totalResponseTime += responseTime;
          validResponses++;
        }
      }

      if (validResponses === 0) return 70;

      const avgResponseHours = (totalResponseTime / validResponses) / (1000 * 60 * 60);

      // Score based on response time
      // < 1 hour = 100, 1-4 hours = 90, 4-12 hours = 80, 12-24 hours = 60, 24-48 hours = 40, > 48 hours = 20
      if (avgResponseHours < 1) return 100;
      if (avgResponseHours < 4) return 90;
      if (avgResponseHours < 12) return 80;
      if (avgResponseHours < 24) return 60;
      if (avgResponseHours < 48) return 40;
      return 20;
    } catch (error) {
      this.logger.error(`Error calculating response time for vendor ${vendorId}:`, error);
      return 70;
    }
  }

  /**
   * Calculate review rating score
   */
  private async calculateReviewRatingScore(vendorId: string): Promise<number> {
    try {
      // Get vendor's products reviews
      const reviews = await this.prisma.review.aggregate({
        where: {
          product: {
            vendorId,
          },
          status: 'APPROVED',
        },
        _avg: { rating: true },
        _count: true,
      });

      if (!reviews._count || reviews._count === 0) {
        // No reviews - return neutral score
        return 50;
      }

      const avgRating = reviews._avg.rating || 0;
      const reviewCount = reviews._count;

      // Convert 5-star rating to 0-100 score
      // Also factor in number of reviews (more reviews = more reliable)
      const ratingScore = (avgRating / 5) * 100;
      const countBonus = Math.min(reviewCount / 100, 1) * 10; // Up to 10 bonus points for 100+ reviews

      return Math.min(100, Math.round(ratingScore + countBonus));
    } catch (error) {
      this.logger.error(`Error calculating review rating for vendor ${vendorId}:`, error);
      return 50;
    }
  }

  /**
   * Calculate order fulfillment rate
   */
  private async calculateOrderFulfillmentRate(vendorId: string): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get total orders
      const totalOrders = await this.prisma.orderItem.count({
        where: {
          product: { vendorId },
          order: {
            createdAt: { gte: ninetyDaysAgo },
            status: { not: 'CANCELLED' },
          },
        },
      });

      if (totalOrders === 0) return 80; // No orders - neutral score

      // Get fulfilled orders (delivered or completed)
      const fulfilledOrders = await this.prisma.orderItem.count({
        where: {
          product: { vendorId },
          order: {
            createdAt: { gte: ninetyDaysAgo },
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
        },
      });

      // Get on-time deliveries (within estimated delivery window)
      const onTimeDeliveries = await this.prisma.orderItem.count({
        where: {
          product: { vendorId },
          order: {
            createdAt: { gte: ninetyDaysAgo },
            status: { in: ['DELIVERED', 'COMPLETED'] },
            deliveredAt: { not: null },
            // Would need actual delivery window comparison
          },
        },
      });

      const fulfillmentRate = (fulfilledOrders / totalOrders) * 100;
      return Math.round(fulfillmentRate);
    } catch (error) {
      this.logger.error(`Error calculating fulfillment rate for vendor ${vendorId}:`, error);
      return 70;
    }
  }

  /**
   * Calculate return rate inverse (lower returns = higher score)
   */
  private async calculateReturnRateInverse(vendorId: string): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get total completed orders
      const totalOrders = await this.prisma.orderItem.count({
        where: {
          product: { vendorId },
          order: {
            createdAt: { gte: ninetyDaysAgo },
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
        },
      });

      if (totalOrders === 0) return 80; // No orders - neutral score

      // Get returns
      const returns = await this.prisma.return?.count({
        where: {
          orderItem: {
            product: { vendorId },
          },
          createdAt: { gte: ninetyDaysAgo },
          status: { in: ['APPROVED', 'COMPLETED'] },
        },
      }).catch(() => 0);

      const returnRate = ((returns || 0) / totalOrders) * 100;

      // Inverse: 0% returns = 100 score, 10%+ returns = 0 score
      const inverseScore = Math.max(0, 100 - (returnRate * 10));
      return Math.round(inverseScore);
    } catch (error) {
      this.logger.error(`Error calculating return rate for vendor ${vendorId}:`, error);
      return 80;
    }
  }

  /**
   * Determine vendor tier based on overall score
   */
  private determineTier(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (score >= TIER_THRESHOLDS.platinum) return 'platinum';
    if (score >= TIER_THRESHOLDS.gold) return 'gold';
    if (score >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  }

  /**
   * Generate recommendations for improving visibility score
   */
  private generateRecommendations(components: VisibilityScoreComponents): string[] {
    const recommendations: string[] = [];

    if (components.productListingCompleteness < 80) {
      recommendations.push('Add more details to product listings including descriptions, specifications, and multiple images');
    }

    if (components.translationCoverage < 50) {
      recommendations.push('Translate product listings to reach more international customers');
    }

    if (components.responseTime < 70) {
      recommendations.push('Respond to customer inquiries faster to improve response time score');
    }

    if (components.reviewRating < 70) {
      recommendations.push('Focus on customer satisfaction to improve product reviews');
    }

    if (components.orderFulfillmentRate < 90) {
      recommendations.push('Improve shipping processes to increase order fulfillment rate');
    }

    if (components.returnRateInverse < 80) {
      recommendations.push('Review return reasons and improve product quality or descriptions to reduce returns');
    }

    return recommendations;
  }

  /**
   * Store score history for analytics
   */
  private async storeScoreHistory(vendorId: string, result: VisibilityScoreResult): Promise<void> {
    try {
      await this.prisma.vendorMetrics?.create({
        data: {
          vendorId,
          metricType: 'VISIBILITY_SCORE',
          value: result.overallScore,
          metadata: {
            components: result.components,
            tier: result.tier,
          },
          recordedAt: new Date(),
        },
      }).catch(() => {
        // VendorMetrics model may not exist
        this.logger.debug('VendorMetrics model not available for history storage');
      });
    } catch {
      // Ignore history storage errors
    }
  }

  /**
   * Get visibility score history for a vendor
   */
  async getScoreHistory(vendorId: string, days: number = 30): Promise<Array<{
    date: Date;
    score: number;
    tier: string;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const history = await this.prisma.vendorMetrics?.findMany({
        where: {
          vendorId,
          metricType: 'VISIBILITY_SCORE',
          recordedAt: { gte: startDate },
        },
        select: {
          recordedAt: true,
          value: true,
          metadata: true,
        },
        orderBy: { recordedAt: 'asc' },
      }).catch(() => []);

      return (history || []).map((h: any) => ({
        date: h.recordedAt,
        score: h.value,
        tier: (h.metadata as any)?.tier || 'bronze',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Bulk calculate visibility scores for all active vendors
   */
  async calculateAllVendorScores(): Promise<void> {
    this.logger.log('Starting bulk visibility score calculation');

    const vendors = await this.prisma.organization.findMany({
      where: {
        type: 'VENDOR',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    let processed = 0;
    for (const vendor of vendors) {
      try {
        await this.calculateVisibilityScore(vendor.id);
        processed++;

        if (processed % 100 === 0) {
          this.logger.log(`Processed ${processed}/${vendors.length} vendors`);
        }
      } catch (error) {
        this.logger.error(`Failed to calculate score for vendor ${vendor.id}:`, error);
      }
    }

    this.logger.log(`Completed visibility score calculation for ${processed} vendors`);
  }

  /**
   * Invalidate cached score for a vendor
   */
  async invalidateVendorScore(vendorId: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}${vendorId}`;
    await this.cacheService.delete(cacheKey);
  }

  /**
   * Get top vendors by visibility score
   */
  async getTopVendors(limit: number = 10): Promise<Array<{
    vendorId: string;
    vendorName: string;
    score: number;
    tier: string;
  }>> {
    try {
      const topVendors = await this.prisma.vendorMetrics?.findMany({
        where: {
          metricType: 'VISIBILITY_SCORE',
        },
        select: {
          vendorId: true,
          value: true,
          metadata: true,
        },
        orderBy: { value: 'desc' },
        take: limit,
        distinct: ['vendorId'],
      }).catch(() => []);

      if (!topVendors || topVendors.length === 0) {
        return [];
      }

      // Get vendor names
      const vendorIds = topVendors.map((v: any) => v.vendorId);
      const vendors = await this.prisma.organization.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true },
      });

      const vendorNameMap = new Map(vendors.map(v => [v.id, v.name]));

      return topVendors.map((v: any) => ({
        vendorId: v.vendorId,
        vendorName: vendorNameMap.get(v.vendorId) || 'Unknown',
        score: v.value,
        tier: (v.metadata as any)?.tier || 'bronze',
      }));
    } catch {
      return [];
    }
  }
}
