import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { ReportType, MetricPeriod, OrderStatus } from '@prisma/client';

@Injectable()
export class AnalyticsAdvancedService {
  constructor(private prisma: PrismaService) {}

  // ==================== Sales Reports ====================

  async generateSalesReport(dto: GenerateReportDto) {
    const { reportType, startDate, endDate } = dto;
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate(reportType);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] },
      },
      include: {
        items: true,
        user: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const uniqueCustomers = new Set(orders.map((o) => o.userId));
    const newCustomers = await this.countNewCustomers(start, end);
    const returningCustomers = uniqueCustomers.size - newCustomers;

    const totalVisitors = await this.estimateVisitors(start, end);
    const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;

    const report = await this.prisma.salesReport.upsert({
      where: {
        reportDate_reportType: {
          reportDate: start,
          reportType,
        },
      },
      update: {
        totalRevenue,
        totalOrders,
        totalItems,
        averageOrderValue,
        newCustomers,
        returningCustomers,
        conversionRate,
      },
      create: {
        reportDate: start,
        reportType,
        totalRevenue,
        totalOrders,
        totalItems,
        averageOrderValue,
        newCustomers,
        returningCustomers,
        conversionRate,
      },
    });

    return report;
  }

  async getSalesReports(reportType?: ReportType, limit: number = 30) {
    const where: any = {};
    if (reportType) where.reportType = reportType;

    return this.prisma.salesReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      take: limit,
    });
  }

  // ==================== Revenue Metrics ====================

  async generateRevenueMetrics(period: MetricPeriod, metricDate: Date) {
    const { start, end } = this.getPeriodRange(period, metricDate);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
      },
      include: {
        couponUsages: true,
        refunds: true,
      },
    });

    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const refunds = orders.reduce((sum, order) => {
      return sum + order.refunds.reduce((refundSum, refund) => refundSum + refund.totalAmount, 0);
    }, 0);

    const discounts = orders.reduce((sum, order) => {
      return sum + order.couponUsages.reduce((discountSum, usage) => discountSum + usage.discountAmount, 0);
    }, 0);

    const taxes = orders.reduce((sum, order) => sum + order.tax, 0);
    const shipping = orders.reduce((sum, order) => sum + order.shipping, 0);

    const productCosts = revenue * 0.4;
    const operatingCosts = revenue * 0.15;
    const grossProfit = revenue - productCosts - refunds;
    const netProfit = grossProfit - operatingCosts - discounts;

    const metric = await this.prisma.revenueMetric.upsert({
      where: {
        metricDate_period: {
          metricDate: start,
          period,
        },
      },
      update: {
        revenue,
        grossProfit,
        netProfit,
        refunds,
        discounts,
        taxes,
        shipping,
        productCosts,
        operatingCosts,
      },
      create: {
        metricDate: start,
        period,
        revenue,
        grossProfit,
        netProfit,
        refunds,
        discounts,
        taxes,
        shipping,
        productCosts,
        operatingCosts,
      },
    });

    return metric;
  }

  async getRevenueMetrics(period?: MetricPeriod, limit: number = 30) {
    const where: any = {};
    if (period) where.period = period;

    return this.prisma.revenueMetric.findMany({
      where,
      orderBy: { metricDate: 'desc' },
      take: limit,
    });
  }

  // ==================== Customer Insights ====================

  async generateCustomerInsight(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] } },
      include: { items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lifetimeValue = totalSpent;

    const firstOrderDate = orders.length > 0 ? orders[0].createdAt : null;
    const lastOrderDate = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const orderFrequency = this.calculateOrderFrequency(orders);

    const categoryFrequency: Record<string, number> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const categoryName = item.product?.category?.name;
        if (categoryName) {
          categoryFrequency[categoryName] = (categoryFrequency[categoryName] || 0) + 1;
        }
      });
    });
    const favoriteCategory = Object.keys(categoryFrequency).reduce(
      (a, b) => (categoryFrequency[a] > categoryFrequency[b] ? a : b),
      '',
    );

    const riskScore = this.calculateRiskScore(totalOrders, daysSinceLastOrder);
    const churnProbability = this.calculateChurnProbability(daysSinceLastOrder, orderFrequency);
    const customerSegment = this.determineCustomerSegment(totalSpent, totalOrders);
    const loyaltyTier = this.determineLoyaltyTier(totalSpent);

    const insight = await this.prisma.customerInsight.upsert({
      where: { userId },
      update: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lifetimeValue,
        firstOrderDate,
        lastOrderDate,
        daysSinceLastOrder,
        orderFrequency,
        favoriteCategory,
        riskScore,
        churnProbability,
        customerSegment,
        loyaltyTier,
      },
      create: {
        userId,
        totalOrders,
        totalSpent,
        averageOrderValue,
        lifetimeValue,
        firstOrderDate,
        lastOrderDate,
        daysSinceLastOrder,
        orderFrequency,
        favoriteCategory,
        riskScore,
        churnProbability,
        customerSegment,
        loyaltyTier,
      },
    });

    return insight;
  }

  async getCustomerInsights(params: {
    customerSegment?: string;
    loyaltyTier?: string;
    page?: number;
    limit?: number;
  }) {
    const { customerSegment, loyaltyTier, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerSegment) where.customerSegment = customerSegment;
    if (loyaltyTier) where.loyaltyTier = loyaltyTier;

    const [insights, total] = await Promise.all([
      this.prisma.customerInsight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lifetimeValue: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.customerInsight.count({ where }),
    ]);

    return {
      insights,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== Product Performance ====================

  async generateProductPerformance(productId: string) {
    const [views, shares, wishlists, purchases, reviews] = await Promise.all([
      this.prisma.productView.count({ where: { productId } }),
      this.prisma.productShare.count({ where: { productId } }),
      this.prisma.wishlistItem.count({ where: { productId } }),
      this.prisma.orderItem.count({
        where: {
          productId,
          order: { status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] } },
        },
      }),
      this.prisma.review.findMany({
        where: { productId },
        select: { rating: true },
      }),
    ]);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId,
        order: { status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] } },
      },
    });

    const totalRevenue = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAddToCart = await this.prisma.cartItem.count({ where: { productId } });

    const conversionRate = views > 0 ? (purchases / views) * 100 : 0;
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const returns = await this.prisma.returnItem.count({ where: { productId } });
    const returnRate = purchases > 0 ? (returns / purchases) * 100 : 0;

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    const profitMargin = product ? ((product.price - product.price * 0.4) / product.price) * 100 : 0;

    const trend = this.determineTrend(purchases, views);

    const performance = await this.prisma.productPerformance.upsert({
      where: { productId },
      update: {
        totalViews: views,
        totalAddToCart,
        totalPurchases: purchases,
        totalRevenue,
        conversionRate,
        averageRating,
        totalReviews: reviews.length,
        returnRate,
        shareCount: shares,
        wishlistCount: wishlists,
        profitMargin,
        trend,
      },
      create: {
        productId,
        totalViews: views,
        totalAddToCart,
        totalPurchases: purchases,
        totalRevenue,
        conversionRate,
        averageRating,
        totalReviews: reviews.length,
        returnRate,
        shareCount: shares,
        wishlistCount: wishlists,
        profitMargin,
        trend,
      },
    });

    return performance;
  }

  async getTopProducts(limit: number = 10, sortBy: 'revenue' | 'purchases' | 'views' = 'revenue') {
    const orderBy: any = {};
    if (sortBy === 'revenue') orderBy.totalRevenue = 'desc';
    if (sortBy === 'purchases') orderBy.totalPurchases = 'desc';
    if (sortBy === 'views') orderBy.totalViews = 'desc';

    return this.prisma.productPerformance.findMany({
      take: limit,
      orderBy,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
          },
        },
      },
    });
  }

  // ==================== Conversion Funnel ====================

  async generateConversionFunnel(period: MetricPeriod, funnelDate: Date) {
    const { start, end } = this.getPeriodRange(period, funnelDate);

    const visitors = await this.estimateVisitors(start, end);
    const productViews = await this.prisma.productView.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    const addToCart = await this.prisma.cartItem.count({
      where: {
        cart: {
          createdAt: { gte: start, lte: end },
        },
      },
    });

    const checkoutStarted = await this.prisma.order.count({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: OrderStatus.CANCELLED },
      },
    });

    const purchaseCompleted = await this.prisma.order.count({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] },
      },
    });

    const visitToViewRate = visitors > 0 ? (productViews / visitors) * 100 : 0;
    const viewToCartRate = productViews > 0 ? (addToCart / productViews) * 100 : 0;
    const cartToCheckoutRate = addToCart > 0 ? (checkoutStarted / addToCart) * 100 : 0;
    const checkoutToPurchaseRate = checkoutStarted > 0 ? (purchaseCompleted / checkoutStarted) * 100 : 0;
    const overallConversionRate = visitors > 0 ? (purchaseCompleted / visitors) * 100 : 0;

    const funnel = await this.prisma.conversionFunnel.upsert({
      where: {
        funnelDate_period: {
          funnelDate: start,
          period,
        },
      },
      update: {
        visitors,
        productViews,
        addToCart,
        checkoutStarted,
        purchaseCompleted,
        visitToViewRate,
        viewToCartRate,
        cartToCheckoutRate,
        checkoutToPurchaseRate,
        overallConversionRate,
      },
      create: {
        funnelDate: start,
        period,
        visitors,
        productViews,
        addToCart,
        checkoutStarted,
        purchaseCompleted,
        visitToViewRate,
        viewToCartRate,
        cartToCheckoutRate,
        checkoutToPurchaseRate,
        overallConversionRate,
      },
    });

    return funnel;
  }

  async getConversionFunnels(period?: MetricPeriod, limit: number = 30) {
    const where: any = {};
    if (period) where.period = period;

    return this.prisma.conversionFunnel.findMany({
      where,
      orderBy: { funnelDate: 'desc' },
      take: limit,
    });
  }

  // ==================== Dashboard Widgets ====================

  async createWidget(userId: string, dto: CreateWidgetDto) {
    return this.prisma.dashboardWidget.create({
      data: {
        userId,
        widgetType: dto.widgetType,
        title: dto.title,
        configuration: dto.configuration || {},
        position: dto.position || 0,
        isPublic: dto.isPublic || false,
      },
    });
  }

  async getUserWidgets(userId: string) {
    return this.prisma.dashboardWidget.findMany({
      where: { userId, isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  async deleteWidget(widgetId: string, userId: string) {
    await this.prisma.dashboardWidget.deleteMany({
      where: { id: widgetId, userId },
    });
    return { message: 'Widget deleted successfully' };
  }

  // ==================== Helper Methods ====================

  private getDefaultStartDate(reportType: ReportType): Date {
    const now = new Date();
    switch (reportType) {
      case ReportType.DAILY:
        return new Date(now.setDate(now.getDate() - 1));
      case ReportType.WEEKLY:
        return new Date(now.setDate(now.getDate() - 7));
      case ReportType.MONTHLY:
        return new Date(now.setMonth(now.getMonth() - 1));
      case ReportType.QUARTERLY:
        return new Date(now.setMonth(now.getMonth() - 3));
      case ReportType.YEARLY:
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  private getPeriodRange(period: MetricPeriod, date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    switch (period) {
      case MetricPeriod.HOURLY:
        end.setHours(end.getHours() + 1);
        break;
      case MetricPeriod.DAILY:
        end.setDate(end.getDate() + 1);
        break;
      case MetricPeriod.WEEKLY:
        end.setDate(end.getDate() + 7);
        break;
      case MetricPeriod.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case MetricPeriod.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case MetricPeriod.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return { start, end };
  }

  private async countNewCustomers(start: Date, end: Date): Promise<number> {
    const newUsers = await this.prisma.user.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    return newUsers;
  }

  private async estimateVisitors(start: Date, end: Date): Promise<number> {
    const uniqueUsers = await this.prisma.productView.findMany({
      where: { createdAt: { gte: start, lte: end } },
      distinct: ['userId'],
      select: { userId: true },
    });
    return uniqueUsers.length * 1.5;
  }

  private calculateOrderFrequency(orders: any[]): number {
    if (orders.length < 2) return 0;
    const firstDate = orders[0].createdAt.getTime();
    const lastDate = orders[orders.length - 1].createdAt.getTime();
    const daysBetween = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    return daysBetween > 0 ? orders.length / daysBetween : 0;
  }

  private calculateRiskScore(totalOrders: number, daysSinceLastOrder: number | null): number {
    if (totalOrders === 0) return 100;
    if (!daysSinceLastOrder) return 50;
    if (daysSinceLastOrder > 180) return 90;
    if (daysSinceLastOrder > 90) return 70;
    if (daysSinceLastOrder > 30) return 40;
    return 10;
  }

  private calculateChurnProbability(daysSinceLastOrder: number | null, orderFrequency: number): number {
    if (!daysSinceLastOrder) return 0;
    const expectedDaysBetweenOrders = orderFrequency > 0 ? 1 / orderFrequency : 365;
    if (daysSinceLastOrder > expectedDaysBetweenOrders * 3) return 0.9;
    if (daysSinceLastOrder > expectedDaysBetweenOrders * 2) return 0.6;
    if (daysSinceLastOrder > expectedDaysBetweenOrders * 1.5) return 0.3;
    return 0.1;
  }

  private determineCustomerSegment(totalSpent: number, totalOrders: number): string {
    if (totalSpent > 10000 && totalOrders > 50) return 'VIP';
    if (totalSpent > 5000 && totalOrders > 20) return 'HIGH_VALUE';
    if (totalSpent > 1000 && totalOrders > 5) return 'REGULAR';
    if (totalOrders > 1) return 'RETURNING';
    return 'NEW';
  }

  private determineLoyaltyTier(totalSpent: number): string {
    if (totalSpent > 10000) return 'PLATINUM';
    if (totalSpent > 5000) return 'GOLD';
    if (totalSpent > 1000) return 'SILVER';
    return 'BRONZE';
  }

  private determineTrend(purchases: number, views: number): string {
    const conversionRate = views > 0 ? (purchases / views) * 100 : 0;
    if (conversionRate > 5) return 'trending_up';
    if (conversionRate < 1) return 'trending_down';
    return 'stable';
  }

  async getDashboardOverview() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalRevenue, totalOrders, totalCustomers, avgOrderValue] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
        },
        _avg: { total: true },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.total || 0,
      totalOrders,
      totalCustomers,
      averageOrderValue: avgOrderValue._avg.total || 0,
      period: '30 days',
    };
  }
}
