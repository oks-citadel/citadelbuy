import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AnalyticsPeriod, OrderStatus } from '@prisma/client';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  averageOrderValue: number;
  refundedAmount: number;
  netRevenue: number;
}

export interface ProductMetrics {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  averagePrice: number;
  topSellingProducts: any[];
}

export interface TrafficMetrics {
  totalViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  averageTimeOnPage: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageLifetimeValue: number;
  topCustomers: any[];
}

export interface PerformanceMetrics {
  sellerRating: number;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  responseTime: number;
  fulfillmentRate: number;
  onTimeDeliveryRate: number;
}

export interface DashboardOverview {
  period: string;
  sales: SalesMetrics;
  products: ProductMetrics;
  traffic: TrafficMetrics;
  customers: CustomerMetrics;
  performance: PerformanceMetrics;
  recentOrders: any[];
  salesTrend: { date: string; revenue: number; orders: number }[];
  topCategories: { category: string; revenue: number; units: number }[];
}

@Injectable()
export class VendorAnalyticsService {
  private readonly logger = new Logger(VendorAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== DASHBOARD OVERVIEW ====================

  /**
   * Get comprehensive vendor dashboard data
   */
  async getDashboardOverview(
    vendorId: string,
    period: 'today' | 'week' | 'month' | 'year' = 'month',
  ): Promise<DashboardOverview> {
    const dateRange = this.getDateRange(period);

    const [sales, products, traffic, customers, performance, recentOrders, salesTrend, topCategories] =
      await Promise.all([
        this.getSalesMetrics(vendorId, dateRange),
        this.getProductMetrics(vendorId),
        this.getTrafficMetrics(vendorId, dateRange),
        this.getCustomerMetrics(vendorId, dateRange),
        this.getPerformanceMetrics(vendorId, dateRange),
        this.getRecentOrders(vendorId, 10),
        this.getSalesTrend(vendorId, dateRange, period),
        this.getTopCategories(vendorId, dateRange),
      ]);

    return {
      period,
      sales,
      products,
      traffic,
      customers,
      performance,
      recentOrders,
      salesTrend,
      topCategories,
    };
  }

  // ==================== SALES METRICS ====================

  async getSalesMetrics(vendorId: string, dateRange: DateRange): Promise<SalesMetrics> {
    // Get all orders with vendor's products
    const orders = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          status: {
            notIn: [OrderStatus.CANCELLED],
          },
        },
      },
      include: {
        order: true,
      },
    });

    // Calculate metrics
    let totalRevenue = 0;
    let totalUnits = 0;
    const orderIds = new Set<string>();

    for (const item of orders) {
      totalRevenue += item.price * item.quantity;
      totalUnits += item.quantity;
      orderIds.add(item.orderId);
    }

    // Get refunds
    const refunds = await this.prisma.refund.aggregate({
      where: {
        returnRequest: {
          items: {
            some: {
              product: { vendorId },
            },
          },
        },
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      _sum: { totalAmount: true },
    });

    const refundedAmount = refunds._sum.totalAmount || 0;

    return {
      totalRevenue,
      totalOrders: orderIds.size,
      totalUnits,
      averageOrderValue: orderIds.size > 0 ? totalRevenue / orderIds.size : 0,
      refundedAmount,
      netRevenue: totalRevenue - refundedAmount,
    };
  }

  /**
   * Get sales comparison with previous period
   */
  async getSalesComparison(
    vendorId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ) {
    const currentRange = this.getDateRange(period);
    const previousRange = this.getPreviousDateRange(period);

    const [current, previous] = await Promise.all([
      this.getSalesMetrics(vendorId, currentRange),
      this.getSalesMetrics(vendorId, previousRange),
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
        units: calculateChange(current.totalUnits, previous.totalUnits),
        averageOrderValue: calculateChange(current.averageOrderValue, previous.averageOrderValue),
      },
    };
  }

  // ==================== PRODUCT METRICS ====================

  async getProductMetrics(vendorId: string): Promise<ProductMetrics> {
    const [total, active, outOfStock, lowStock, priceAvg, topSelling] = await Promise.all([
      this.prisma.product.count({ where: { vendorId } }),
      this.prisma.product.count({ where: { vendorId, stock: { gt: 0 } } }),
      this.prisma.product.count({ where: { vendorId, stock: 0 } }),
      this.prisma.product.count({ where: { vendorId, stock: { gt: 0, lte: 10 } } }),
      this.prisma.product.aggregate({
        where: { vendorId },
        _avg: { price: true },
      }),
      this.getTopSellingProducts(vendorId, 5),
    ]);

    return {
      totalProducts: total,
      activeProducts: active,
      outOfStock,
      lowStock,
      averagePrice: priceAvg._avg.price || 0,
      topSellingProducts: topSelling,
    };
  }

  async getTopSellingProducts(vendorId: string, limit = 10, dateRange?: DateRange) {
    const where: any = {
      product: { vendorId },
    };

    if (dateRange) {
      where.order = {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      };
    }

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, price: true },
      _count: { productId: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: limit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        stock: true,
      },
    });

    return topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...product,
        unitsSold: item._sum.quantity,
        revenue: (item._sum.price || 0) * (item._sum.quantity || 0),
        orderCount: item._count.productId,
      };
    });
  }

  // ==================== TRAFFIC METRICS ====================

  async getTrafficMetrics(vendorId: string, dateRange: DateRange): Promise<TrafficMetrics> {
    // Get product views for vendor's products
    const productIds = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true },
    });

    const productIdList = productIds.map((p) => p.id);

    const views = await this.prisma.productView.findMany({
      where: {
        productId: { in: productIdList },
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        userId: true,
        sessionId: true,
      },
    });

    const uniqueVisitors = new Set<string>();
    views.forEach((v) => {
      uniqueVisitors.add(v.userId || v.sessionId || '');
    });

    // Calculate conversion rate
    const sales = await this.getSalesMetrics(vendorId, dateRange);
    const conversionRate = views.length > 0 ? (sales.totalOrders / views.length) * 100 : 0;

    return {
      totalViews: views.length,
      uniqueVisitors: uniqueVisitors.size,
      conversionRate,
      averageTimeOnPage: 0, // Would need session tracking for this
    };
  }

  // ==================== CUSTOMER METRICS ====================

  async getCustomerMetrics(vendorId: string, dateRange: DateRange): Promise<CustomerMetrics> {
    // Get all customers who ordered from this vendor
    const currentPeriodOrders = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
      },
      include: {
        order: {
          select: {
            userId: true,
          },
        },
      },
      distinct: ['orderId'],
    });

    const currentCustomerIds = new Set(currentPeriodOrders.map((o) => o.order.userId));

    // Get customers who ordered before this period
    const previousOrders = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            lt: dateRange.startDate,
          },
        },
      },
      include: {
        order: {
          select: {
            userId: true,
          },
        },
      },
      distinct: ['orderId'],
    });

    const previousCustomerIds = new Set(previousOrders.map((o) => o.order.userId));

    // Calculate new vs returning customers
    let newCustomers = 0;
    let returningCustomers = 0;

    currentCustomerIds.forEach((customerId) => {
      if (previousCustomerIds.has(customerId)) {
        returningCustomers++;
      } else {
        newCustomers++;
      }
    });

    // Get top customers
    const topCustomers = await this.getTopCustomers(vendorId, dateRange, 5);

    // Calculate average lifetime value
    const allTimeRevenue = await this.prisma.orderItem.aggregate({
      where: {
        product: { vendorId },
        order: {
          status: { notIn: [OrderStatus.CANCELLED] },
        },
      },
      _sum: { price: true },
    });

    const totalCustomers = currentCustomerIds.size;
    const avgLTV = totalCustomers > 0 ? (allTimeRevenue._sum.price || 0) / totalCustomers : 0;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageLifetimeValue: avgLTV,
      topCustomers,
    };
  }

  async getTopCustomers(vendorId: string, dateRange: DateRange, limit = 10) {
    const customerSpending = await this.prisma.orderItem.groupBy({
      by: ['orderId'],
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
      },
      _sum: { price: true },
    });

    // Get order to user mapping
    const orderIds = customerSpending.map((c) => c.orderId);
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Aggregate by user
    const userSpending = new Map<string, { user: any; totalSpent: number; orderCount: number }>();

    customerSpending.forEach((spending) => {
      const order = orders.find((o) => o.id === spending.orderId);
      if (!order || !order.userId) return;

      const existing = userSpending.get(order.userId) || {
        user: order.user,
        totalSpent: 0,
        orderCount: 0,
      };

      existing.totalSpent += spending._sum.price || 0;
      existing.orderCount += 1;
      userSpending.set(order.userId, existing);
    });

    return Array.from(userSpending.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  // ==================== PERFORMANCE METRICS ====================

  async getPerformanceMetrics(vendorId: string, dateRange: DateRange): Promise<PerformanceMetrics> {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    // Get reviews for vendor's products
    const productIds = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true },
    });

    const productIdList = productIds.map((p) => p.id);

    const reviews = await this.prisma.review.findMany({
      where: {
        productId: { in: productIdList },
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter((r) => r.rating >= 4).length;
    const negativeReviews = reviews.filter((r) => r.rating <= 2).length;

    // Calculate fulfillment rate
    const orders = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
      },
      include: {
        order: {
          select: {
            status: true,
            estimatedDeliveryDate: true,
            actualDeliveryDate: true,
          },
        },
      },
    });

    const fulfilledOrders = orders.filter((o) =>
      o.order.status === OrderStatus.SHIPPED || o.order.status === OrderStatus.DELIVERED,
    ).length;

    const onTimeDeliveries = orders.filter(
      (o) =>
        o.order.actualDeliveryDate &&
        o.order.estimatedDeliveryDate &&
        o.order.actualDeliveryDate <= o.order.estimatedDeliveryDate,
    ).length;

    return {
      sellerRating: profile?.averageRating || 0,
      totalReviews,
      positiveReviews,
      negativeReviews,
      responseTime: 0, // Would need support ticket data
      fulfillmentRate: orders.length > 0 ? (fulfilledOrders / orders.length) * 100 : 0,
      onTimeDeliveryRate: fulfilledOrders > 0 ? (onTimeDeliveries / fulfilledOrders) * 100 : 0,
    };
  }

  // ==================== RECENT ORDERS ====================

  async getRecentOrders(vendorId: string, limit = 10) {
    const orders = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
      orderBy: {
        order: {
          createdAt: 'desc',
        },
      },
      take: limit,
    });

    return orders.map((item) => ({
      orderId: item.orderId,
      orderDate: item.order.createdAt,
      status: item.order.status,
      customer: item.order.user,
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    }));
  }

  // ==================== SALES TREND ====================

  async getSalesTrend(
    vendorId: string,
    dateRange: DateRange,
    period: 'today' | 'week' | 'month' | 'year',
  ) {
    const groupBy = period === 'today' ? 'hour' : period === 'week' ? 'day' : 'day';

    // Get all order items in range
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          status: { notIn: [OrderStatus.CANCELLED] },
        },
      },
      include: {
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Group by date
    const dailyData = new Map<string, { revenue: number; orders: Set<string> }>();

    orderItems.forEach((item) => {
      const date = item.order.createdAt.toISOString().split('T')[0];
      const existing = dailyData.get(date) || { revenue: 0, orders: new Set() };
      existing.revenue += item.price * item.quantity;
      existing.orders.add(item.orderId);
      dailyData.set(date, existing);
    });

    // Fill in missing dates
    const result: { date: string; revenue: number; orders: number }[] = [];
    const current = new Date(dateRange.startDate);

    while (current <= dateRange.endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const data = dailyData.get(dateStr) || { revenue: 0, orders: new Set() };
      result.push({
        date: dateStr,
        revenue: data.revenue,
        orders: data.orders.size,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // ==================== TOP CATEGORIES ====================

  async getTopCategories(vendorId: string, dateRange: DateRange) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        product: { vendorId },
        order: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          status: { notIn: [OrderStatus.CANCELLED] },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoryData = new Map<string, { name: string; revenue: number; units: number }>();

    orderItems.forEach((item) => {
      const categoryId = item.product.categoryId;
      const categoryName = item.product.category.name;
      const existing = categoryData.get(categoryId) || { name: categoryName, revenue: 0, units: 0 };
      existing.revenue += item.price * item.quantity;
      existing.units += item.quantity;
      categoryData.set(categoryId, existing);
    });

    return Array.from(categoryData.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((c) => ({
        category: c.name,
        revenue: c.revenue,
        units: c.units,
      }));
  }

  // ==================== REVENUE BREAKDOWN ====================

  async getRevenueBreakdown(vendorId: string, dateRange: DateRange) {
    const sales = await this.getSalesMetrics(vendorId, dateRange);

    // Get commission info
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { commissionRate: true },
    });

    const commissionRate = profile?.commissionRate || 15;
    const commissionAmount = sales.totalRevenue * (commissionRate / 100);
    const netEarnings = sales.totalRevenue - commissionAmount - sales.refundedAmount;

    return {
      grossRevenue: sales.totalRevenue,
      refunds: sales.refundedAmount,
      commissionRate,
      commissionAmount,
      netEarnings,
      pendingPayout: netEarnings, // Simplified, would need actual payout tracking
    };
  }

  // ==================== EXPORT DATA ====================

  async exportAnalytics(
    vendorId: string,
    dateRange: DateRange,
    format: 'json' | 'csv' = 'json',
  ) {
    const [sales, products, customers, salesTrend] = await Promise.all([
      this.getSalesMetrics(vendorId, dateRange),
      this.getProductMetrics(vendorId),
      this.getCustomerMetrics(vendorId, dateRange),
      this.getSalesTrend(vendorId, dateRange, 'month'),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      period: {
        start: dateRange.startDate.toISOString(),
        end: dateRange.endDate.toISOString(),
      },
      sales,
      products,
      customers,
      dailySales: salesTrend,
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any): string {
    // Convert daily sales to CSV
    const headers = ['Date', 'Revenue', 'Orders'];
    const rows = data.dailySales.map((d: any) => [d.date, d.revenue, d.orders].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  // ==================== HELPER METHODS ====================

  private getDateRange(period: 'today' | 'week' | 'month' | 'year'): DateRange {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  private getPreviousDateRange(period: 'week' | 'month' | 'year'): DateRange {
    const current = this.getDateRange(period);
    const duration = current.endDate.getTime() - current.startDate.getTime();

    return {
      startDate: new Date(current.startDate.getTime() - duration),
      endDate: new Date(current.startDate.getTime()),
    };
  }
}
