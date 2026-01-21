import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AnalyticsPeriod } from '@prisma/client';

@Injectable()
export class AnalyticsDashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get vendor overview analytics
   */
  async getVendorOverview(vendorId: string, startDate: Date, endDate: Date) {
    const analytics = await this.prisma.vendorAnalytics.findMany({
      where: {
        vendorId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const totals = analytics.reduce(
      (acc, curr) => ({
        totalRevenue: acc.totalRevenue + curr.totalRevenue,
        totalOrders: acc.totalOrders + curr.totalOrders,
        totalViews: acc.totalViews + curr.totalViews,
        totalUnits: acc.totalUnits + curr.totalUnits,
        adSpend: acc.adSpend + curr.adSpend,
        adConversions: acc.adConversions + curr.adConversions,
      }),
      {
        totalRevenue: 0,
        totalOrders: 0,
        totalViews: 0,
        totalUnits: 0,
        adSpend: 0,
        adConversions: 0,
      }
    );

    const avgConversionRate =
      analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length || 0;
    const avgOrderValue = totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0;

    return {
      ...totals,
      averageOrderValue: avgOrderValue,
      averageConversionRate: avgConversionRate,
      timeSeriesData: analytics,
    };
  }

  /**
   * Get vendor sales analytics
   */
  async getVendorSales(vendorId: string, startDate: Date, endDate: Date, period: AnalyticsPeriod = AnalyticsPeriod.DAILY) {
    return this.prisma.vendorAnalytics.findMany({
      where: {
        vendorId,
        period,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        totalRevenue: true,
        totalOrders: true,
        averageOrderValue: true,
        totalUnits: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Get vendor product performance
   */
  async getVendorProductPerformance(vendorId: string, startDate: Date, endDate: Date, limit: number = 10) {
    const products = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true, name: true, slug: true, price: true, images: true },
    });

    const productIds = products.map((p) => p.id);

    const analytics = await this.prisma.productAnalytics.findMany({
      where: {
        productId: { in: productIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        productId: true,
        views: true,
        purchases: true,
        revenue: true,
        addToCart: true,
      },
    });

    // Aggregate by product
    const productMap = new Map();
    analytics.forEach((a) => {
      const existing = productMap.get(a.productId) || {
        views: 0,
        purchases: 0,
        revenue: 0,
        addToCart: 0,
      };
      productMap.set(a.productId, {
        views: existing.views + a.views,
        purchases: existing.purchases + a.purchases,
        revenue: existing.revenue + a.revenue,
        addToCart: existing.addToCart + a.addToCart,
      });
    });

    // Combine with product info
    const results = products.map((product) => {
      const stats = productMap.get(product.id) || {
        views: 0,
        purchases: 0,
        revenue: 0,
        addToCart: 0,
      };
      return {
        ...product,
        ...stats,
        conversionRate: stats.views > 0 ? (stats.purchases / stats.views) * 100 : 0,
      };
    });

    // Sort by revenue and limit
    return results.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }

  /**
   * Get product analytics details
   */
  async getProductAnalytics(productId: string, startDate: Date, endDate: Date, period: AnalyticsPeriod = AnalyticsPeriod.DAILY) {
    const analytics = await this.prisma.productAnalytics.findMany({
      where: {
        productId,
        period,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const totals = analytics.reduce(
      (acc, curr) => ({
        views: acc.views + curr.views,
        uniqueViews: acc.uniqueViews + curr.uniqueViews,
        addToCart: acc.addToCart + curr.addToCart,
        purchases: acc.purchases + curr.purchases,
        revenue: acc.revenue + curr.revenue,
      }),
      { views: 0, uniqueViews: 0, addToCart: 0, purchases: 0, revenue: 0 }
    );

    const conversionRate = totals.views > 0 ? (totals.purchases / totals.views) * 100 : 0;
    const cartConversion = totals.addToCart > 0 ? (totals.purchases / totals.addToCart) * 100 : 0;

    return {
      ...totals,
      conversionRate,
      cartConversion,
      timeSeriesData: analytics,
    };
  }

  /**
   * Get revenue breakdown
   */
  async getRevenueBreakdown(startDate: Date, endDate: Date) {
    const analytics = await this.prisma.revenueAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return analytics.reduce(
      (acc, curr) => ({
        productRevenue: acc.productRevenue + curr.productRevenue,
        subscriptionRevenue: acc.subscriptionRevenue + curr.subscriptionRevenue,
        adRevenue: acc.adRevenue + curr.adRevenue,
        bnplRevenue: acc.bnplRevenue + curr.bnplRevenue,
        platformFees: acc.platformFees + curr.platformFees,
        paymentFees: acc.paymentFees + curr.paymentFees,
        grossRevenue: acc.grossRevenue + curr.grossRevenue,
        netRevenue: acc.netRevenue + curr.netRevenue,
        totalOrders: acc.totalOrders + curr.totalOrders,
        completedOrders: acc.completedOrders + curr.completedOrders,
        cancelledOrders: acc.cancelledOrders + curr.cancelledOrders,
        totalRefunds: acc.totalRefunds + curr.totalRefunds,
      }),
      {
        productRevenue: 0,
        subscriptionRevenue: 0,
        adRevenue: 0,
        bnplRevenue: 0,
        platformFees: 0,
        paymentFees: 0,
        grossRevenue: 0,
        netRevenue: 0,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRefunds: 0,
      }
    );
  }

  /**
   * Get traffic analytics
   */
  async getTrafficAnalytics(startDate: Date, endDate: Date, period: AnalyticsPeriod = AnalyticsPeriod.DAILY) {
    return this.prisma.trafficAnalytics.findMany({
      where: {
        period,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Get category analytics
   */
  async getCategoryAnalytics(startDate: Date, endDate: Date) {
    const analytics = await this.prisma.categoryAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Aggregate by category
    const categoryMap = new Map();
    analytics.forEach((a) => {
      const existing = categoryMap.get(a.categoryId) || {
        totalRevenue: 0,
        totalOrders: 0,
        totalUnits: 0,
        views: 0,
        searches: 0,
      };
      categoryMap.set(a.categoryId, {
        category: a.category,
        totalRevenue: existing.totalRevenue + a.totalRevenue,
        totalOrders: existing.totalOrders + a.totalOrders,
        totalUnits: existing.totalUnits + a.totalUnits,
        views: existing.views + a.views,
        searches: existing.searches + a.searches,
      });
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get real-time dashboard metrics (not pre-aggregated)
   */
  async getRealTimeDashboard(vendorId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's orders
    const todayOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: today },
        ...(vendorId && {
          items: {
            some: {
              product: {
                vendorId,
              },
            },
          },
        }),
      },
    });

    // Today's revenue
    const todayRevenue = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' },
        ...(vendorId && {
          items: {
            some: {
              product: {
                vendorId,
              },
            },
          },
        }),
      },
      _sum: {
        total: true,
      },
    });

    // Active products
    const activeProducts = await this.prisma.product.count({
      where: {
        ...(vendorId && { vendorId }),
        stock: { gt: 0 },
      },
    });

    // Low stock products
    const lowStockProducts = await this.prisma.product.count({
      where: {
        ...(vendorId && { vendorId }),
        stock: { lte: 10, gt: 0 },
      },
    });

    // Out of stock products
    const outOfStock = await this.prisma.product.count({
      where: {
        ...(vendorId && { vendorId }),
        stock: 0,
      },
    });

    // Pending orders
    const pendingOrders = await this.prisma.order.count({
      where: {
        status: 'PENDING',
        ...(vendorId && {
          items: {
            some: {
              product: {
                vendorId,
              },
            },
          },
        }),
      },
    });

    return {
      todayOrders,
      todayRevenue: todayRevenue._sum.total || 0,
      activeProducts,
      lowStockProducts,
      outOfStock,
      pendingOrders,
    };
  }

  /**
   * Get comparison data (current vs previous period)
   */
  async getComparisonData(vendorId: string, startDate: Date, endDate: Date) {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    const prevEndDate = new Date(startDate);

    const [current, previous] = await Promise.all([
      this.getVendorOverview(vendorId, startDate, endDate),
      this.getVendorOverview(vendorId, prevStartDate, prevEndDate),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current,
      previous,
      changes: {
        revenue: calculateChange(current.totalRevenue, previous.totalRevenue),
        orders: calculateChange(current.totalOrders, previous.totalOrders),
        views: calculateChange(current.totalViews, previous.totalViews),
        conversionRate: calculateChange(current.averageConversionRate, previous.averageConversionRate),
      },
    };
  }

  /**
   * Aggregate daily analytics (to be run via cron)
   */
  async aggregateDailyAnalytics(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all vendors
    const vendors = await this.prisma.user.findMany({
      where: { role: 'VENDOR' },
      select: { id: true },
    });

    // Aggregate for each vendor
    for (const vendor of vendors) {
      await this.aggregateVendorAnalytics(vendor.id, startOfDay, endOfDay);
    }

    // Aggregate revenue analytics
    await this.aggregateRevenueAnalytics(startOfDay, endOfDay);

    // Aggregate traffic analytics
    await this.aggregateTrafficAnalytics(startOfDay, endOfDay);
  }

  private async aggregateVendorAnalytics(vendorId: string, startDate: Date, endDate: Date) {
    // Get orders for vendor
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        items: {
          some: {
            product: {
              vendorId,
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const vendorOrders = orders.filter((order) =>
      order.items.some((item) => item.product?.vendorId === vendorId)
    );

    const totalRevenue = vendorOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = vendorOrders.length;
    const totalUnits = vendorOrders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0
    );

    // Get product metrics
    const products = await this.prisma.product.count({
      where: { vendorId },
    });

    const activeProducts = await this.prisma.product.count({
      where: { vendorId, stock: { gt: 0 } },
    });

    const outOfStock = await this.prisma.product.count({
      where: { vendorId, stock: 0 },
    });

    // Get views
    const views = await this.prisma.productView.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        product: {
          vendorId,
        },
      },
    });

    // Upsert analytics
    await this.prisma.vendorAnalytics.upsert({
      where: {
        vendorId_period_date: {
          vendorId,
          period: AnalyticsPeriod.DAILY,
          date: startDate,
        },
      },
      create: {
        vendorId,
        period: AnalyticsPeriod.DAILY,
        date: startDate,
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalUnits,
        totalProducts: products,
        activeProducts,
        outOfStock,
        totalViews: views,
        conversionRate: views > 0 ? (totalOrders / views) * 100 : 0,
      },
      update: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalUnits,
        totalProducts: products,
        activeProducts,
        outOfStock,
        totalViews: views,
        conversionRate: views > 0 ? (totalOrders / views) * 100 : 0,
      },
    });
  }

  private async aggregateRevenueAnalytics(startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const productRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    await this.prisma.revenueAnalytics.upsert({
      where: {
        period_date: {
          period: AnalyticsPeriod.DAILY,
          date: startDate,
        },
      },
      create: {
        period: AnalyticsPeriod.DAILY,
        date: startDate,
        productRevenue,
        grossRevenue: productRevenue,
        netRevenue: productRevenue,
        totalOrders: orders.length,
        completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
        cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      },
      update: {
        productRevenue,
        grossRevenue: productRevenue,
        netRevenue: productRevenue,
        totalOrders: orders.length,
        completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
        cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      },
    });
  }

  private async aggregateTrafficAnalytics(startDate: Date, endDate: Date) {
    const views = await this.prisma.productView.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const uniqueVisitors = await this.prisma.productView.groupBy({
      by: ['sessionId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        sessionId: { not: null },
      },
    });

    await this.prisma.trafficAnalytics.upsert({
      where: {
        period_date: {
          period: AnalyticsPeriod.DAILY,
          date: startDate,
        },
      },
      create: {
        period: AnalyticsPeriod.DAILY,
        date: startDate,
        totalPageViews: views,
        uniqueVisitors: uniqueVisitors.length,
      },
      update: {
        totalPageViews: views,
        uniqueVisitors: uniqueVisitors.length,
      },
    });
  }
}
