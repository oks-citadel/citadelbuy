import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OrderTrackingService } from './order-tracking.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { OrderStatus } from '@prisma/client';
import { TrackingStatusEnum } from './dto/tracking.dto';

describe('OrderTrackingService', () => {
  let service: OrderTrackingService;
  let prisma: PrismaService;
  let shippingService: ShippingService;

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shipment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trackingEvent: {
      create: jest.fn(),
    },
  };

  const mockShippingService = {
    trackShipment: jest.fn(),
  };

  const mockOrder = {
    id: 'order-12345678',
    userId: 'user-123',
    total: 99.99,
    status: OrderStatus.PROCESSING,
    trackingNumber: 'TRACK123456',
    carrier: 'UPS',
    shippingMethod: 'Standard',
    shippingAddress: JSON.stringify({
      fullName: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    }),
    guestEmail: null,
    estimatedDeliveryDate: new Date('2025-01-22'),
    actualDeliveryDate: null,
    statusHistory: [],
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    items: [
      {
        id: 'item-1',
        quantity: 2,
        product: {
          name: 'Test Product',
          images: ['https://example.com/image.jpg'],
        },
      },
    ],
    user: {
      email: 'user@example.com',
    },
  };

  const mockShipment = {
    id: 'shipment-123',
    trackingNumber: 'TRACK123456',
    carrier: 'UPS',
    status: 'IN_TRANSIT',
    estimatedDelivery: new Date('2025-01-22'),
    actualDelivery: null,
    trackingEvents: [
      {
        id: 'event-1',
        status: 'IN_TRANSIT',
        description: 'Package in transit',
        location: 'Chicago, IL',
        timestamp: new Date('2025-01-16T10:00:00Z'),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTrackingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
      ],
    }).compile();

    service = module.get<OrderTrackingService>(OrderTrackingService);
    prisma = module.get<PrismaService>(PrismaService);
    shippingService = module.get<ShippingService>(ShippingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackByOrderNumber', () => {
    it('should return tracking response for authenticated user', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const userId = 'user-123';
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      // Act
      const result = await service.trackByOrderNumber(orderNumber, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockOrder.id);
      expect(result.status).toBe(TrackingStatusEnum.PROCESSING);
      expect(result.trackingNumber).toBe(mockOrder.trackingNumber);
      expect(result.carrier).toBe(mockOrder.carrier);
      expect(result.shippingAddress).toBeDefined();
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      // Arrange
      const orderNumber = 'CB-2025-99999999';
      const userId = 'user-123';
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.trackByOrderNumber(orderNumber, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.trackByOrderNumber(orderNumber, userId)).rejects.toThrow(
        'Order not found or does not belong to this user',
      );
    });

    it('should handle order without tracking number', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const userId = 'user-123';
      const orderWithoutTracking = { ...mockOrder, trackingNumber: null, carrier: null };
      mockPrismaService.order.findFirst.mockResolvedValue(orderWithoutTracking);

      // Act
      const result = await service.trackByOrderNumber(orderNumber, userId);

      // Assert
      expect(result.trackingNumber).toBeUndefined();
      expect(result.carrier).toBeUndefined();
    });
  });

  describe('trackByOrderNumberAndEmail', () => {
    it('should return tracking response for guest tracking', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const email = 'guest@example.com';
      const guestOrder = { ...mockOrder, guestEmail: email, user: null };
      mockPrismaService.order.findFirst.mockResolvedValue(guestOrder);

      // Act
      const result = await service.trackByOrderNumberAndEmail(orderNumber, email);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe(guestOrder.id);
    });

    it('should return tracking response for authenticated user order via email', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const email = 'user@example.com';
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      // Act
      const result = await service.trackByOrderNumberAndEmail(orderNumber, email);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockOrder.id);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      // Arrange
      const orderNumber = 'CB-2025-99999999';
      const email = 'guest@example.com';
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.trackByOrderNumberAndEmail(orderNumber, email),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.trackByOrderNumberAndEmail(orderNumber, email),
      ).rejects.toThrow('Order not found with the provided email address');
    });

    it('should throw UnauthorizedException when email does not match', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const email = 'wrong@example.com';
      const orderWithDifferentEmail = {
        ...mockOrder,
        guestEmail: 'correct@example.com',
        user: null,
      };
      mockPrismaService.order.findFirst.mockResolvedValue(orderWithDifferentEmail);

      // Act & Assert
      await expect(
        service.trackByOrderNumberAndEmail(orderNumber, email),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should be case-insensitive for email matching', async () => {
      // Arrange
      const orderNumber = 'CB-2025-12345678';
      const email = 'USER@EXAMPLE.COM';
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      // Act
      const result = await service.trackByOrderNumberAndEmail(orderNumber, email);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('trackByTrackingNumber', () => {
    it('should return tracking response by tracking number', async () => {
      // Arrange
      const trackingNumber = 'TRACK123456';
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockShippingService.trackShipment.mockResolvedValue({
        status: 'IN_TRANSIT',
        events: [
          {
            status: 'IN_TRANSIT',
            description: 'Package in transit',
            location: 'Chicago, IL',
            timestamp: new Date('2025-01-16T10:00:00Z'),
          },
        ],
      });

      // Act
      const result = await service.trackByTrackingNumber(trackingNumber);

      // Assert
      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe(trackingNumber);
    });

    it('should throw NotFoundException when tracking number not found', async () => {
      // Arrange
      const trackingNumber = 'INVALID123';
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.trackByTrackingNumber(trackingNumber)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.trackByTrackingNumber(trackingNumber)).rejects.toThrow(
        'Order not found with this tracking number',
      );
    });

    it('should fallback to order-based tracking when shipping provider fails', async () => {
      // Arrange
      const trackingNumber = 'TRACK123456';
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockShippingService.trackShipment.mockRejectedValue(new Error('Provider error'));

      // Act
      const result = await service.trackByTrackingNumber(trackingNumber);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockOrder.id);
    });
  });

  describe('getShipmentTracking', () => {
    it('should return shipment tracking data', async () => {
      // Arrange
      const trackingNumber = 'TRACK123456';
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockShippingService.trackShipment.mockResolvedValue({
        status: 'IN_TRANSIT',
        events: [
          {
            status: 'IN_TRANSIT',
            description: 'Package in transit',
            location: 'Chicago, IL',
            timestamp: new Date('2025-01-16T10:00:00Z'),
          },
        ],
      });

      // Act
      const result = await service.getShipmentTracking(trackingNumber);

      // Assert
      expect(result).toBeDefined();
      expect(result?.trackingNumber).toBe(trackingNumber);
      expect(result?.carrier).toBe(mockShipment.carrier);
      expect(result?.events).toHaveLength(1);
    });

    it('should return null when shipment not found', async () => {
      // Arrange
      const trackingNumber = 'INVALID123';
      mockPrismaService.shipment.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getShipmentTracking(trackingNumber);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      // Arrange
      const trackingNumber = 'TRACK123456';
      mockPrismaService.shipment.findUnique.mockRejectedValue(new Error('DB error'));

      // Act
      const result = await service.getShipmentTracking(trackingNumber);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateOrderTracking', () => {
    it('should update order tracking information', async () => {
      // Arrange
      const orderId = 'order-123';
      const data = {
        trackingNumber: 'NEWTRACK123',
        carrier: 'FedEx',
        status: OrderStatus.SHIPPED,
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        statusHistory: [],
        status: OrderStatus.PROCESSING,
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        ...data,
      });

      // Act
      await service.updateOrderTracking(orderId, data);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: expect.objectContaining({
          trackingNumber: 'NEWTRACK123',
          carrier: 'FedEx',
          status: OrderStatus.SHIPPED,
          statusHistory: expect.any(Array),
        }),
      });
    });

    it('should not update status history when status unchanged', async () => {
      // Arrange
      const orderId = 'order-123';
      const data = {
        trackingNumber: 'NEWTRACK123',
      };
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        trackingNumber: 'NEWTRACK123',
      });

      // Act
      await service.updateOrderTracking(orderId, data);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          trackingNumber: 'NEWTRACK123',
        },
      });
    });

    it('should update estimated delivery date', async () => {
      // Arrange
      const orderId = 'order-123';
      const estimatedDeliveryDate = new Date('2025-01-25');
      const data = { estimatedDeliveryDate };
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        estimatedDeliveryDate,
      });

      // Act
      await service.updateOrderTracking(orderId, data);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { estimatedDeliveryDate },
      });
    });

    it('should update actual delivery date', async () => {
      // Arrange
      const orderId = 'order-123';
      const actualDeliveryDate = new Date('2025-01-20');
      const data = { actualDeliveryDate };
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        actualDeliveryDate,
      });

      // Act
      await service.updateOrderTracking(orderId, data);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { actualDeliveryDate },
      });
    });
  });

  describe('handleTrackingWebhook', () => {
    it('should process tracking webhook and update order status to DELIVERED', async () => {
      // Arrange
      const payload = {
        trackingNumber: 'TRACK123456',
        status: 'DELIVERED',
        events: [
          {
            status: 'DELIVERED',
            description: 'Package delivered',
            location: 'Front door',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrismaService.trackingEvent.create.mockResolvedValue({});
      mockPrismaService.shipment.update.mockResolvedValue({});

      // Act
      await service.handleTrackingWebhook(payload);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when tracking number is missing', async () => {
      // Arrange
      const payload = {
        status: 'DELIVERED',
        events: [],
      };

      // Act & Assert
      await expect(service.handleTrackingWebhook(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.handleTrackingWebhook(payload)).rejects.toThrow(
        'Tracking number is required',
      );
    });

    it('should skip processing when order not found', async () => {
      // Arrange
      const payload = {
        trackingNumber: 'UNKNOWN123',
        status: 'IN_TRANSIT',
        events: [],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      // Act
      await service.handleTrackingWebhook(payload);

      // Assert
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });

    it('should update order to SHIPPED when status is IN_TRANSIT', async () => {
      // Arrange
      const payload = {
        trackingNumber: 'TRACK123456',
        status: 'IN_TRANSIT',
        events: [],
      };
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      mockPrismaService.order.findFirst.mockResolvedValue(pendingOrder);
      mockPrismaService.order.findUnique.mockResolvedValue(pendingOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.SHIPPED,
      });
      mockPrismaService.shipment.findUnique.mockResolvedValue(null);

      // Act
      await service.handleTrackingWebhook(payload);

      // Assert
      expect(mockPrismaService.order.update).toHaveBeenCalled();
    });

    it('should create tracking events when shipment exists', async () => {
      // Arrange
      const payload = {
        trackingNumber: 'TRACK123456',
        status: 'IN_TRANSIT',
        events: [
          {
            status: 'IN_TRANSIT',
            description: 'Package picked up',
            location: 'Warehouse',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrismaService.trackingEvent.create.mockResolvedValue({});
      mockPrismaService.shipment.update.mockResolvedValue({});

      // Act
      await service.handleTrackingWebhook(payload);

      // Assert
      expect(mockPrismaService.trackingEvent.create).toHaveBeenCalledWith({
        data: {
          shipmentId: mockShipment.id,
          status: 'IN_TRANSIT',
          description: 'Package picked up',
          location: 'Warehouse',
          timestamp: expect.any(Date),
        },
      });
    });
  });
});
