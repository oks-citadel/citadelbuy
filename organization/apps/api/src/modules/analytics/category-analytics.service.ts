import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CategoryAnalyticsQueryDto,
  CategoryPerformanceDto,
  CategoryFunnelDto,
  CategoryComparisonDto,
  TrackCategoryEventDto,
  CategoryEventType,
} from './dto/category-analytics.dto';
import { TimeRange } from './dto/analytics-query.dto';

@Injectable()
export class CategoryAnalyticsService {
  private readonly logger = new Logger(CategoryAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get date range based on query
   */
  private getDateRange(query: CategoryAnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (query.range) {
      case TimeRange.TODAY:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case TimeRange.WEEK:
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case TimeRange.QUARTER:
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case TimeRange.YEAR:
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case TimeRange.CUSTOM:
        startDate = query.startDate ? new Date(query.startDate) : new Date(now.setMonth(now.getMonth() - 1));
        endDate = query.endDate ? new Date(query.endDate) : new Date();
        break;
      case TimeRange.MONTH:
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Track category event (view, click, etc.)
   */
  async trackEvent(dto: TrackCategoryEventDto, request?: any): Promise<void> {
    try {
      const ipAddress = request ? this.getClientIp(request) : null;
      const userAgent = request ? request.headers['user-agent'] : null;
      const referer = request ? request.headers['referer'] : null;

      switch (dto.eventType) {
        case CategoryEventType.VIEW:
          await this.trackCategoryView(dto, ipAddress, userAgent, referer);
          break;

        case CategoryEventType.PRODUCT_CLICK:
          await this.trackProductClick(dto);
          break;

        case CategoryEventType.FILTER_APPLIED:
        case CategoryEventType.SORT_CHANGED:
          // These can be tracked in application logs or separate analytics
          this.logger.log(`${dto.eventType} event tracked for category ${dto.categoryId}`);
          break;

        case CategoryEventType.ADD_TO_CART:
        case CategoryEventType.PURCHASE:
          // These are typically tracked through order/cart services
          this.logger.log(`${dto.eventType} event tracked for category ${dto.categoryId}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to track category event: ${error.message}`, error.stack);
    }
  }

  /**
   * Track category view
   */
  private async trackCategoryView(
    dto: TrackCategoryEventDto,
    ipAddress: string | null,
    userAgent: string | null,
    referer: string | null,
  ): Promise<void> {
    await this.prisma.categoryView.create({
      data: {
        categoryId: dto.categoryId,
        userId: dto.userId || null,
        sessionId: dto.sessionId,
        ipAddress,
        userAgent,
        referer,
      },
    });
  }

  /**
   * Track product click within category
   */
  private async trackProductClick(dto: TrackCategoryEventDto): Promise<void> {
    if (!dto.productId) {
      this.logger.warn('Product click tracked without product ID');
      return;
    }

    // Track product view (product impression)
    await this.prisma.productView.create({
      data: {
        productId: dto.productId,
        userId: dto.userId || null,
        sessionId: dto.sessionId,
        source: 'category',
        metadata: {
          categoryId: dto.categoryId,
          ...dto.metadata,
        },
      },
    });
  }

  /**
   * Get comprehensive category performance analytics
   */
  async getCategoryPerformance(
    categoryId: string,
    query: CategoryAnalyticsQueryDto,
  ): Promise<CategoryPerformanceDto> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get category info
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Get views and unique visitors
    const [views, uniqueVisitors] = await Promise.all([
      this.prisma.categoryView.count({
        where: {
          categoryId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.categoryView.groupBy({
        by: ['sessionId'],
        where: {
          categoryId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Get product impressions (views) from category
    const productImpressions = await this.prisma.productView.count({
      where: {
        product: { categoryId },
        createdAt: { gte: startDate, lte: endDate },
        source: 'category',
      },
    });

    // Get product clicks (distinct products viewed)
    const productClicks = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: {
        product: { categoryId },
        createdAt: { gte: startDate, lte: endDate },
        source: 'category',
      },
    });

    // Get cart additions from this category
    const cartAdditions = await this.prisma.cartItem.count({
      where: {
        product: { categoryId },
        cart: {
          updatedAt: { gte: startDate, lte: endDate },
        },
      },
    });

    // Get orders and revenue
    const orders = await this.prisma.orderItem.findMany({
      where: {
        product: { categoryId },
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      include: {
        order: {
          select: { total: true },
        },
      },
    });

    const purchaseCount = orders.length;
    const totalRevenue = orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const averageOrderValue = purchaseCount > 0 ? totalRevenue / purchaseCount : 0;

    // Calculate rates
    const clickThroughRate = productImpressions > 0 ? (productClicks.length / productImpressions) * 100 : 0;
    const conversionRate = views > 0 ? (purchaseCount / views) * 100 : 0;

    return {
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      totalViews: views,
      uniqueVisitors: uniqueVisitors.length,
      productImpressions,
      productClicks: productClicks.length,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      addToCartCount: cartAdditions,
      purchaseCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };
  }

  /**
   * Get category conversion funnel
   */
  async getCategoryFunnel(
    categoryId: string,
    query: CategoryAnalyticsQueryDto,
  ): Promise<CategoryFunnelDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Get funnel metrics
    const [views, productClicks, addToCarts, purchases] = await Promise.all([
      this.prisma.categoryView.count({
        where: {
          categoryId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.productView.count({
        where: {
          product: { categoryId },
          createdAt: { gte: startDate, lte: endDate },
          source: 'category',
        },
      }),
      this.prisma.cartItem.count({
        where: {
          product: { categoryId },
          cart: {
            updatedAt: { gte: startDate, lte: endDate },
          },
        },
      }),
      this.prisma.orderItem.count({
        where: {
          product: { categoryId },
          order: {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
          },
        },
      }),
    ]);

    // Calculate conversion rates
    const viewToClickRate = views > 0 ? (productClicks / views) * 100 : 0;
    const clickToCartRate = productClicks > 0 ? (addToCarts / productClicks) * 100 : 0;
    const cartToPurchaseRate = addToCarts > 0 ? (purchases / addToCarts) * 100 : 0;
    const overallConversionRate = views > 0 ? (purchases / views) * 100 : 0;

    // Calculate drop-offs
    const viewDropOff = views > 0 ? ((views - productClicks) / views) * 100 : 0;
    const clickDropOff = productClicks > 0 ? ((productClicks - addToCarts) / productClicks) * 100 : 0;
    const cartDropOff = addToCarts > 0 ? ((addToCarts - purchases) / addToCarts) * 100 : 0;

    return {
      categoryId,
      categoryName: category.name,
      views,
      productClicks,
      addToCarts,
      purchases,
      viewToClickRate: Math.round(viewToClickRate * 100) / 100,
      clickToCartRate: Math.round(clickToCartRate * 100) / 100,
      cartToPurchaseRate: Math.round(cartToPurchaseRate * 100) / 100,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      viewDropOff: Math.round(viewDropOff * 100) / 100,
      clickDropOff: Math.round(clickDropOff * 100) / 100,
      cartDropOff: Math.round(cartDropOff * 100) / 100,
    };
  }

  /**
   * Get all categories comparison
   */
  async getCategoryComparison(query: CategoryAnalyticsQueryDto): Promise<CategoryComparisonDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    // Get all categories
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      take: limit,
    });

    // Get metrics for each category
    const categoryMetrics = await Promise.all(
      categories.map(async (category) => {
        const [views, orders] = await Promise.all([
          this.prisma.categoryView.count({
            where: {
              categoryId: category.id,
              createdAt: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.orderItem.findMany({
            where: {
              product: { categoryId: category.id },
              order: {
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
              },
            },
            select: {
              quantity: true,
              price: true,
            },
          }),
        ]);

        const conversions = orders.length;
        const revenue = orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const conversionRate = views > 0 ? (conversions / views) * 100 : 0;
        const averageOrderValue = conversions > 0 ? revenue / conversions : 0;

        return {
          categoryId: category.id,
          categoryName: category.name,
          views,
          conversions,
          revenue: Math.round(revenue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        };
      }),
    );

    // Sort by revenue
    categoryMetrics.sort((a, b) => b.revenue - a.revenue);

    // Find top and bottom performers
    const topPerformer = categoryMetrics[0]?.categoryName || 'N/A';
    const bottomPerformer = categoryMetrics[categoryMetrics.length - 1]?.categoryName || 'N/A';

    // Calculate average conversion rate
    const totalConversionRate = categoryMetrics.reduce((sum, cat) => sum + cat.conversionRate, 0);
    const averageConversionRate = categoryMetrics.length > 0
      ? Math.round((totalConversionRate / categoryMetrics.length) * 100) / 100
      : 0;

    return {
      categories: categoryMetrics,
      topPerformer,
      bottomPerformer,
      averageConversionRate,
    };
  }

  /**
   * Get trending categories by views
   */
  async getTrendingCategories(query: CategoryAnalyticsQueryDto): Promise<any[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    const categoryViews = await this.prisma.categoryView.groupBy({
      by: ['categoryId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Get category details
    const categoriesWithDetails = await Promise.all(
      categoryViews.map(async (view) => {
        const category = await this.prisma.category.findUnique({
          where: { id: view.categoryId },
          select: { id: true, name: true, slug: true },
        });

        return {
          categoryId: view.categoryId,
          categoryName: category?.name || 'Unknown',
          categorySlug: category?.slug || '',
          views: view._count.id,
        };
      }),
    );

    return categoriesWithDetails;
  }

  /**
   * Get category time-series data
   */
  async getCategoryTimeSeries(categoryId: string, query: CategoryAnalyticsQueryDto): Promise<any[]> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get daily views
    const views = await this.prisma.categoryView.findMany({
      where: {
        categoryId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const dailyData = views.reduce((acc, view) => {
      const date = view.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, views: 0 };
      }
      acc[date].views += 1;
      return acc;
    }, {} as Record<string, { date: string; views: number }>);

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      ''
    );
  }

  /**
   * Aggregate category analytics for reporting
   * This should be run periodically (e.g., daily) to populate CategoryAnalytics table
   */
  async aggregateCategoryAnalytics(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    this.logger.log(`Aggregating category analytics for ${startOfDay.toISOString()}`);

    // Get all active categories
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const category of categories) {
      try {
        const [views, searches, orders] = await Promise.all([
          // Count views
          this.prisma.categoryView.count({
            where: {
              categoryId: category.id,
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),

          // Count searches (if tracked) - use product category filter
          this.prisma.searchQuery.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),

          // Get orders
          this.prisma.orderItem.findMany({
            where: {
              product: { categoryId: category.id },
              order: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
              },
            },
            select: {
              quantity: true,
              price: true,
            },
          }),
        ]);

        const totalOrders = orders.length;
        const totalUnits = orders.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = orders.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const conversionRate = views > 0 ? (totalOrders / views) * 100 : 0;

        // Get product counts
        const totalProducts = await this.prisma.product.count({
          where: { categoryId: category.id },
        });
        const activeProducts = await this.prisma.product.count({
          where: { categoryId: category.id, isActive: true },
        });

        // Upsert analytics record
        await this.prisma.categoryAnalytics.upsert({
          where: {
            categoryId_period_date: {
              categoryId: category.id,
              period: 'DAILY',
              date: startOfDay,
            },
          },
          create: {
            categoryId: category.id,
            period: 'DAILY',
            date: startOfDay,
            totalRevenue,
            totalOrders,
            totalUnits,
            totalProducts,
            activeProducts,
            views,
            searches,
            conversionRate: Math.round(conversionRate * 100) / 100,
          },
          update: {
            totalRevenue,
            totalOrders,
            totalUnits,
            totalProducts,
            activeProducts,
            views,
            searches,
            conversionRate: Math.round(conversionRate * 100) / 100,
          },
        });

        this.logger.log(`Aggregated analytics for category ${category.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to aggregate analytics for category ${category.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('Category analytics aggregation completed');
  }
}
