import { Test, TestingModule } from '@nestjs/testing';
import { VendorAnalyticsService, DateRange } from './vendor-analytics.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('VendorAnalyticsService', () => {
  let service: VendorAnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    orderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    productView: {
      findMany: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
    refund: {
      aggregate: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    vendorProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
    averageRating: 4.5,
    commissionRate: 15,
  };

  const mockDateRange: DateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorAnalyticsService>(VendorAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesMetrics', () => {
    it('should return sales metrics for date range', async () => {
      const mockOrderItems = [
        {
          id: 'item-1',
          orderId: 'order-1',
          price: 100,
          quantity: 2,
          order: { id: 'order-1' },
        },
        {
          id: 'item-2',
          orderId: 'order-1',
          price: 50,
          quantity: 1,
          order: { id: 'order-1' },
        },
      ];

      mockPrismaService.orderItem.findMany.mockResolvedValue(mockOrderItems);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 20 } });

      const result = await service.getSalesMetrics('vendor-123', mockDateRange);

      expect(result).toEqual({
        totalRevenue: 250,
        totalOrders: 1,
        totalUnits: 3,
        averageOrderValue: 250,
        refundedAmount: 20,
        netRevenue: 230,
      });
    });

    it('should handle zero orders', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getSalesMetrics('vendor-123', mockDateRange);

      expect(result.totalOrders).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.netRevenue).toBe(0);
    });
  });

  describe('getSalesComparison', () => {
    it('should compare sales between periods', async () => {
      mockPrismaService.orderItem.findMany
        .mockResolvedValueOnce([
          { id: 'item-1', orderId: 'order-1', price: 100, quantity: 1, order: { id: 'order-1' } },
        ])
        .mockResolvedValueOnce([
          { id: 'item-2', orderId: 'order-2', price: 80, quantity: 1, order: { id: 'order-2' } },
        ]);

      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const result = await service.getSalesComparison('vendor-123', 'month');

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('previous');
      expect(result).toHaveProperty('changes');
      expect(result.changes).toHaveProperty('revenue');
      expect(result.changes).toHaveProperty('orders');
    });

    it('should handle zero previous period', async () => {
      mockPrismaService.orderItem.findMany
        .mockResolvedValueOnce([
          { id: 'item-1', orderId: 'order-1', price: 100, quantity: 1, order: { id: 'order-1' } },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const result = await service.getSalesComparison('vendor-123', 'month');

      expect(result.changes.revenue).toBe(100); // 100% increase when previous is 0
    });
  });

  describe('getProductMetrics', () => {
    it('should return product metrics', async () => {
      mockPrismaService.product.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // active
        .mockResolvedValueOnce(2) // out of stock
        .mockResolvedValueOnce(5); // low stock

      mockPrismaService.product.aggregate.mockResolvedValue({
        _avg: { price: 99.99 },
      });

      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getProductMetrics('vendor-123');

      expect(result).toEqual({
        totalProducts: 50,
        activeProducts: 45,
        outOfStock: 2,
        lowStock: 5,
        averagePrice: 99.99,
        topSellingProducts: [],
      });
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top selling products', async () => {
      const mockGroupedItems = [
        { productId: 'prod-1', _sum: { quantity: 100, price: 50 }, _count: { productId: 20 } },
        { productId: 'prod-2', _sum: { quantity: 75, price: 100 }, _count: { productId: 15 } },
      ];

      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', slug: 'product-1', images: ['img1.jpg'], price: 50, stock: 100 },
        { id: 'prod-2', name: 'Product 2', slug: 'product-2', images: ['img2.jpg'], price: 100, stock: 50 },
      ];

      mockPrismaService.orderItem.groupBy.mockResolvedValue(mockGroupedItems);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.getTopSellingProducts('vendor-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('unitsSold', 100);
      expect(result[0]).toHaveProperty('name', 'Product 1');
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.getTopSellingProducts('vendor-123', 5);

      expect(mockPrismaService.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getTrafficMetrics', () => {
    it('should return traffic metrics', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);

      mockPrismaService.productView.findMany.mockResolvedValue([
        { userId: 'user-1', sessionId: 'sess-1' },
        { userId: 'user-2', sessionId: 'sess-2' },
        { userId: 'user-1', sessionId: 'sess-1' }, // Duplicate
      ]);

      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const result = await service.getTrafficMetrics('vendor-123', mockDateRange);

      expect(result).toEqual({
        totalViews: 3,
        uniqueVisitors: 2,
        conversionRate: 0,
        averageTimeOnPage: 0,
      });
    });

    it('should calculate conversion rate', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);

      mockPrismaService.productView.findMany.mockResolvedValue(
        Array(100).fill({ userId: 'user-1', sessionId: 'sess-1' }),
      );

      // 5 orders from 100 views = 5% conversion
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { orderId: 'o1', price: 10, quantity: 1, order: { id: 'o1' } },
        { orderId: 'o2', price: 10, quantity: 1, order: { id: 'o2' } },
        { orderId: 'o3', price: 10, quantity: 1, order: { id: 'o3' } },
        { orderId: 'o4', price: 10, quantity: 1, order: { id: 'o4' } },
        { orderId: 'o5', price: 10, quantity: 1, order: { id: 'o5' } },
      ]);

      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });

      const result = await service.getTrafficMetrics('vendor-123', mockDateRange);

      expect(result.conversionRate).toBe(5);
    });
  });

  describe('getCustomerMetrics', () => {
    it('should return customer metrics', async () => {
      // Current period orders
      mockPrismaService.orderItem.findMany
        .mockResolvedValueOnce([
          { orderId: 'o1', order: { userId: 'user-1' } },
          { orderId: 'o2', order: { userId: 'user-2' } },
        ])
        // Previous period orders
        .mockResolvedValueOnce([
          { orderId: 'o0', order: { userId: 'user-1' } },
        ])
        // For top customers
        .mockResolvedValueOnce([]);

      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.orderItem.aggregate.mockResolvedValue({ _sum: { price: 1000 } });

      const result = await service.getCustomerMetrics('vendor-123', mockDateRange);

      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('newCustomers');
      expect(result).toHaveProperty('returningCustomers');
      expect(result).toHaveProperty('averageLifetimeValue');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);

      mockPrismaService.review.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 2 },
        { rating: 1 },
      ]);

      mockPrismaService.orderItem.findMany.mockResolvedValue([
        {
          order: {
            status: OrderStatus.DELIVERED,
            estimatedDeliveryDate: new Date('2024-01-15'),
            actualDeliveryDate: new Date('2024-01-14'),
          },
        },
      ]);

      const result = await service.getPerformanceMetrics('vendor-123', mockDateRange);

      expect(result).toEqual({
        sellerRating: 4.5,
        totalReviews: 5,
        positiveReviews: 2, // ratings >= 4
        negativeReviews: 2, // ratings <= 2
        responseTime: 0,
        fulfillmentRate: 100,
        onTimeDeliveryRate: 100,
      });
    });
  });

  describe('getRecentOrders', () => {
    it('should return recent orders', async () => {
      const mockOrders = [
        {
          orderId: 'order-1',
          quantity: 2,
          price: 50,
          order: {
            createdAt: new Date(),
            status: OrderStatus.PROCESSING,
            user: { id: 'user-1', name: 'John', email: 'john@test.com' },
          },
          product: { id: 'prod-1', name: 'Product 1', images: ['img.jpg'] },
        },
      ];

      mockPrismaService.orderItem.findMany.mockResolvedValue(mockOrders);

      const result = await service.getRecentOrders('vendor-123', 10);

      expect(result).toHaveLength(1);
      // The service returns: id, orderNumber, total, status, createdAt
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('orderNumber');
      expect(result[0]).toHaveProperty('total');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('createdAt');
    });
  });

  describe('getSalesTrend', () => {
    it('should return daily sales trend', async () => {
      const mockOrderItems = [
        {
          orderId: 'o1',
          price: 100,
          quantity: 1,
          order: { createdAt: new Date('2024-01-15') },
        },
        {
          orderId: 'o2',
          price: 50,
          quantity: 2,
          order: { createdAt: new Date('2024-01-15') },
        },
      ];

      mockPrismaService.orderItem.findMany.mockResolvedValue(mockOrderItems);

      const result = await service.getSalesTrend('vendor-123', mockDateRange, 'month');

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('orders');
    });
  });

  describe('getTopCategories', () => {
    it('should return top performing categories', async () => {
      const mockOrderItems = [
        {
          price: 100,
          quantity: 2,
          product: {
            categoryId: 'cat-1',
            category: { name: 'Electronics' },
          },
        },
        {
          price: 50,
          quantity: 1,
          product: {
            categoryId: 'cat-2',
            category: { name: 'Clothing' },
          },
        },
      ];

      mockPrismaService.orderItem.findMany.mockResolvedValue(mockOrderItems);

      const result = await service.getTopCategories('vendor-123', mockDateRange);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('units');
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should return revenue breakdown with commissions', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { orderId: 'o1', price: 100, quantity: 1, order: { id: 'o1' } },
      ]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 10 } });
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue({
        commissionRate: 15,
      });

      const result = await service.getRevenueBreakdown('vendor-123', mockDateRange);

      expect(result).toHaveProperty('grossRevenue', 100);
      expect(result).toHaveProperty('refunds', 10);
      expect(result).toHaveProperty('commissionRate', 15);
      expect(result).toHaveProperty('commissionAmount', 15); // 15% of 100
      expect(result).toHaveProperty('netEarnings', 75); // 100 - 15 - 10
    });
  });

  describe('getDashboardOverview', () => {
    it('should return comprehensive dashboard data', async () => {
      // Set up all required mocks
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.aggregate.mockResolvedValue({ _avg: { price: 0 } });
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.productView.findMany.mockResolvedValue([]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.orderItem.aggregate.mockResolvedValue({ _sum: { price: 0 } });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview('vendor-123', 'month');

      expect(result).toHaveProperty('period', 'month');
      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('traffic');
      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('recentOrders');
      expect(result).toHaveProperty('salesTrend');
      expect(result).toHaveProperty('topCategories');
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics data as JSON', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.aggregate.mockResolvedValue({ _avg: { price: 0 } });
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.orderItem.aggregate.mockResolvedValue({ _sum: { price: 0 } });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.exportAnalytics('vendor-123', mockDateRange, 'json');

      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('products');
    });

    it('should export analytics data as CSV', async () => {
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 } });
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.aggregate.mockResolvedValue({ _avg: { price: 0 } });
      mockPrismaService.orderItem.groupBy.mockResolvedValue([]);
      mockPrismaService.orderItem.aggregate.mockResolvedValue({ _sum: { price: 0 } });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.exportAnalytics('vendor-123', mockDateRange, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('Date,Revenue,Orders');
    });
  });
});
