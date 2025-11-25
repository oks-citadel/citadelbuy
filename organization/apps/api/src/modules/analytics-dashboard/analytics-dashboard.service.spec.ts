import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AnalyticsPeriod } from '@prisma/client';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorAnalytics: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    productAnalytics: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    revenueAnalytics: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    trafficAnalytics: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    categoryAnalytics: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    productView: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVendorOverview', () => {
    it('should return aggregated vendor analytics', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockAnalytics = [
        {
          totalRevenue: 1000,
          totalOrders: 10,
          totalUnits: 50,
          totalViews: 500,
          conversionRate: 2,
          adSpend: 100,
          adConversions: 5,
        },
        {
          totalRevenue: 1500,
          totalOrders: 15,
          totalUnits: 75,
          totalViews: 600,
          conversionRate: 2.5,
          adSpend: 150,
          adConversions: 8,
        },
      ];

      mockPrismaService.vendorAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getVendorOverview(vendorId, startDate, endDate);

      expect(result).toEqual({
        totalRevenue: 2500,
        totalOrders: 25,
        totalUnits: 125,
        totalViews: 1100,
        adSpend: 250,
        adConversions: 13,
        averageOrderValue: 100,
        averageConversionRate: 2.25,
        timeSeriesData: mockAnalytics,
      });

      expect(mockPrismaService.vendorAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          vendorId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: {
          date: 'asc',
        },
      });
    });

    it('should handle empty analytics data', async () => {
      mockPrismaService.vendorAnalytics.findMany.mockResolvedValue([]);

      const result = await service.getVendorOverview('vendor-1', new Date(), new Date());

      expect(result).toEqual({
        totalRevenue: 0,
        totalOrders: 0,
        totalUnits: 0,
        totalViews: 0,
        adSpend: 0,
        adConversions: 0,
        averageOrderValue: 0,
        averageConversionRate: 0,
        timeSeriesData: [],
      });
    });
  });

  describe('getVendorSales', () => {
    it('should return vendor sales time series by period', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const period = AnalyticsPeriod.DAILY;

      const mockSales = [
        {
          date: new Date('2024-01-01'),
          totalRevenue: 500,
          totalOrders: 5,
          averageOrderValue: 100,
          totalUnits: 25,
        },
        {
          date: new Date('2024-01-02'),
          totalRevenue: 600,
          totalOrders: 6,
          averageOrderValue: 100,
          totalUnits: 30,
        },
      ];

      mockPrismaService.vendorAnalytics.findMany.mockResolvedValue(mockSales);

      const result = await service.getVendorSales(vendorId, startDate, endDate, period);

      expect(result).toEqual(mockSales);
      expect(mockPrismaService.vendorAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          vendorId,
          period,
          date: { gte: startDate, lte: endDate },
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
    });
  });

  describe('getVendorProductPerformance', () => {
    it('should return top performing products for vendor', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const limit = 10;

      const mockProducts = [
        {
          id: 'product-1',
          name: 'Product 1',
          slug: 'product-1',
          price: 100,
          images: ['image1.jpg'],
        },
        {
          id: 'product-2',
          name: 'Product 2',
          slug: 'product-2',
          price: 150,
          images: ['image2.jpg'],
        },
      ];

      const mockAnalytics = [
        {
          productId: 'product-1',
          views: 200,
          purchases: 50,
          revenue: 5000,
          addToCart: 100,
        },
        {
          productId: 'product-2',
          views: 150,
          purchases: 30,
          revenue: 4500,
          addToCart: 75,
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getVendorProductPerformance(vendorId, startDate, endDate, limit);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
        price: 100,
        images: ['image1.jpg'],
        views: 200,
        purchases: 50,
        revenue: 5000,
        addToCart: 100,
        conversionRate: 25, // (50/200) * 100
      });
    });

    it('should use default limit of 10 when not specified', async () => {
      const mockProducts = Array.from({ length: 15 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        slug: `product-${i}`,
        price: 100,
        images: [],
      }));

      const mockAnalytics = mockProducts.map((p) => ({
        productId: p.id,
        views: 100,
        purchases: 10,
        revenue: 1000,
        addToCart: 50,
      }));

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getVendorProductPerformance('vendor-1', new Date(), new Date());

      expect(result).toHaveLength(10);
    });
  });

  describe('getProductAnalytics', () => {
    it('should return aggregated analytics for specific product', async () => {
      const productId = 'product-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const period = AnalyticsPeriod.DAILY;

      const mockAnalytics = [
        {
          date: new Date('2024-01-01'),
          views: 100,
          uniqueViews: 80,
          addToCart: 20,
          purchases: 10,
          revenue: 1000,
        },
        {
          date: new Date('2024-01-02'),
          views: 150,
          uniqueViews: 120,
          addToCart: 30,
          purchases: 15,
          revenue: 1500,
        },
      ];

      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getProductAnalytics(productId, startDate, endDate, period);

      expect(result).toEqual({
        views: 250,
        uniqueViews: 200,
        addToCart: 50,
        purchases: 25,
        revenue: 2500,
        conversionRate: 10, // (25/250) * 100
        cartConversion: 50, // (25/50) * 100
        timeSeriesData: mockAnalytics,
      });

      expect(mockPrismaService.productAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          productId,
          period,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: {
          date: 'asc',
        },
      });
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should return aggregated revenue breakdown', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockRevenue = [
        {
          productRevenue: 5000,
          subscriptionRevenue: 500,
          adRevenue: 200,
          bnplRevenue: 100,
          platformFees: 300,
          paymentFees: 150,
          grossRevenue: 5800,
          netRevenue: 5350,
          totalOrders: 50,
          completedOrders: 45,
          cancelledOrders: 5,
          totalRefunds: 100,
        },
        {
          productRevenue: 6000,
          subscriptionRevenue: 600,
          adRevenue: 250,
          bnplRevenue: 120,
          platformFees: 350,
          paymentFees: 180,
          grossRevenue: 6970,
          netRevenue: 6440,
          totalOrders: 60,
          completedOrders: 55,
          cancelledOrders: 5,
          totalRefunds: 150,
        },
      ];

      mockPrismaService.revenueAnalytics.findMany.mockResolvedValue(mockRevenue);

      const result = await service.getRevenueBreakdown(startDate, endDate);

      expect(result).toEqual({
        productRevenue: 11000,
        subscriptionRevenue: 1100,
        adRevenue: 450,
        bnplRevenue: 220,
        platformFees: 650,
        paymentFees: 330,
        grossRevenue: 12770,
        netRevenue: 11790,
        totalOrders: 110,
        completedOrders: 100,
        cancelledOrders: 10,
        totalRefunds: 250,
      });

      expect(mockPrismaService.revenueAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          date: { gte: startDate, lte: endDate },
        },
      });
    });
  });

  describe('getTrafficAnalytics', () => {
    it('should return traffic analytics time series', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const period = AnalyticsPeriod.DAILY;

      const mockTraffic = [
        {
          date: new Date('2024-01-01'),
          totalPageViews: 1000,
          uniqueVisitors: 500,
        },
        {
          date: new Date('2024-01-02'),
          totalPageViews: 1200,
          uniqueVisitors: 600,
        },
      ];

      mockPrismaService.trafficAnalytics.findMany.mockResolvedValue(mockTraffic);

      const result = await service.getTrafficAnalytics(startDate, endDate, period);

      expect(result).toEqual(mockTraffic);
      expect(mockPrismaService.trafficAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          period,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: {
          date: 'asc',
        },
      });
    });
  });

  describe('getCategoryAnalytics', () => {
    it('should return aggregated and sorted category analytics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockAnalytics = [
        {
          categoryId: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
          },
          totalRevenue: 2000,
          totalOrders: 20,
          totalUnits: 40,
          views: 400,
          searches: 50,
        },
        {
          categoryId: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
          },
          totalRevenue: 3000,
          totalOrders: 30,
          totalUnits: 60,
          views: 600,
          searches: 70,
        },
        {
          categoryId: 'cat-2',
          category: {
            id: 'cat-2',
            name: 'Clothing',
            slug: 'clothing',
          },
          totalRevenue: 4000,
          totalOrders: 80,
          totalUnits: 150,
          views: 1200,
          searches: 100,
        },
      ];

      mockPrismaService.categoryAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getCategoryAnalytics(startDate, endDate);

      expect(result).toHaveLength(2);
      // Should be sorted by totalRevenue desc
      expect(result[0]).toEqual({
        category: {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
        },
        totalRevenue: 5000, // 2000 + 3000
        totalOrders: 50,    // 20 + 30
        totalUnits: 100,    // 40 + 60
        views: 1000,        // 400 + 600
        searches: 120,      // 50 + 70
      });

      expect(result[1]).toEqual({
        category: {
          id: 'cat-2',
          name: 'Clothing',
          slug: 'clothing',
        },
        totalRevenue: 4000,
        totalOrders: 80,
        totalUnits: 150,
        views: 1200,
        searches: 100,
      });

      expect(mockPrismaService.categoryAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          date: { gte: startDate, lte: endDate },
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
    });
  });

  describe('getRealTimeDashboard', () => {
    it('should return real-time dashboard metrics without vendor filter', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.order.count.mockResolvedValueOnce(25); // todayOrders
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { total: 2500 },
      }); // todayRevenue
      mockPrismaService.product.count
        .mockResolvedValueOnce(100) // activeProducts
        .mockResolvedValueOnce(15) // lowStockProducts
        .mockResolvedValueOnce(5); // outOfStock
      mockPrismaService.order.count.mockResolvedValueOnce(10); // pendingOrders

      const result = await service.getRealTimeDashboard();

      expect(result).toEqual({
        todayOrders: 25,
        todayRevenue: 2500,
        activeProducts: 100,
        lowStockProducts: 15,
        outOfStock: 5,
        pendingOrders: 10,
      });

      expect(mockPrismaService.order.count).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: today },
        },
      });
    });

    it('should return real-time dashboard metrics filtered by vendor', async () => {
      const vendorId = 'vendor-1';
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.order.count.mockResolvedValueOnce(10);
      mockPrismaService.order.aggregate.mockResolvedValueOnce({
        _sum: { total: 1000 },
      });
      mockPrismaService.product.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2);
      mockPrismaService.order.count.mockResolvedValueOnce(5);

      const result = await service.getRealTimeDashboard(vendorId);

      expect(result).toEqual({
        todayOrders: 10,
        todayRevenue: 1000,
        activeProducts: 50,
        lowStockProducts: 8,
        outOfStock: 2,
        pendingOrders: 5,
      });

      expect(mockPrismaService.order.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            items: {
              some: {
                product: {
                  vendorId,
                },
              },
            },
          }),
        })
      );
    });

    it('should handle null revenue sum', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: null },
      });
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.getRealTimeDashboard();

      expect(result.todayRevenue).toBe(0);
    });
  });

  describe('getComparisonData', () => {
    it('should return comparison between current and previous period', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-31');

      const currentPeriod = {
        totalRevenue: 5000,
        totalOrders: 50,
        totalViews: 1000,
        averageConversionRate: 5,
      };

      const previousPeriod = {
        totalRevenue: 4000,
        totalOrders: 40,
        totalViews: 800,
        averageConversionRate: 5,
      };

      mockPrismaService.vendorAnalytics.findMany
        .mockResolvedValueOnce([currentPeriod])
        .mockResolvedValueOnce([previousPeriod]);

      const result = await service.getComparisonData(vendorId, startDate, endDate);

      expect(result.current.totalRevenue).toBe(5000);
      expect(result.previous.totalRevenue).toBe(4000);
      expect(result.changes.revenue).toBe(25); // (5000-4000)/4000 * 100
      expect(result.changes.orders).toBe(25); // (50-40)/40 * 100
      expect(result.changes.views).toBe(25); // (1000-800)/800 * 100
    });

    it('should handle zero previous values', async () => {
      const currentPeriod = {
        totalRevenue: 5000,
        totalOrders: 50,
        totalViews: 1000,
        averageConversionRate: 5,
      };

      const previousPeriod = {
        totalRevenue: 0,
        totalOrders: 0,
        totalViews: 0,
        averageConversionRate: 0,
      };

      mockPrismaService.vendorAnalytics.findMany
        .mockResolvedValueOnce([currentPeriod])
        .mockResolvedValueOnce([previousPeriod]);

      const result = await service.getComparisonData(
        'vendor-1',
        new Date('2024-01-15'),
        new Date('2024-01-31')
      );

      expect(result.changes.revenue).toBe(100);
      expect(result.changes.orders).toBe(100);
    });

    it('should return 0% change when both periods are zero', async () => {
      const zeroPeriod = {
        totalRevenue: 0,
        totalOrders: 0,
        totalViews: 0,
        averageConversionRate: 0,
      };

      mockPrismaService.vendorAnalytics.findMany
        .mockResolvedValueOnce([zeroPeriod])
        .mockResolvedValueOnce([zeroPeriod]);

      const result = await service.getComparisonData(
        'vendor-1',
        new Date('2024-01-15'),
        new Date('2024-01-31')
      );

      expect(result.changes.revenue).toBe(0);
      expect(result.changes.orders).toBe(0);
    });
  });

  describe('aggregateDailyAnalytics', () => {
    it('should orchestrate daily analytics aggregation for all vendors', async () => {
      const date = new Date('2024-01-15');

      const mockVendors = [{ id: 'vendor-1' }, { id: 'vendor-2' }];

      mockPrismaService.user.findMany.mockResolvedValue(mockVendors);
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.productView.count.mockResolvedValue(0);
      mockPrismaService.productView.groupBy.mockResolvedValue([]);
      mockPrismaService.vendorAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.revenueAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.trafficAnalytics.upsert.mockResolvedValue({});

      await service.aggregateDailyAnalytics(date);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'VENDOR' },
        select: { id: true },
      });

      // Should aggregate for each vendor
      expect(mockPrismaService.vendorAnalytics.upsert).toHaveBeenCalledTimes(2);

      // Should aggregate revenue and traffic once
      expect(mockPrismaService.revenueAnalytics.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.trafficAnalytics.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('aggregateVendorAnalytics (private)', () => {
    it('should aggregate vendor analytics and upsert to database', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-15');
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date('2024-01-15');
      endDate.setHours(23, 59, 59, 999);

      const mockOrders = [
        {
          id: 'order-1',
          total: 100,
          items: [
            {
              quantity: 2,
              product: { id: 'prod-1', vendorId: 'vendor-1' },
            },
          ],
        },
        {
          id: 'order-2',
          total: 150,
          items: [
            {
              quantity: 3,
              product: { id: 'prod-2', vendorId: 'vendor-1' },
            },
          ],
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.product.count
        .mockResolvedValueOnce(25) // total products
        .mockResolvedValueOnce(20) // active products
        .mockResolvedValueOnce(3); // out of stock
      mockPrismaService.productView.count.mockResolvedValue(500);
      mockPrismaService.vendorAnalytics.upsert.mockResolvedValue({});

      // Access private method through service
      await service['aggregateVendorAnalytics'](vendorId, startDate, endDate);

      expect(mockPrismaService.vendorAnalytics.upsert).toHaveBeenCalledWith({
        where: {
          vendorId_period_date: {
            vendorId,
            period: AnalyticsPeriod.DAILY,
            date: startDate,
          },
        },
        create: expect.objectContaining({
          vendorId,
          period: AnalyticsPeriod.DAILY,
          totalRevenue: 250,
          totalOrders: 2,
          averageOrderValue: 125,
          totalUnits: 5,
          totalProducts: 25,
          activeProducts: 20,
          outOfStock: 3,
          totalViews: 500,
          conversionRate: 0.4, // (2/500) * 100
        }),
        update: expect.objectContaining({
          totalRevenue: 250,
          totalOrders: 2,
        }),
      });
    });

    it('should handle vendors with no orders', async () => {
      const vendorId = 'vendor-1';
      const startDate = new Date('2024-01-15');
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date('2024-01-15');
      endDate.setHours(23, 59, 59, 999);

      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.productView.count.mockResolvedValue(0);
      mockPrismaService.vendorAnalytics.upsert.mockResolvedValue({});

      await service['aggregateVendorAnalytics'](vendorId, startDate, endDate);

      expect(mockPrismaService.vendorAnalytics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            totalRevenue: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            conversionRate: 0,
          }),
        })
      );
    });
  });

  describe('aggregateRevenueAnalytics (private)', () => {
    it('should aggregate revenue analytics and upsert to database', async () => {
      const startDate = new Date('2024-01-15');
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date('2024-01-15');
      endDate.setHours(23, 59, 59, 999);

      const mockOrders = [
        { id: 'order-1', total: 100, status: 'DELIVERED' },
        { id: 'order-2', total: 150, status: 'PENDING' },
        { id: 'order-3', total: 200, status: 'CANCELLED' },
        { id: 'order-4', total: 120, status: 'DELIVERED' },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.revenueAnalytics.upsert.mockResolvedValue({});

      await service['aggregateRevenueAnalytics'](startDate, endDate);

      expect(mockPrismaService.revenueAnalytics.upsert).toHaveBeenCalledWith({
        where: {
          period_date: {
            period: AnalyticsPeriod.DAILY,
            date: startDate,
          },
        },
        create: expect.objectContaining({
          period: AnalyticsPeriod.DAILY,
          productRevenue: 370, // 100 + 150 + 120 (excludes cancelled)
          grossRevenue: 370,
          netRevenue: 370,
          totalOrders: 4,
          completedOrders: 2,
          cancelledOrders: 1,
        }),
        update: expect.objectContaining({
          productRevenue: 370,
          totalOrders: 4,
          completedOrders: 2,
          cancelledOrders: 1,
        }),
      });
    });
  });

  describe('aggregateTrafficAnalytics (private)', () => {
    it('should aggregate traffic analytics and upsert to database', async () => {
      const startDate = new Date('2024-01-15');
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date('2024-01-15');
      endDate.setHours(23, 59, 59, 999);

      mockPrismaService.productView.count.mockResolvedValue(1500);
      mockPrismaService.productView.groupBy.mockResolvedValue([
        { sessionId: 'session-1' },
        { sessionId: 'session-2' },
        { sessionId: 'session-3' },
      ]);
      mockPrismaService.trafficAnalytics.upsert.mockResolvedValue({});

      await service['aggregateTrafficAnalytics'](startDate, endDate);

      expect(mockPrismaService.trafficAnalytics.upsert).toHaveBeenCalledWith({
        where: {
          period_date: {
            period: AnalyticsPeriod.DAILY,
            date: startDate,
          },
        },
        create: {
          period: AnalyticsPeriod.DAILY,
          date: startDate,
          totalPageViews: 1500,
          uniqueVisitors: 3,
        },
        update: {
          totalPageViews: 1500,
          uniqueVisitors: 3,
        },
      });

      expect(mockPrismaService.productView.groupBy).toHaveBeenCalledWith({
        by: ['sessionId'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          sessionId: { not: null },
        },
      });
    });
  });
});
