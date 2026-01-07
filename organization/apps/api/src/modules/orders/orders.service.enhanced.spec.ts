import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { TaxService } from '../tax/tax.service';

describe('OrdersService - Enhanced Tests', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let taxService: TaxService;

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
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => await callback(mockPrismaService)),
  };

  const mockEmailService = {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockTaxService = {
    calculateTax: jest.fn(),
    calculateOrderTax: jest.fn(),
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
        {
          provide: TaxService,
          useValue: mockTaxService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    taxService = module.get<TaxService>(TaxService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - Tax Calculation', () => {
    it('should calculate tax automatically using TaxService', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 2, price: 29.99 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
          phone: '555-1234',
        },
        subtotal: 59.98,
        tax: 0, // Will be calculated
        shipping: 9.99,
        total: 69.97, // Will be recalculated
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Test Product' },
      ];

      const mockTaxCalculation = {
        taxAmount: 5.25,
        calculationId: 'tax-123',
      };

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        subtotal: 59.98,
        tax: 5.25,
        shipping: 9.99,
        total: 75.22,
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue(mockTaxCalculation);
      mockTaxService.calculateOrderTax.mockResolvedValue(mockTaxCalculation);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result.tax).toBe(5.25);
      expect(result.total).toBe(75.22);
      expect(mockTaxService.calculateTax).toHaveBeenCalledWith({
        subtotal: 59.98,
        shippingAmount: 9.99,
        country: 'US',
        state: 'NY',
        city: 'New York',
        zipCode: '10001',
        customerId: userId,
        productIds: ['product-1'],
        categoryIds: ['category-1'],
      });
    });

    it('should handle tax calculation failure gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 2, price: 29.99 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 59.98,
        tax: 0,
        shipping: 9.99,
        total: 69.97,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Test Product' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        subtotal: 59.98,
        tax: 0,
        shipping: 9.99,
        total: 69.97,
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockRejectedValue(new Error('Tax service unavailable'));
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert - Order should still be created with zero tax
      expect(result).toBeDefined();
      expect(result.tax).toBe(0);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

    it('should handle products without categories', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 1, price: 50.0 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 50.0,
        tax: 0,
        shipping: 5.0,
        total: 55.0,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: null, stock: 10, name: 'Test Product' },
      ];

      const mockTaxCalculation = {
        taxAmount: 4.0,
        calculationId: 'tax-123',
      };

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        subtotal: 50.0,
        tax: 4.0,
        shipping: 5.0,
        total: 59.0,
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue(mockTaxCalculation);
      mockTaxService.calculateOrderTax.mockResolvedValue(mockTaxCalculation);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockTaxService.calculateTax).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: [],
        }),
      );
    });
  });

  describe('Tracking Operations', () => {
    describe('addTrackingInfo', () => {
      it('should add tracking information successfully', async () => {
        // Arrange
        const orderId = 'order-123';
        const trackingData = {
          trackingNumber: 'TRACK-123456',
          carrier: 'UPS',
          shippingMethod: 'Ground',
          estimatedDeliveryDate: new Date('2025-01-15'),
        };

        const mockOrder = {
          id: orderId,
          status: 'PROCESSING',
          statusHistory: [],
          user: {
            email: 'user@example.com',
            name: 'Test User',
          },
          createdAt: new Date(),
        };

        const mockUpdatedOrder = {
          ...mockOrder,
          trackingNumber: 'TRACK-123456',
          carrier: 'UPS',
          shippingMethod: 'Ground',
          estimatedDeliveryDate: trackingData.estimatedDeliveryDate,
          status: 'SHIPPED',
          statusHistory: [
            {
              status: 'SHIPPED',
              timestamp: new Date().toISOString(),
              note: 'Shipped via UPS',
            },
          ],
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

        // Act
        const result = await service.addTrackingInfo(orderId, trackingData);

        // Assert
        expect(result).toEqual(mockUpdatedOrder);
        expect(result.status).toBe('SHIPPED');
        expect(result.trackingNumber).toBe('TRACK-123456');
        expect(mockEmailService.sendOrderStatusUpdate).toHaveBeenCalledWith(
          'user@example.com',
          expect.objectContaining({
            status: 'shipped',
            trackingNumber: 'TRACK-123456',
            carrier: 'UPS',
          }),
        );
      });

      it('should generate tracking number if not provided', async () => {
        // Arrange
        const orderId = 'order-123';
        const trackingData = {
          carrier: 'FedEx',
        };

        const mockOrder = {
          id: orderId,
          status: 'PROCESSING',
          statusHistory: [],
          user: {
            email: 'user@example.com',
            name: 'Test User',
          },
          createdAt: new Date(),
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockPrismaService.order.update.mockResolvedValue({
          ...mockOrder,
          trackingNumber: 'FED12345678ABCD',
          carrier: 'FedEx',
          status: 'SHIPPED',
        });

        // Act
        const result = await service.addTrackingInfo(orderId, trackingData);

        // Assert
        expect(result.trackingNumber).toContain('FED');
        expect(result.carrier).toBe('FedEx');
      });

      it('should throw NotFoundException if order not found', async () => {
        // Arrange
        const orderId = 'nonexistent-order';
        const trackingData = {
          carrier: 'UPS',
        };

        mockPrismaService.order.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.addTrackingInfo(orderId, trackingData),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('markAsDelivered', () => {
      it('should mark order as delivered successfully', async () => {
        // Arrange
        const orderId = 'order-123';
        const mockOrder = {
          id: orderId,
          status: 'SHIPPED',
          trackingNumber: 'TRACK-123456',
          carrier: 'UPS',
          statusHistory: [],
          user: {
            email: 'user@example.com',
            name: 'Test User',
          },
          createdAt: new Date(),
        };

        const mockUpdatedOrder = {
          ...mockOrder,
          status: 'DELIVERED',
          actualDeliveryDate: new Date(),
          statusHistory: [
            {
              status: 'DELIVERED',
              timestamp: new Date().toISOString(),
              note: 'Package delivered',
            },
          ],
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

        // Act
        const result = await service.markAsDelivered(orderId);

        // Assert
        expect(result.status).toBe('DELIVERED');
        expect(result.actualDeliveryDate).toBeDefined();
        expect(mockEmailService.sendOrderStatusUpdate).toHaveBeenCalledWith(
          'user@example.com',
          expect.objectContaining({
            status: 'delivered',
            statusMessage: expect.stringContaining('delivered'),
          }),
        );
      });

      it('should throw NotFoundException if order not found', async () => {
        // Arrange
        const orderId = 'nonexistent-order';
        mockPrismaService.order.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.markAsDelivered(orderId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getTrackingHistory', () => {
      it('should return tracking history for order', async () => {
        // Arrange
        const orderId = 'order-123';
        const userId = 'user-123';
        const mockOrder = {
          id: orderId,
          userId,
          status: 'SHIPPED',
          trackingNumber: 'TRACK-123456',
          carrier: 'UPS',
          shippingMethod: 'Ground',
          estimatedDeliveryDate: new Date('2025-01-15'),
          actualDeliveryDate: null,
          statusHistory: [
            {
              status: 'PENDING',
              timestamp: '2025-01-01T10:00:00Z',
              note: 'Order created',
            },
            {
              status: 'PROCESSING',
              timestamp: '2025-01-02T10:00:00Z',
              note: 'Payment confirmed',
            },
            {
              status: 'SHIPPED',
              timestamp: '2025-01-03T10:00:00Z',
              note: 'Shipped via UPS',
            },
          ],
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-03'),
          items: [],
        };

        mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

        // Act
        const result = await service.getTrackingHistory(orderId, userId);

        // Assert
        expect(result).toEqual({
          orderId: 'order-123',
          status: 'SHIPPED',
          trackingNumber: 'TRACK-123456',
          carrier: 'UPS',
          shippingMethod: 'Ground',
          estimatedDeliveryDate: mockOrder.estimatedDeliveryDate,
          actualDeliveryDate: null,
          statusHistory: mockOrder.statusHistory,
          createdAt: mockOrder.createdAt,
          updatedAt: mockOrder.updatedAt,
        });
      });
    });

    describe('findByTrackingNumber', () => {
      it('should find order by tracking number', async () => {
        // Arrange
        const trackingNumber = 'TRACK-123456';
        const mockOrder = {
          id: 'order-123',
          trackingNumber,
          status: 'SHIPPED',
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

        // Act
        const result = await service.findByTrackingNumber(trackingNumber);

        // Assert
        expect(result).toEqual(mockOrder);
        expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
          where: { trackingNumber },
          include: expect.any(Object),
        });
      });

      it('should throw NotFoundException if tracking number not found', async () => {
        // Arrange
        const trackingNumber = 'INVALID-TRACK';
        mockPrismaService.order.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.findByTrackingNumber(trackingNumber),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Email Notifications', () => {
    it('should send order confirmation email for registered user', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 1, price: 50.0 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 50.0,
        tax: 0,
        shipping: 5.0,
        total: 55.0,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Test Product' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        subtotal: 50.0,
        tax: 0,
        shipping: 5.0,
        total: 55.0,
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            price: 50.0,
            product: {
              name: 'Test Product',
              images: ['image1.jpg'],
            },
          },
        ],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue({ taxAmount: 0 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      await service.create(userId, createOrderDto);

      // Assert
      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          customerName: 'Test User',
          orderNumber: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Product',
              price: 50.0,
            }),
          ]),
          total: 55.0,
        }),
      );
    });

    it('should handle email send failure gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 1, price: 50.0 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 50.0,
        tax: 0,
        shipping: 5.0,
        total: 55.0,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: null, stock: 10, name: 'Test Product' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
        subtotal: 50.0,
        tax: 0,
        shipping: 5.0,
        total: 55.0,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue({ taxAmount: 0 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockEmailService.sendOrderConfirmation.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      // Act - Should not throw error
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });
  });

  describe('Status Update with Payment Data', () => {
    it('should update order status with payment information', async () => {
      // Arrange
      const orderId = 'order-123';
      const newStatus = 'PROCESSING';
      const paymentData = {
        paymentIntentId: 'pi_123456789',
        paymentMethod: 'visa',
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
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(existingOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      // Act
      const result = await service.updateOrderStatus(
        orderId,
        newStatus as any,
        paymentData,
      );

      // Assert
      expect(result).toEqual(updatedOrder);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          status: newStatus,
          paymentIntentId: paymentData.paymentIntentId,
          paymentMethod: paymentData.paymentMethod,
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle order with zero shipping cost', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 1, price: 100.0 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 100.0,
        tax: 0,
        shipping: 0, // Free shipping
        total: 100.0,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Test Product' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        subtotal: 100.0,
        tax: 0,
        shipping: 0,
        total: 100.0,
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue({ taxAmount: 0 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result.shipping).toBe(0);
      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          shippingFree: true,
        }),
      );
    });

    it('should handle multiple items in order', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 2, price: 29.99 },
          { productId: 'product-2', quantity: 1, price: 49.99 },
          { productId: 'product-3', quantity: 3, price: 19.99 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '555-1234',
        },
        subtotal: 169.94,
        tax: 0,
        shipping: 15.99,
        total: 185.93,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Product 1' },
        { id: 'product-2', categoryId: 'category-2', stock: 10, name: 'Product 2' },
        { id: 'product-3', categoryId: 'category-1', stock: 10, name: 'Product 3' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
        subtotal: 169.94,
        tax: 0,
        shipping: 15.99,
        total: 185.93,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue({ taxAmount: 0 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockTaxService.calculateTax).toHaveBeenCalledWith(
        expect.objectContaining({
          productIds: ['product-1', 'product-2', 'product-3'],
          categoryIds: ['category-1', 'category-2'],
        }),
      );
    });

    it('should handle international orders with country code conversion', async () => {
      // Arrange
      const userId = 'user-123';
      const createOrderDto = {
        items: [
          { productId: 'product-1', quantity: 1, price: 50.0 },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          streetAddress: '123 Main St',
          city: 'Toronto',
          state: 'ON',
          postalCode: 'M5A 1A1',
          country: 'Canada', // Full country name
          phone: '555-1234',
        },
        subtotal: 50.0,
        tax: 0,
        shipping: 25.0,
        total: 75.0,
      };

      const mockProducts = [
        { id: 'product-1', categoryId: 'category-1', stock: 10, name: 'Test Product' },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        status: 'PENDING',
        shippingAddress: JSON.stringify(createOrderDto.shippingAddress),
        items: [],
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
        createdAt: new Date(),
        subtotal: 50.0,
        tax: 0,
        shipping: 25.0,
        total: 75.0,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 10, name: 'Test Product' });
      mockPrismaService.product.update.mockResolvedValue({});
      mockTaxService.calculateTax.mockResolvedValue({ taxAmount: 0 });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      // Act
      const result = await service.create(userId, createOrderDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockTaxService.calculateTax).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'CA', // Should be converted to country code
        }),
      );
    });
  });
});
