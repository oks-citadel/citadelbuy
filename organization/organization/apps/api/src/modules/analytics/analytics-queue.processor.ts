import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AlertService } from '@/common/alerts/alert.service';

export const ANALYTICS_QUEUE = 'analytics';

export enum AnalyticsJobType {
  DAILY_REPORT = 'daily-report',
  WEEKLY_REPORT = 'weekly-report',
  MONTHLY_REPORT = 'monthly-report',
  REVENUE_ANALYTICS = 'revenue-analytics',
  PRODUCT_PERFORMANCE = 'product-performance',
  VENDOR_ANALYTICS = 'vendor-analytics',
}

export interface DailyReportJobData {
  date: Date;
  organizationId?: string;
  recipients?: string[];
  autoSend?: boolean;
}

export interface WeeklyReportJobData {
  weekStartDate: Date;
  weekEndDate: Date;
  organizationId?: string;
  recipients?: string[];
  autoSend?: boolean;
}

export interface MonthlyReportJobData {
  month: number;
  year: number;
  organizationId?: string;
  recipients?: string[];
  autoSend?: boolean;
}

export interface RevenueAnalyticsJobData {
  period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  date?: Date;
  organizationId?: string;
}

export interface ProductPerformanceJobData {
  productIds?: string[];
  categoryIds?: string[];
  vendorIds?: string[];
  timeRange: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
}

/**
 * Analytics Queue Processor
 *
 * Handles analytics-related background jobs including:
 * - Report generation (daily, weekly, monthly)
 * - Revenue analytics and forecasting
 * - Product performance analysis
 * - Vendor analytics
 */
@Processor(ANALYTICS_QUEUE)
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private alertService: AlertService,
  ) {}

  /**
   * Process daily report generation
   */
  @Process({ name: AnalyticsJobType.DAILY_REPORT, concurrency: 2 })
  async processDailyReport(job: Job<DailyReportJobData>) {
    this.logger.log(`Processing daily report job ${job.id} for ${job.data.date}`);

    try {
      await job.progress(10);

      const { date, organizationId } = job.data;
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      await job.progress(20);

      // Gather analytics data
      const [salesData, orderData, topProducts] = await Promise.all([
        this.getSalesAnalytics(startOfDay, endOfDay, organizationId),
        this.getOrderAnalytics(startOfDay, endOfDay, organizationId),
        this.getTopProducts(startOfDay, endOfDay, 5, organizationId),
      ]);

      await job.progress(60);

      const report = {
        date: new Date(date).toISOString().split('T')[0],
        organizationId,
        sales: salesData,
        orders: orderData,
        topProducts,
        generatedAt: new Date(),
      };

      await job.progress(100);

      return {
        success: true,
        date: new Date(date).toISOString().split('T')[0],
        totalRevenue: salesData.totalRevenue,
        totalOrders: orderData.totalOrders,
        report,
      };
    } catch (error) {
      this.logger.error(`Failed to process daily report job ${job.id}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Process weekly report generation
   */
  @Process({ name: AnalyticsJobType.WEEKLY_REPORT, concurrency: 1 })
  async processWeeklyReport(job: Job<WeeklyReportJobData>) {
    this.logger.log(`Processing weekly report job ${job.id}`);

    try {
      await job.progress(10);

      const { weekStartDate, weekEndDate, organizationId } = job.data;

      await job.progress(20);

      // Gather weekly analytics
      const [salesData, orderData, productPerformance] = await Promise.all([
        this.getSalesAnalytics(new Date(weekStartDate), new Date(weekEndDate), organizationId),
        this.getOrderAnalytics(new Date(weekStartDate), new Date(weekEndDate), organizationId),
        this.getTopProducts(new Date(weekStartDate), new Date(weekEndDate), 10, organizationId),
      ]);

      await job.progress(60);

      const report = {
        weekStartDate: new Date(weekStartDate).toISOString().split('T')[0],
        weekEndDate: new Date(weekEndDate).toISOString().split('T')[0],
        organizationId,
        sales: salesData,
        orders: orderData,
        productPerformance,
        generatedAt: new Date(),
      };

      await job.progress(100);

      return {
        success: true,
        weekStartDate: new Date(weekStartDate).toISOString().split('T')[0],
        weekEndDate: new Date(weekEndDate).toISOString().split('T')[0],
        totalRevenue: salesData.totalRevenue,
        totalOrders: orderData.totalOrders,
        report,
      };
    } catch (error) {
      this.logger.error(`Failed to process weekly report job ${job.id}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Process revenue analytics
   */
  @Process({ name: AnalyticsJobType.REVENUE_ANALYTICS, concurrency: 3 })
  async processRevenueAnalytics(job: Job<RevenueAnalyticsJobData>) {
    this.logger.log(`Processing revenue analytics job ${job.id} for period ${job.data.period}`);

    try {
      await job.progress(20);

      const { period, date = new Date(), organizationId } = job.data;
      const { startDate, endDate } = this.getPeriodRange(period, new Date(date));

      await job.progress(40);

      // Calculate revenue metrics
      const revenueData = await this.getSalesAnalytics(startDate, endDate, organizationId);

      await job.progress(70);

      // Store revenue analytics in the existing RevenueAnalytics model
      await this.prisma.revenueAnalytics.create({
        data: {
          date: startDate,
          period: period as any, // DAILY, WEEKLY, etc
          productRevenue: revenueData.totalSubtotal,
          subscriptionRevenue: 0,
          adRevenue: 0,
          bnplRevenue: 0,
          platformFees: 0,
          paymentFees: 0,
          grossRevenue: revenueData.totalRevenue,
          netRevenue: revenueData.totalRevenue - revenueData.totalTax,
          totalOrders: revenueData.orderCount,
          completedOrders: revenueData.orderCount,
          cancelledOrders: 0,
          refundedOrders: 0,
          totalRefunds: 0,
          refundRate: 0,
        },
      });

      await job.progress(100);

      return {
        success: true,
        period,
        totalRevenue: revenueData.totalRevenue,
        totalOrders: revenueData.orderCount,
      };
    } catch (error) {
      this.logger.error(`Failed to process revenue analytics job ${job.id}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Process product performance analysis
   */
  @Process({ name: AnalyticsJobType.PRODUCT_PERFORMANCE, concurrency: 3 })
  async processProductPerformance(job: Job<ProductPerformanceJobData>) {
    this.logger.log(`Processing product performance job ${job.id}`);

    try {
      await job.progress(20);

      const { timeRange, productIds, categoryIds, vendorIds } = job.data;
      const { startDate, endDate } = this.getTimeRange(timeRange);

      await job.progress(40);

      // Build filter for products
      const productFilter: any = {};
      if (productIds && productIds.length > 0) {
        productFilter.id = { in: productIds };
      }
      if (categoryIds && categoryIds.length > 0) {
        productFilter.categoryId = { in: categoryIds };
      }
      if (vendorIds && vendorIds.length > 0) {
        productFilter.vendorId = { in: vendorIds };
      }

      // Get products with order items
      const products = await this.prisma.product.findMany({
        where: productFilter,
        select: {
          id: true,
          name: true,
          orderItems: {
            where: {
              order: {
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
              },
            },
            select: {
              quantity: true,
              price: true,
            },
          },
        },
        take: 100,
      });

      await job.progress(80);

      // Calculate performance metrics
      const performanceData = products.map((product) => {
        const totalSales = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = product.orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        return {
          productId: product.id,
          productName: product.name,
          sales: totalSales,
          revenue: totalRevenue,
        };
      });

      // Store in ProductAnalytics
      for (const perf of performanceData) {
        if (perf.sales > 0) {
          await this.prisma.productAnalytics.create({
            data: {
              productId: perf.productId,
              date: startDate,
              views: 0,
              uniqueViews: 0,
              addToCart: 0,
              purchases: perf.sales,
              revenue: perf.revenue,
              viewToCart: 0,
              cartToCheckout: 0,
              checkoutToPurchase: 0,
              averageTimeOnPage: 0,
              bounceRate: 0,
              stockLevel: 0,
              stockouts: 0,
              newReviews: 0,
              averageRating: 0,
              searchTraffic: 0,
              directTraffic: 0,
              recommendationTraffic: 0,
              adTraffic: 0,
            },
          });
        }
      }

      await job.progress(100);

      return {
        success: true,
        productsAnalyzed: performanceData.length,
        timeRange,
      };
    } catch (error) {
      this.logger.error(`Failed to process product performance job ${job.id}`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * Helper: Get sales analytics for a period
   */
  private async getSalesAnalytics(startDate: Date, endDate: Date, organizationId?: string) {
    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const result = await this.prisma.order.aggregate({
      where,
      _sum: { total: true, subtotal: true, tax: true, shipping: true },
      _count: { id: true },
      _avg: { total: true },
    });

    return {
      totalRevenue: Number(result._sum.total) || 0,
      totalSubtotal: Number(result._sum.subtotal) || 0,
      totalTax: Number(result._sum.tax) || 0,
      totalShipping: Number(result._sum.shipping) || 0,
      orderCount: result._count.id,
      averageOrderValue: Number(result._avg.total) || 0,
    };
  }

  /**
   * Helper: Get order analytics for a period
   */
  private async getOrderAnalytics(startDate: Date, endDate: Date, organizationId?: string) {
    const where: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [totalOrders, ordersByStatus] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Helper: Get top products for a period
   */
  private async getTopProducts(
    startDate: Date,
    endDate: Date,
    limit: number,
    organizationId?: string,
  ) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
          ...(organizationId ? { organizationId } : {}),
        },
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    const productStats = orderItems.reduce(
      (acc, item) => {
        const productId = item.productId;
        if (!productId) return acc;
        if (!acc[productId]) {
          acc[productId] = {
            productId,
            productName: item.product?.name || 'Unknown Product',
            quantity: 0,
            revenue: 0,
          };
        }
        acc[productId].quantity += item.quantity;
        acc[productId].revenue += Number(item.price) * item.quantity;
        return acc;
      },
      {} as Record<string, { productId: string; productName: string; quantity: number; revenue: number }>,
    );

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private getPeriodRange(period: string, date: Date) {
    const startDate = new Date(date);
    const endDate = new Date(date);

    switch (period) {
      case 'HOURLY':
        startDate.setMinutes(0, 0, 0);
        endDate.setMinutes(59, 59, 999);
        break;
      case 'DAILY':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'WEEKLY': {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'MONTHLY':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }

  private getTimeRange(range: string) {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case 'DAY':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'WEEK':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTH':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'YEAR':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Event handlers
   */
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing analytics job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    this.logger.log(`Analytics job ${job.id} of type ${job.name} completed successfully`);
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Analytics job ${job.id} of type ${job.name} failed`, {
      error: error.message,
      stack: error.stack,
    });
  }
}
