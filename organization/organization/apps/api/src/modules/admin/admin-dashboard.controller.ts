import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('admin/dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns dashboard statistics' })
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month revenue
    const currentMonthRevenue = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
    });

    // Get last month revenue for comparison
    const lastMonthRevenue = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
    });

    // Get current month orders
    const currentMonthOrders = await this.prisma.order.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // Get last month orders for comparison
    const lastMonthOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // Get current month new customers
    const currentMonthCustomers = await this.prisma.user.count({
      where: {
        createdAt: { gte: startOfMonth },
        role: 'CUSTOMER',
      },
    });

    // Get last month new customers for comparison
    const lastMonthCustomers = await this.prisma.user.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        role: 'CUSTOMER',
      },
    });

    // Get total customers
    const totalCustomers = await this.prisma.user.count({
      where: { role: 'CUSTOMER' },
    });

    // Get product stats
    const totalProducts = await this.prisma.product.count();
    const activeProducts = await this.prisma.product.count({
      where: { isActive: true },
    });

    // Calculate percentage changes
    const revenueChange = lastMonthRevenue._sum.total
      ? ((((currentMonthRevenue._sum.total || 0) - lastMonthRevenue._sum.total) / lastMonthRevenue._sum.total) * 100)
      : 0;

    const ordersChange = lastMonthOrders
      ? (((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
      : 0;

    const customersChange = lastMonthCustomers
      ? (((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100)
      : 0;

    return {
      revenue: {
        value: currentMonthRevenue._sum.total || 0,
        change: Math.round(revenueChange * 10) / 10,
        period: 'vs last month',
      },
      orders: {
        value: currentMonthOrders,
        change: Math.round(ordersChange * 10) / 10,
        period: 'vs last month',
      },
      customers: {
        value: totalCustomers,
        change: Math.round(customersChange * 10) / 10,
        period: 'vs last month',
      },
      products: {
        value: totalProducts,
        active: activeProducts,
        period: 'active',
      },
    };
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Get recent orders for dashboard (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns recent orders' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentOrders(@Query('limit') limit: number = 5) {
    const orders = await this.prisma.order.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      customer: order.user?.name || 'Guest',
      amount: order.total,
      status: order.status,
      time: this.getRelativeTime(order.createdAt),
    }));
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get system alerts (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns system alerts' })
  async getAlerts() {
    const alerts: Array<{
      type: 'warning' | 'info' | 'success' | 'error';
      message: string;
      action: string;
      link?: string;
    }> = [];

    // Check for low stock products
    const lowStockProducts = await this.prisma.product.count({
      where: {
        stock: { lte: 10 },
        isActive: true,
      },
    });

    if (lowStockProducts > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowStockProducts} product(s) have low stock`,
        action: 'View Products',
        link: '/admin/products?filter=low-stock',
      });
    }

    // Check for pending orders
    const pendingOrders = await this.prisma.order.count({
      where: { status: 'PENDING' },
    });

    if (pendingOrders > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingOrders} order(s) pending processing`,
        action: 'Process Orders',
        link: '/admin/orders?status=PENDING',
      });
    }

    // Check for pending vendor applications
    const pendingVendors = await this.prisma.vendorApplication.count({
      where: { status: 'PENDING' },
    });

    if (pendingVendors > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingVendors} vendor application(s) pending review`,
        action: 'Review Now',
        link: '/admin/vendors?status=PENDING',
      });
    }

    // Check for pending return requests
    const pendingReturns = await this.prisma.returnRequest.count({
      where: { status: 'PENDING_APPROVAL' },
    });

    if (pendingReturns > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingReturns} return request(s) pending review`,
        action: 'Review Returns',
        link: '/admin/returns?status=PENDING',
      });
    }

    // If no alerts, add a success message
    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        message: 'All systems operational',
        action: 'View Dashboard',
        link: '/admin',
      });
    }

    return alerts;
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns top selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopProducts(@Query('limit') limit: number = 4) {
    // Get top products by sales volume
    const topProductSales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: Number(limit),
    });

    // Get product details
    const productIds = topProductSales.map((item) => item.productId).filter((id): id is string => id !== null);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        stock: true,
        images: true,
      },
    });

    return topProductSales.map((sale) => {
      const product = products.find((p) => p.id === sale.productId);
      return {
        id: sale.productId,
        name: product?.name || 'Unknown Product',
        sales: sale._sum.quantity || 0,
        revenue: (sale._sum.price || 0) * (sale._sum.quantity || 1),
        stock: product?.stock || 0,
        image: product?.images?.[0],
      };
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all dashboard data at once (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all dashboard data' })
  async getDashboardData() {
    const [stats, recentOrders, alerts, topProducts] = await Promise.all([
      this.getStats(),
      this.getRecentOrders(5),
      this.getAlerts(),
      this.getTopProducts(4),
    ]);

    return {
      stats,
      recentOrders,
      alerts,
      topProducts,
    };
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  }
}
