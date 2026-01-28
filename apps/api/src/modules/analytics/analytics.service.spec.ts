import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TimeRange } from './dto/analytics-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  // Mock data
  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    total: 100.0,
    subtotal: 90.0,
    tax: 8.0,
    shipping: 2.0,
    status: 'DELIVERED',
    createdAt: new Date('2025-01-15'),
  };

  const mockOrderItem = {
    id: 'item-1',
    orderId: 'order-123',
    productId: 'product-123',
    quantity: 2,
    price: 45.0,
    product: {
      id: 'product-123',
      name: 'Laptop',
      price: 999.99,
      categoryId: 'cat-1',
      vendorId: 'vendor-1',
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Laptop',
    price: 999.99,
    stock: 5,
    categoryId: 'cat-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesAnalytics', () => {
    it('should return sales analytics with summary and daily breakdown', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: {
          total: 1000.0,
          subtotal: 900.0,
          tax: 80.0,
          shipping: 20.0,
        },
        _avg: {
          total: 100.0,
        },
      });
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrder, createdAt: new Date('2025-01-15'), total: 100.0 },
        { ...mockOrder, createdAt: new Date('2025-01-15'), total: 150.0 },
        { ...mockOrder, createdAt: new Date('2025-01-16'), total: 200.0 },
      ]);

      // Act
      const result = await service.getSalesAnalytics(query);

      // Assert
      expect(result.summary).toEqual({
        totalOrders: 10,
        totalRevenue: 1000.0,
        totalSubtotal: 900.0,
        totalTax: 80.0,
        totalShipping: 20.0,
        averageOrderValue: 100.0,
      });
      expect(result.dailyBreakdown).toHaveLength(2);
      expect(result.dailyBreakdown[0]).toMatchObject({
        date: '2025-01-15',
        revenue: 250.0,
        orders: 2,
      });
      expect(result.dateRange).toBeDefined();
    });

    it('should filter by vendor when vendorId provided', async () => {
      // Arrange
      const query = { range: TimeRange.WEEK, vendorId: 'vendor-123' };
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 500.0, subtotal: 450.0, tax: 40.0, shipping: 10.0 },
        _avg: { total: 100.0 },
      });
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      // Act
      await service.getSalesAnalytics(query);

      // Assert
      expect(mockPrismaService.order.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          items: {
            some: {
              product: {
                vendorId: 'vendor-123',
              },
            },
          },
        }),
      });
    });

    it('should handle custom date range', async () => {
      // Arrange
      const query = {
        range: TimeRange.CUSTOM,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };
      mockPrismaService.order.count.mockResolvedValue(15);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 1500.0, subtotal: 1350.0, tax: 120.0, shipping: 30.0 },
        _avg: { total: 100.0 },
      });
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      // Act
      const result = await service.getSalesAnalytics(query);

      // Assert
      expect(result.dateRange.startDate).toContain('2025-01-01');
      expect(result.dateRange.endDate).toBeDefined();
    });
  });

  describe('getProductAnalytics', () => {
    it('should return product analytics with top selling products', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { ...mockOrderItem, productId: 'product-1', quantity: 5, price: 50.0 },
        { ...mockOrderItem, productId: 'product-1', quantity: 3, price: 50.0 },
        { ...mockOrderItem, productId: 'product-2', quantity: 2, price: 100.0 },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await service.getProductAnalytics(query);

      // Assert
      expect(result.topSellingProducts).toHaveLength(2);
      expect(result.topSellingProducts[0]).toMatchObject({
        productId: 'product-1',
        quantitySold: 8,
        revenue: 400.0,
        timesOrdered: 2,
      });
      expect(result.totalProductsSold).toBe(10);
      expect(result.totalUniqueProducts).toBe(2);
    });

    it('should return low stock and out of stock products', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.product.findMany.mockResolvedValue([
        { ...mockProduct, stock: 5 },
        { ...mockProduct, stock: 2 },
      ]);
      mockPrismaService.product.count.mockResolvedValue(3);

      // Act
      const result = await service.getProductAnalytics(query);

      // Assert
      expect(result.lowStockProducts).toHaveLength(2);
      expect(result.outOfStockCount).toBe(3);
    });

    it('should filter by category and vendor', async () => {
      // Arrange
      const query = {
        range: TimeRange.MONTH,
        categoryId: 'cat-1',
        vendorId: 'vendor-1',
      };
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      await service.getProductAnalytics(query);

      // Assert
      expect(mockPrismaService.orderItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: expect.objectContaining({
              categoryId: 'cat-1',
              vendorId: 'vendor-1',
            }),
          }),
        }),
      );
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should return customer analytics with summary', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // Total customers
        .mockResolvedValueOnce(10) // New customers
        .mockResolvedValueOnce(75); // Customers with orders
      mockPrismaService.order.findMany.mockResolvedValue([
        { userId: 'user-1', total: 100.0 },
        { userId: 'user-1', total: 150.0 },
        { userId: 'user-2', total: 200.0 },
      ]);

      // Act
      const result = await service.getCustomerAnalytics(query);

      // Assert
      expect(result.summary).toEqual({
        totalCustomers: 100,
        newCustomers: 10,
        customersWithOrders: 75,
        averageOrdersPerCustomer: 1.5,
      });
      expect(result.topCustomers).toHaveLength(2);
      expect(result.topCustomers[0]).toMatchObject({
        userId: 'user-1',
        totalSpent: 250.0,
        orderCount: 2,
        averageOrderValue: 125.0,
      });
    });

    it('should return top customers sorted by spending', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };
      mockPrismaService.user.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(50);
      mockPrismaService.order.findMany.mockResolvedValue([
        { userId: 'user-1', total: 500.0 },
        { userId: 'user-2', total: 1000.0 },
        { userId: 'user-3', total: 300.0 },
      ]);

      // Act
      const result = await service.getCustomerAnalytics(query);

      // Assert
      expect(result.topCustomers[0].userId).toBe('user-2');
      expect(result.topCustomers[0].totalSpent).toBe(1000.0);
      expect(result.topCustomers[1].userId).toBe('user-1');
      expect(result.topCustomers[1].totalSpent).toBe(500.0);
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should return inventory analytics with summary', async () => {
      // Arrange
      const query = {};
      mockPrismaService.product.count
        .mockResolvedValueOnce(100) // Total products
        .mockResolvedValueOnce(10) // Low stock
        .mockResolvedValueOnce(5); // Out of stock
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { stock: 1000 },
      });
      mockPrismaService.product.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { stock: 500 }, _count: { id: 50 } },
        { categoryId: 'cat-2', _sum: { stock: 500 }, _count: { id: 50 } },
      ]);

      // Act
      const result = await service.getInventoryAnalytics(query);

      // Assert
      expect(result.summary).toEqual({
        totalProducts: 100,
        totalStockUnits: 1000,
        lowStockProducts: 10,
        outOfStockProducts: 5,
        averageStockPerProduct: 10,
      });
      expect(result.stockByCategory).toHaveLength(2);
    });

    it('should filter by vendor and category', async () => {
      // Arrange
      const query = { vendorId: 'vendor-1', categoryId: 'cat-1' };
      mockPrismaService.product.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { stock: 500 },
      });
      mockPrismaService.product.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { stock: 500 }, _count: { id: 50 } },
      ]);

      // Act
      await service.getInventoryAnalytics(query);

      // Assert
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { vendorId: 'vendor-1', categoryId: 'cat-1' },
      });
    });
  });

  describe('getVendorAnalytics', () => {
    it('should return vendor-specific analytics', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const query = { range: TimeRange.MONTH };
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { ...mockOrderItem, quantity: 2, price: 50.0 },
        { ...mockOrderItem, quantity: 3, price: 100.0 },
      ]);
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { stock: 100 },
      });

      // Act
      const result = await service.getVendorAnalytics(vendorId, query);

      // Assert
      expect(result.summary).toEqual({
        totalProducts: 10,
        totalRevenue: 400.0,
        totalItemsSold: 5,
        totalStock: 100,
        averageRevenuePerProduct: 40.0,
      });
      expect(result.dateRange).toBeDefined();
    });

    it('should filter orders by date range and vendor', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const query = { range: TimeRange.WEEK };
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { stock: 100 },
      });

      // Act
      await service.getVendorAnalytics(vendorId, query);

      // Assert
      expect(mockPrismaService.orderItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: {
              vendorId: 'vendor-123',
            },
            order: expect.objectContaining({
              createdAt: expect.any(Object),
              status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
            }),
          }),
        }),
      );
    });
  });

  describe('getDashboardOverview', () => {
    it('should return comprehensive dashboard data', async () => {
      // Arrange
      const query = { range: TimeRange.MONTH };

      // Mock sales analytics
      mockPrismaService.order.count.mockResolvedValue(10);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 1000.0, subtotal: 900.0, tax: 80.0, shipping: 20.0 },
        _avg: { total: 100.0 },
      });
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      // Mock product analytics
      mockPrismaService.orderItem.findMany.mockResolvedValue([mockOrderItem]);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(5);

      // Mock customer analytics
      mockPrismaService.user.count.mockResolvedValue(100);

      // Mock inventory analytics
      mockPrismaService.product.aggregate.mockResolvedValue({
        _sum: { stock: 1000 },
      });
      mockPrismaService.product.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { stock: 1000 }, _count: { id: 100 } },
      ]);

      // Act
      const result = await service.getDashboardOverview(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.sales).toBeDefined();
      expect(result.sales.totalOrders).toBe(10);
      expect(result.sales.totalRevenue).toBe(1000.0);
      expect(result.products).toBeDefined();
      expect(result.products.topSelling).toBeDefined();
      expect(result.products.lowStock).toBeDefined();
      expect(result.products.outOfStock).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.customers.totalCustomers).toBeDefined();
      expect(result.inventory).toBeDefined();
      expect(result.inventory.totalProducts).toBeDefined();
      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.startDate).toBeDefined();
      expect(result.dateRange.endDate).toBeDefined();
    });
  });
});
