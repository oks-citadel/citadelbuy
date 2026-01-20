import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AnalyticsQueryDto, TimeRange } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get date range based on query
   */
  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
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
   * Get sales analytics and revenue metrics
   */
  async getSalesAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
      },
    };

    if (query.vendorId) {
      where.items = {
        some: {
          product: {
            vendorId: query.vendorId,
          },
        },
      };
    }

    const [orders, orderStats, dailySales] = await Promise.all([
      // Total orders
      this.prisma.order.count({ where }),

      // Revenue and average order value
      this.prisma.order.aggregate({
        where,
        _sum: {
          total: true,
          subtotal: true,
          tax: true,
          shipping: true,
        },
        _avg: {
          total: true,
        },
      }),

      // Daily sales breakdown
      this.prisma.order.findMany({
        where,
        select: {
          createdAt: true,
          total: true,
          status: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    // Group sales by day
    const salesByDay = dailySales.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += order.total;
      acc[date].orders += 1;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number }>);

    return {
      summary: {
        totalOrders: orders,
        totalRevenue: orderStats._sum.total || 0,
        totalSubtotal: orderStats._sum.subtotal || 0,
        totalTax: orderStats._sum.tax || 0,
        totalShipping: orderStats._sum.shipping || 0,
        averageOrderValue: orderStats._avg.total || 0,
      },
      dailyBreakdown: Object.values(salesByDay),
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * Get product performance analytics
   */
  async getProductAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.categoryId) {
      where.product = {
        categoryId: query.categoryId,
      };
    }

    if (query.vendorId) {
      where.product = {
        ...where.product,
        vendorId: query.vendorId,
      };
    }

    // Get order items with product info
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
          },
        },
        ...(query.categoryId || query.vendorId ? { product: where.product } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            categoryId: true,
            vendorId: true,
          },
        },
      },
    });

    // Aggregate product performance
    const productStats = orderItems.reduce((acc, item) => {
      const productId = item.productId;
      if (!productId) return acc;
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: item.product?.name || 'Unknown Product',
          quantitySold: 0,
          revenue: 0,
          timesOrdered: 0,
        };
      }
      acc[productId].quantitySold += item.quantity;
      acc[productId].revenue += item.price * item.quantity;
      acc[productId].timesOrdered += 1;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by revenue
    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get low stock products
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        stock: {
          lte: 10,
          gt: 0,
        },
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
      },
      orderBy: {
        stock: 'asc',
      },
      take: 10,
    });

    // Get out of stock products
    const outOfStockProducts = await this.prisma.product.count({
      where: {
        stock: 0,
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
    });

    return {
      topSellingProducts: topProducts,
      lowStockProducts,
      outOfStockCount: outOfStockProducts,
      totalProductsSold: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      totalUniqueProducts: Object.keys(productStats).length,
    };
  }

  /**
   * Get customer insights and demographics
   */
  async getCustomerAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const [totalCustomers, newCustomers, ordersByCustomer, customerOrders] = await Promise.all([
      // Total customers
      this.prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),

      // New customers in date range
      this.prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Customers with orders
      this.prisma.user.count({
        where: {
          role: 'CUSTOMER',
          orders: {
            some: {},
          },
        },
      }),

      // Customer order data
      this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
          },
        },
        select: {
          userId: true,
          total: true,
        },
      }),
    ]);

    // Calculate customer lifetime value
    const customerSpending = customerOrders.reduce((acc, order) => {
      const userId = order.userId;
      if (!userId) return acc;
      if (!acc[userId]) {
        acc[userId] = { totalSpent: 0, orderCount: 0 };
      }
      acc[userId].totalSpent += order.total;
      acc[userId].orderCount += 1;
      return acc;
    }, {} as Record<string, { totalSpent: number; orderCount: number }>);

    const topCustomers = Object.entries(customerSpending)
      .sort(([, a], [, b]) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(([userId, data]) => ({
        userId,
        ...data,
        averageOrderValue: data.totalSpent / data.orderCount,
      }));

    const averageOrdersPerCustomer =
      Object.keys(customerSpending).length > 0
        ? customerOrders.length / Object.keys(customerSpending).length
        : 0;

    return {
      summary: {
        totalCustomers,
        newCustomers,
        customersWithOrders: ordersByCustomer,
        averageOrdersPerCustomer: Math.round(averageOrdersPerCustomer * 100) / 100,
      },
      topCustomers,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(query: AnalyticsQueryDto) {
    const where: any = {};

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const [totalProducts, totalStock, lowStock, outOfStock, stockByCategory] = await Promise.all([
      this.prisma.product.count({ where }),

      this.prisma.product.aggregate({
        where,
        _sum: {
          stock: true,
        },
      }),

      this.prisma.product.count({
        where: {
          ...where,
          stock: {
            lte: 10,
            gt: 0,
          },
        },
      }),

      this.prisma.product.count({
        where: {
          ...where,
          stock: 0,
        },
      }),

      this.prisma.product.groupBy({
        by: ['categoryId'],
        where,
        _sum: {
          stock: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      summary: {
        totalProducts,
        totalStockUnits: totalStock._sum.stock || 0,
        lowStockProducts: lowStock,
        outOfStockProducts: outOfStock,
        averageStockPerProduct: totalProducts > 0 ? (totalStock._sum.stock || 0) / totalProducts : 0,
      },
      stockByCategory,
    };
  }

  /**
   * Get vendor-specific analytics
   */
  async getVendorAnalytics(vendorId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    // Sales from vendor's products
    const vendorOrders = await this.prisma.orderItem.findMany({
      where: {
        product: {
          vendorId,
        },
        order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    const totalRevenue = vendorOrders.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItemsSold = vendorOrders.reduce((sum, item) => sum + item.quantity, 0);

    // Vendor's product count and stock
    const [productCount, stockInfo] = await Promise.all([
      this.prisma.product.count({
        where: { vendorId },
      }),

      this.prisma.product.aggregate({
        where: { vendorId },
        _sum: {
          stock: true,
        },
      }),
    ]);

    return {
      summary: {
        totalProducts: productCount,
        totalRevenue,
        totalItemsSold,
        totalStock: stockInfo._sum.stock || 0,
        averageRevenuePerProduct: productCount > 0 ? totalRevenue / productCount : 0,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(query: AnalyticsQueryDto) {
    const [sales, products, customers, inventory] = await Promise.all([
      this.getSalesAnalytics(query),
      this.getProductAnalytics(query),
      this.getCustomerAnalytics(query),
      this.getInventoryAnalytics(query),
    ]);

    return {
      sales: sales.summary,
      products: {
        topSelling: products.topSellingProducts.slice(0, 5),
        lowStock: products.lowStockProducts.slice(0, 5),
        outOfStock: products.outOfStockCount,
      },
      customers: customers.summary,
      inventory: inventory.summary,
      dateRange: sales.dateRange,
    };
  }
}
