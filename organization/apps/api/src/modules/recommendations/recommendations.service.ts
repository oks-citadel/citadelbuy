import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserActionType } from '@prisma/client';

@Injectable()
export class RecommendationsService {
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
}
