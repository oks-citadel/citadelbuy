import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserActionType } from '@prisma/client';

// Action weights for collaborative filtering
const ACTION_WEIGHTS: Record<UserActionType, number> = {
  VIEW: 1,
  CLICK: 2,
  ADD_TO_CART: 5,
  WISHLIST: 4,
  SEARCH: 0.5,
  PURCHASE: 10,
};

// Recommendation types
export enum RecommendationType {
  PERSONALIZED = 'personalized',
  SIMILAR = 'similar',
  TRENDING = 'trending',
  RECENTLY_VIEWED = 'recently_viewed',
  FREQUENTLY_BOUGHT = 'frequently_bought',
  COMPLEMENTARY = 'complementary',
  NEW_ARRIVALS = 'new_arrivals',
  BEST_SELLERS = 'best_sellers',
  FOR_YOU = 'for_you',
}

export interface RecommendationResult {
  products: any[];
  type: RecommendationType;
  score?: number;
  reason?: string;
}

export interface UserPreferenceProfile {
  userId: string;
  favoriteCategories: { categoryId: string; score: number }[];
  priceRange: { min: number; max: number; avg: number };
  preferredBrands: { brand: string; score: number }[];
  interactionHistory: {
    totalViews: number;
    totalPurchases: number;
    totalWishlisted: number;
    avgRating: number;
  };
  lastActive: Date;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // BEHAVIOR TRACKING
  // ============================================

  async trackBehavior(data: {
    userId?: string;
    sessionId?: string;
    productId?: string;
    categoryId?: string;
    actionType: UserActionType;
    searchQuery?: string;
    metadata?: any;
  }) {
    return this.prisma.userBehavior.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        productId: data.productId,
        categoryId: data.categoryId,
        actionType: data.actionType,
        searchQuery: data.searchQuery,
        metadata: data.metadata,
      },
    });
  }

  // ============================================
  // PERSONALIZED RECOMMENDATIONS
  // ============================================

  async getPersonalizedRecommendations(userId: string, limit = 10) {
    // Get user's recent behaviors
    const recentBehaviors = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        actionType: { in: ['VIEW', 'PURCHASE', 'WISHLIST'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (recentBehaviors.length === 0) {
      return this.getTrendingProducts(limit);
    }

    // Get categories user is interested in
    const categoryIds = recentBehaviors
      .map((b) => b.categoryId)
      .filter((id) => id !== null) as string[];

    // Get products user has interacted with
    const productIds = recentBehaviors
      .map((b) => b.productId)
      .filter((id) => id !== null) as string[];

    // Find similar products
    const recommendations = await this.prisma.product.findMany({
      where: {
        id: { notIn: productIds },
        OR: [
          { categoryId: { in: categoryIds } },
          {
            id: {
              in: await this.getSimilarProductIds(productIds, limit),
            },
          },
        ],
      },
      include: {
        category: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      take: limit,
    });

    return recommendations;
  }

  // ============================================
  // PRODUCT-BASED RECOMMENDATIONS
  // ============================================

  async getSimilarProducts(productId: string, limit = 6) {
    // Get pre-computed recommendations
    const precomputed = await this.prisma.productRecommendation.findMany({
      where: {
        productId,
        type: 'SIMILAR',
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    if (precomputed.length > 0) {
      const productIds = precomputed.map((r) => r.recommendedProductId);
      return this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true },
      });
    }

    // Fallback: same category products
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) return [];

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
      },
      include: { category: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFrequentlyBoughtTogether(productId: string, limit = 4) {
    // Find products frequently purchased together
    const ordersWithProduct = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
    });

    const orderIds = ordersWithProduct.map((item) => item.orderId);

    if (orderIds.length === 0) return [];

    // Find other products in these orders
    const coOccurringProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: limit,
    });

    const productIds = coOccurringProducts.map((item) => item.productId);

    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });
  }

  // ============================================
  // CATEGORY & TRENDING
  // ============================================

  async getTrendingProducts(limit = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get most viewed products in last 30 days
    const trending = await this.prisma.userBehavior.groupBy({
      by: ['productId'],
      where: {
        actionType: { in: ['VIEW', 'PURCHASE'] },
        productId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: limit,
    });

    const productIds = trending
      .map((item) => item.productId)
      .filter((id) => id !== null) as string[];

    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
      },
    });
  }

  async getRecommendationsByCategory(categoryId: string, limit = 10) {
    return this.prisma.product.findMany({
      where: { categoryId },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============================================
  // RECENTLY VIEWED
  // ============================================

  async getRecentlyViewed(userId: string, limit = 10) {
    const recentViews = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        actionType: 'VIEW',
        productId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['productId'],
      take: limit,
    });

    const productIds = recentViews
      .map((view) => view.productId)
      .filter((id) => id !== null) as string[];

    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });
  }

  // ============================================
  // PRE-COMPUTATION & ML INTEGRATION
  // ============================================

  async computeProductRecommendations(productId: string) {
    // Compute similar products based on co-occurrence
    const similar = await this.findSimilarByCoOccurrence(productId);

    // Store recommendations
    const recommendations = similar.map((item) => ({
      productId,
      recommendedProductId: item.id,
      score: item.score,
      type: 'SIMILAR',
    }));

    // Upsert recommendations
    for (const rec of recommendations) {
      await this.prisma.productRecommendation.upsert({
        where: {
          productId_recommendedProductId_type: {
            productId: rec.productId,
            recommendedProductId: rec.recommendedProductId,
            type: rec.type,
          },
        },
        update: { score: rec.score },
        create: rec,
      });
    }

    return recommendations;
  }

  private async findSimilarByCoOccurrence(productId: string) {
    // Find products that appear in same orders
    const ordersWithProduct = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
    });

    const orderIds = ordersWithProduct.map((item) => item.orderId);

    if (orderIds.length === 0) return [];

    const coOccurring = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: 20,
    });

    // Calculate similarity score
    const maxCount = coOccurring[0]?._count.productId || 1;

    return coOccurring.map((item) => ({
      id: item.productId,
      score: item._count.productId / maxCount,
    }));
  }

  private async getSimilarProductIds(productIds: string[], limit: number): Promise<string[]> {
    const recommendations = await this.prisma.productRecommendation.findMany({
      where: {
        productId: { in: productIds },
        type: 'SIMILAR',
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return recommendations.map((r) => r.recommendedProductId);
  }

  // ============================================
  // BATCH PROCESSING
  // ============================================

  async recomputeAllRecommendations() {
    const products = await this.prisma.product.findMany({
      select: { id: true },
    });

    let processed = 0;
    for (const product of products) {
      await this.computeProductRecommendations(product.id);
      processed++;
    }

    return { processed };
  }

  // ============================================
  // ADVANCED PERSONALIZED RECOMMENDATIONS
  // ============================================

  /**
   * Build a user preference profile based on behavior history
   */
  async buildUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get all user behaviors
    // Note: behaviors don't have direct product relation in current schema
    // We'll work with productIds
    const behaviors = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        createdAt: { gte: ninetyDaysAgo },
      },
    });

    // Get products the user has interacted with
    const productIds = behaviors
      .map((b) => b.productId)
      .filter((id): id is string => id !== null);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        categoryId: true,
        price: true,
        vendorId: true,
      },
    });

    // Build category preferences with weighted scoring
    const categoryScores = new Map<string, number>();
    const prices: number[] = [];

    for (const product of products) {
      const relatedBehaviors = behaviors.filter((b) => b.productId === product.id);
      let score = 0;

      for (const behavior of relatedBehaviors) {
        score += ACTION_WEIGHTS[behavior.actionType] || 1;
      }

      const currentScore = categoryScores.get(product.categoryId) || 0;
      categoryScores.set(product.categoryId, currentScore + score);
      prices.push(product.price);
    }

    // Calculate price range
    const sortedPrices = prices.sort((a, b) => a - b);
    const priceRange = {
      min: sortedPrices[Math.floor(sortedPrices.length * 0.1)] || 0,
      max: sortedPrices[Math.floor(sortedPrices.length * 0.9)] || 1000,
      avg: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    };

    // Get user's reviews for average rating
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      select: { rating: true },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Get purchase count
    const orderCount = await this.prisma.orderItem.count({
      where: {
        order: { userId },
      },
    });

    // Format category scores
    const favoriteCategories = Array.from(categoryScores.entries())
      .map(([categoryId, score]) => ({ categoryId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      userId,
      favoriteCategories,
      priceRange,
      preferredBrands: [], // Can be extended with vendor data
      interactionHistory: {
        totalViews: behaviors.filter((b) => b.actionType === 'VIEW').length,
        totalPurchases: orderCount,
        totalWishlisted: behaviors.filter((b) => b.actionType === 'WISHLIST').length,
        avgRating,
      },
      lastActive: behaviors[0]?.createdAt || new Date(),
    };
  }

  /**
   * Get comprehensive personalized recommendations using collaborative filtering
   */
  async getCollaborativeFilteringRecommendations(
    userId: string,
    limit = 20,
  ): Promise<RecommendationResult> {
    // Build user profile
    const profile = await this.buildUserPreferenceProfile(userId);

    // Find similar users based on behavior patterns
    const similarUserIds = await this.findSimilarUsers(userId, profile);

    if (similarUserIds.length === 0) {
      // Fallback to content-based recommendations
      return this.getContentBasedRecommendations(userId, profile, limit);
    }

    // Get products similar users liked but current user hasn't seen
    const userProductIds = await this.getUserInteractedProductIds(userId);

    const recommendedProducts = await this.prisma.userBehavior.groupBy({
      by: ['productId'],
      where: {
        userId: { in: similarUserIds },
        productId: { not: null, notIn: userProductIds },
        actionType: { in: ['PURCHASE', 'WISHLIST', 'ADD_TO_CART'] },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: limit,
    });

    const productIds = recommendedProducts
      .map((r) => r.productId)
      .filter((id): id is string => id !== null);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      products,
      type: RecommendationType.FOR_YOU,
      reason: 'Based on users with similar interests',
    };
  }

  /**
   * Find users with similar behavior patterns
   */
  private async findSimilarUsers(userId: string, profile: UserPreferenceProfile): Promise<string[]> {
    // Get users who interact with same categories
    const categoryIds = profile.favoriteCategories.slice(0, 5).map((c) => c.categoryId);

    if (categoryIds.length === 0) return [];

    const similarUsers = await this.prisma.userBehavior.groupBy({
      by: ['userId'],
      where: {
        categoryId: { in: categoryIds },
        userId: { not: userId, notIn: [null as unknown as string] },
        actionType: { in: ['PURCHASE', 'WISHLIST', 'ADD_TO_CART'] },
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 50,
    });

    return similarUsers
      .map((u) => u.userId)
      .filter((id): id is string => id !== null);
  }

  /**
   * Content-based recommendations using user profile
   */
  private async getContentBasedRecommendations(
    userId: string,
    profile: UserPreferenceProfile,
    limit: number,
  ): Promise<RecommendationResult> {
    const userProductIds = await this.getUserInteractedProductIds(userId);
    const categoryIds = profile.favoriteCategories.slice(0, 3).map((c) => c.categoryId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { notIn: userProductIds },
        categoryId: { in: categoryIds },
        price: {
          gte: profile.priceRange.min * 0.5,
          lte: profile.priceRange.max * 1.5,
        },
      },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      products,
      type: RecommendationType.PERSONALIZED,
      reason: 'Based on your browsing history and preferences',
    };
  }

  /**
   * Get products user has already interacted with
   */
  private async getUserInteractedProductIds(userId: string): Promise<string[]> {
    const behaviors = await this.prisma.userBehavior.findMany({
      where: { userId, productId: { not: null } },
      select: { productId: true },
      distinct: ['productId'],
    });

    return behaviors
      .map((b) => b.productId)
      .filter((id): id is string => id !== null);
  }

  // ============================================
  // HOMEPAGE WIDGET RECOMMENDATIONS
  // ============================================

  /**
   * Get all recommendation sections for homepage
   */
  async getHomepageRecommendations(userId?: string, sessionId?: string) {
    const sections: {
      id: string;
      title: string;
      subtitle?: string;
      type: RecommendationType;
      products: any[];
    }[] = [];

    // Personalized "For You" section (if user is logged in)
    if (userId) {
      const forYou = await this.getCollaborativeFilteringRecommendations(userId, 12);
      if (forYou.products.length > 0) {
        sections.push({
          id: 'for-you',
          title: 'Recommended For You',
          subtitle: forYou.reason,
          type: RecommendationType.FOR_YOU,
          products: forYou.products,
        });
      }

      // Recently Viewed
      const recentlyViewed = await this.getRecentlyViewed(userId, 8);
      if (recentlyViewed.length > 0) {
        sections.push({
          id: 'recently-viewed',
          title: 'Recently Viewed',
          type: RecommendationType.RECENTLY_VIEWED,
          products: recentlyViewed,
        });
      }
    }

    // Trending Now
    const trending = await this.getTrendingProducts(12);
    if (trending.length > 0) {
      sections.push({
        id: 'trending',
        title: 'Trending Now',
        subtitle: 'Popular products this week',
        type: RecommendationType.TRENDING,
        products: trending,
      });
    }

    // New Arrivals
    const newArrivals = await this.getNewArrivals(12);
    if (newArrivals.length > 0) {
      sections.push({
        id: 'new-arrivals',
        title: 'New Arrivals',
        subtitle: 'Fresh finds just added',
        type: RecommendationType.NEW_ARRIVALS,
        products: newArrivals,
      });
    }

    // Best Sellers
    const bestSellers = await this.getBestSellers(12);
    if (bestSellers.length > 0) {
      sections.push({
        id: 'best-sellers',
        title: 'Best Sellers',
        subtitle: 'Customer favorites',
        type: RecommendationType.BEST_SELLERS,
        products: bestSellers,
      });
    }

    return sections;
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit = 12) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.product.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        stock: { gt: 0 },
      },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get best selling products
   */
  async getBestSellers(limit = 12) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topSelling = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] },
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: limit,
    });

    const productIds = topSelling.map((item) => item.productId);

    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        reviews: {
          select: { rating: true },
        },
      },
    });
  }

  // ============================================
  // PRODUCT PAGE RECOMMENDATIONS
  // ============================================

  /**
   * Get all recommendations for a product page
   */
  async getProductPageRecommendations(
    productId: string,
    userId?: string,
  ) {
    const [similar, frequentlyBought, complementary] = await Promise.all([
      this.getSimilarProducts(productId, 6),
      this.getFrequentlyBoughtTogether(productId, 4),
      this.getComplementaryProducts(productId, 6),
    ]);

    const sections = [
      {
        id: 'similar',
        title: 'Similar Products',
        type: RecommendationType.SIMILAR,
        products: similar,
      },
    ];

    if (frequentlyBought.length > 0) {
      sections.push({
        id: 'frequently-bought',
        title: 'Frequently Bought Together',
        type: RecommendationType.FREQUENTLY_BOUGHT,
        products: frequentlyBought,
      });
    }

    if (complementary.length > 0) {
      sections.push({
        id: 'complementary',
        title: 'Complete the Look',
        type: RecommendationType.COMPLEMENTARY,
        products: complementary,
      });
    }

    return sections;
  }

  /**
   * Get complementary products (different category but often bought together)
   */
  async getComplementaryProducts(productId: string, limit = 6) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (!product) return [];

    // Find products from different categories that are bought together
    const ordersWithProduct = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      take: 100,
    });

    const orderIds = ordersWithProduct.map((item) => item.orderId);

    if (orderIds.length === 0) return [];

    const complementary = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
        product: {
          categoryId: { not: product.categoryId },
        },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: limit,
    });

    const productIds = complementary.map((item) => item.productId);

    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });
  }

  // ============================================
  // CART PAGE RECOMMENDATIONS
  // ============================================

  /**
   * Get recommendations based on cart contents
   */
  async getCartRecommendations(cartProductIds: string[], userId?: string, limit = 8) {
    if (cartProductIds.length === 0) {
      return this.getTrendingProducts(limit);
    }

    // Get complementary products for items in cart
    const complementaryPromises = cartProductIds.map((id) =>
      this.getComplementaryProducts(id, 3),
    );

    const complementaryResults = await Promise.all(complementaryPromises);
    const complementaryProducts = complementaryResults.flat();

    // Remove duplicates and items already in cart
    const uniqueProducts = complementaryProducts.filter(
      (product, index, self) =>
        !cartProductIds.includes(product.id) &&
        self.findIndex((p) => p.id === product.id) === index,
    );

    // If not enough, add frequently bought together
    if (uniqueProducts.length < limit) {
      const fbtPromises = cartProductIds.map((id) =>
        this.getFrequentlyBoughtTogether(id, 2),
      );

      const fbtResults = await Promise.all(fbtPromises);
      const fbtProducts = fbtResults.flat();

      for (const product of fbtProducts) {
        if (
          uniqueProducts.length < limit &&
          !cartProductIds.includes(product.id) &&
          !uniqueProducts.find((p) => p.id === product.id)
        ) {
          uniqueProducts.push(product);
        }
      }
    }

    return uniqueProducts.slice(0, limit);
  }

  // ============================================
  // ANALYTICS & INSIGHTS
  // ============================================

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get click-through rates from recommendations
    const recommendationClicks = await this.prisma.productView.count({
      where: {
        ...where,
        source: 'recommendation',
      },
    });

    const totalViews = await this.prisma.productView.count({ where });

    // Get conversion rate from recommendation clicks
    const recommendationPurchases = await this.prisma.userBehavior.count({
      where: {
        ...where,
        actionType: 'PURCHASE',
        metadata: {
          path: ['source'],
          equals: 'recommendation',
        },
      },
    });

    return {
      totalRecommendationClicks: recommendationClicks,
      totalProductViews: totalViews,
      clickThroughRate: totalViews > 0 ? (recommendationClicks / totalViews) * 100 : 0,
      conversionRate: recommendationClicks > 0
        ? (recommendationPurchases / recommendationClicks) * 100
        : 0,
      recommendationPurchases,
    };
  }

  /**
   * Log recommendation event for analytics
   */
  async logRecommendationEvent(
    productId: string,
    userId?: string,
    sessionId?: string,
    recommendationType?: string,
    position?: number,
  ) {
    return this.prisma.productView.create({
      data: {
        productId,
        userId,
        sessionId,
        source: 'recommendation',
        metadata: {
          recommendationType,
          position,
        },
      },
    });
  }

  // ============================================
  // SCHEDULED JOBS SUPPORT
  // ============================================

  /**
   * Precompute recommendations for all products (for cron job)
   */
  async precomputeRecommendations(batchSize = 100) {
    let processed = 0;
    let offset = 0;

    while (true) {
      const products = await this.prisma.product.findMany({
        select: { id: true },
        skip: offset,
        take: batchSize,
      });

      if (products.length === 0) break;

      for (const product of products) {
        try {
          await this.computeProductRecommendations(product.id);
          processed++;
        } catch (error) {
          this.logger.error(`Failed to compute recommendations for product ${product.id}`, error);
        }
      }

      offset += batchSize;
      this.logger.log(`Processed ${processed} products for recommendations`);
    }

    return { processed };
  }

  /**
   * Clean up old behavior data (for cron job)
   */
  async cleanupOldBehaviorData(daysToKeep = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.userBehavior.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }
}
