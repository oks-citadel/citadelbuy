import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEmailService = {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order successfully', async () => {
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 2, price: 29.99 },
          { productId: 'product-2', quantity: 1, price: 49.99 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          phone: '555-1234',
        },
        subtotal: 109.97,
        tax: 9.90,
        shipping: 9.99,
        total: 129.86,
      };

      const mockProduct1 = { id: 'product-1', stock: 10 };
      const mockProduct2 = { id: 'product-2', stock: 5 };

      const mockOrder = {
        id: 'order-123',
        userId,
        ...createOrderDto,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        items: [],
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
      };

      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(userId, createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          status: 'PENDING',
          subtotal: createOrderDto.subtotal,
          tax: createOrderDto.tax,
          shipping: createOrderDto.shipping,
          total: createOrderDto.total,
        }),
        include: expect.any(Object),
      });
    });

  });

  describe('findByUserId', () => {
    it('should return all orders for a user', async () => {
      const userId = 'user-123';
      const mockOrders = [
        {
          id: 'order-1',
          userId,
          status: 'DELIVERED',
          total: 129.86,
          createdAt: new Date(),
        },
        {
          id: 'order-2',
          userId,
          status: 'PROCESSING',
          total: 59.99,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findByUserId(userId);

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no orders', async () => {
      const userId = 'user-123';

      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a single order by ID', async () => {
      const orderId = 'order-123';
      const userId = 'user-123';
      const mockOrder = {
        id: orderId,
        userId,
        status: 'PROCESSING',
        total: 129.86,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            price: 29.99,
            product: {
              id: 'product-1',
              name: 'Test Product',
              images: ['image1.jpg'],
            },
          },
        ],
      };

      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findById(orderId, userId);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: orderId }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      const orderId = 'nonexistent-order';
      const userId = 'user-123';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findById(orderId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 'order-123';
      const newStatus = 'SHIPPED';

      const existingOrder = {
        id: orderId,
        status: 'PROCESSING',
        userId: 'user-123',
      };

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        updatedAt: new Date(),
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderStatus(orderId, newStatus as any);

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          status: newStatus,
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should update order with payment data', async () => {
      const orderId = 'order-123';
      const newStatus = 'PROCESSING';
      const paymentData = {
        paymentIntentId: 'pi_123456',
        paymentMethod: 'card',
      };

      const existingOrder = {
        id: orderId,
        status: 'PENDING',
        userId: 'user-123',
      };

      const updatedOrder = {
        ...existingOrder,
        status: newStatus,
        paymentIntentId: paymentData.paymentIntentId,
        paymentMethod: paymentData.paymentMethod,
        updatedAt: new Date(),
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderStatus(
        orderId,
        newStatus as any,
        paymentData,
      );

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          status: newStatus,
          paymentIntentId: paymentData.paymentIntentId,
          paymentMethod: paymentData.paymentMethod,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const orderId = 'nonexistent-order';
      const newStatus = 'SHIPPED';

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(orderId, newStatus as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders without filter', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'PROCESSING', total: 100 },
        { id: 'order-2', status: 'SHIPPED', total: 200 },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result).toEqual({
        data: mockOrders,
        meta: expect.objectContaining({
          total: 2,
          page: 1,
          limit: 20,
        }),
      });
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter orders by status and return paginated results', async () => {
      const status = 'PROCESSING';
      const mockOrders = [
        { id: 'order-1', status: 'PROCESSING', total: 100 },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll(status as any);

      expect(result).toEqual({
        data: mockOrders,
        meta: expect.objectContaining({
          total: 1,
          page: 1,
          limit: 20,
        }),
      });
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { status },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(25) // processing
        .mockResolvedValueOnce(30) // shipped
        .mockResolvedValueOnce(30) // delivered
        .mockResolvedValueOnce(5); // cancelled

      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 15234.5 },
      });

      const result = await service.getOrderStats();

      expect(result).toEqual({
        totalOrders: 100,
        ordersByStatus: {
          pending: 10,
          processing: 25,
          shipped: 30,
          delivered: 30,
          cancelled: 5,
        },
        totalRevenue: 15234.5,
      });
    });

    it('should handle zero revenue', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // pending
        .mockResolvedValueOnce(0) // processing
        .mockResolvedValueOnce(0) // shipped
        .mockResolvedValueOnce(0) // delivered
        .mockResolvedValueOnce(0); // cancelled

      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getOrderStats();

      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('updateOrderPayment', () => {
    it('should update order with payment information', async () => {
      const orderId = 'order-123';
      const paymentIntentId = 'pi_123456';
      const paymentMethod = 'card';

      const updatedOrder = {
        id: orderId,
        paymentIntentId,
        paymentMethod,
        status: 'PROCESSING',
        updatedAt: new Date(),
      };

      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderPayment(
        orderId,
        paymentIntentId,
        paymentMethod,
      );

      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          paymentIntentId,
          paymentMethod,
          status: 'PROCESSING',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should default to card payment method if not provided', async () => {
      const orderId = 'order-123';
      const paymentIntentId = 'pi_123456';

      const updatedOrder = {
        id: orderId,
        paymentIntentId,
        paymentMethod: 'card',
        status: 'PROCESSING',
      };

      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      await service.updateOrderPayment(orderId, paymentIntentId);

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          paymentMethod: 'card',
        }),
      });
    });
  });
});
