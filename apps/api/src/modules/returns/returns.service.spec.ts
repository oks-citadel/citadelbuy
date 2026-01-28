import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ReturnStatus,
  ReturnReason,
  ReturnType,
  RefundStatus,
  RefundMethod,
  StoreCreditType,
  TransactionType,
} from '@prisma/client';
import { ShippingCarrierEnum, ServiceLevelEnum } from '../shipping/dto/shipping.dto';

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: PrismaService;
  let shippingService: ShippingService;
  let paymentsService: PaymentsService;
  let emailService: EmailService;

  const mockPrismaService = {
    returnRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    returnItem: {
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
    },
    returnLabel: {
      create: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    storeCredit: {
      create: jest.fn(),
      update: jest.fn(),
    },
    storeCreditTransaction: {
      create: jest.fn(),
    },
    inventoryItem: {
      upsert: jest.fn(),
    },
  };

  const mockShippingService = {
    createShipment: jest.fn(),
  };

  const mockPaymentsService = {
    processRefund: jest.fn(),
  };

  const mockEmailService = {
    sendReturnRequestConfirmation: jest.fn().mockResolvedValue(undefined),
    sendReturnApproved: jest.fn().mockResolvedValue(undefined),
    sendReturnRejected: jest.fn().mockResolvedValue(undefined),
    sendReturnLabelReady: jest.fn().mockResolvedValue(undefined),
    sendRefundProcessed: jest.fn().mockResolvedValue(undefined),
    sendStoreCreditIssued: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    prisma = module.get<PrismaService>(PrismaService);
    shippingService = module.get<ShippingService>(ShippingService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReturnRequest', () => {
    const mockOrder = {
      id: 'order-123',
      userId: 'user-123',
      shippingAddress: JSON.stringify({
        name: 'John Doe',
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      }),
      items: [
        { id: 'order-item-1', productId: 'product-1', price: 29.99, quantity: 1 },
        { id: 'order-item-2', productId: 'product-2', price: 49.99, quantity: 2 },
      ],
    };

    const mockCreateDto = {
      orderId: 'order-123',
      returnType: ReturnType.REFUND,
      reason: ReturnReason.DEFECTIVE,
      comments: 'Product arrived damaged',
      items: [
        {
          orderItemId: 'order-item-1',
          productId: 'product-1',
          quantity: 1,
          reason: ReturnReason.DEFECTIVE,
          itemPrice: 29.99,
        },
      ],
    };

    it('should create a return request successfully', async () => {
      const mockReturnRequest = {
        id: 'return-123',
        rmaNumber: 'RMA12345678ABCD',
        orderId: 'order-123',
        userId: 'user-123',
        status: ReturnStatus.REQUESTED,
        refundAmount: 29.99,
        items: [
          {
            id: 'return-item-1',
            orderItemId: 'order-item-1',
            productId: 'product-1',
            quantity: 1,
            refundAmount: 29.99,
            product: { name: 'Test Product' },
          },
        ],
        order: mockOrder,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        timeline: [{ status: ReturnStatus.REQUESTED, description: 'Return request submitted by customer' }],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.returnRequest.create.mockResolvedValue(mockReturnRequest);

      const result = await service.createReturnRequest('user-123', mockCreateDto);

      expect(result).toEqual(mockReturnRequest);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: { items: true },
      });
      expect(mockPrismaService.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-123',
            userId: 'user-123',
            reason: ReturnReason.DEFECTIVE,
            status: ReturnStatus.REQUESTED,
            refundAmount: 29.99,
          }),
        })
      );
      expect(mockEmailService.sendReturnRequestConfirmation).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createReturnRequest('user-123', mockCreateDto)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createReturnRequest('user-123', mockCreateDto)
      ).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException if order does not belong to user', async () => {
      const differentUserOrder = { ...mockOrder, userId: 'different-user' };
      mockPrismaService.order.findUnique.mockResolvedValue(differentUserOrder);

      await expect(
        service.createReturnRequest('user-123', mockCreateDto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createReturnRequest('user-123', mockCreateDto)
      ).rejects.toThrow('This order does not belong to you');
    });

    it('should throw BadRequestException if order item not found in order', async () => {
      const invalidDto = {
        ...mockCreateDto,
        items: [
          {
            orderItemId: 'invalid-item',
            productId: 'product-1',
            quantity: 1,
            reason: ReturnReason.DEFECTIVE,
            itemPrice: 29.99,
          },
        ],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.createReturnRequest('user-123', invalidDto)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createReturnRequest('user-123', invalidDto)
      ).rejects.toThrow('Order item invalid-item not found in this order');
    });

    it('should calculate total refund amount correctly for multiple items', async () => {
      const multiItemDto = {
        ...mockCreateDto,
        items: [
          {
            orderItemId: 'order-item-1',
            productId: 'product-1',
            quantity: 1,
            reason: ReturnReason.DEFECTIVE,
            itemPrice: 29.99,
          },
          {
            orderItemId: 'order-item-2',
            productId: 'product-2',
            quantity: 2,
            reason: ReturnReason.DEFECTIVE,
            itemPrice: 49.99,
          },
        ],
      };

      const mockReturnRequest = {
        id: 'return-123',
        rmaNumber: 'RMA12345678ABCD',
        refundAmount: 129.97, // 29.99 + (49.99 * 2)
        items: [],
        order: mockOrder,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        timeline: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.returnRequest.create.mockResolvedValue(mockReturnRequest);

      const result = await service.createReturnRequest('user-123', multiItemDto);

      expect(mockPrismaService.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundAmount: 129.97,
          }),
        })
      );
    });

    it('should generate unique RMA number', async () => {
      const mockReturnRequest = {
        id: 'return-123',
        rmaNumber: expect.stringMatching(/^RMA\d{8}[A-Z0-9]{4}$/),
        items: [],
        order: mockOrder,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        timeline: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.returnRequest.create.mockResolvedValue(mockReturnRequest);

      await service.createReturnRequest('user-123', mockCreateDto);

      expect(mockPrismaService.returnRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rmaNumber: expect.stringMatching(/^RMA/),
          }),
        })
      );
    });

    it('should not throw if email sending fails', async () => {
      const mockReturnRequest = {
        id: 'return-123',
        rmaNumber: 'RMA12345678ABCD',
        items: [],
        order: mockOrder,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        timeline: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.returnRequest.create.mockResolvedValue(mockReturnRequest);
      mockEmailService.sendReturnRequestConfirmation.mockRejectedValue(new Error('Email service down'));

      // Should not throw even if email fails
      await expect(service.createReturnRequest('user-123', mockCreateDto)).resolves.toBeDefined();
    });
  });

  describe('approveReturn', () => {
    const mockReturnRequest = {
      id: 'return-123',
      rmaNumber: 'RMA12345678ABCD',
      orderId: 'order-123',
      userId: 'user-123',
      status: ReturnStatus.REQUESTED,
      refundAmount: 100,
      items: [{ id: 'item-1', quantity: 1 }],
    };

    it('should approve return successfully', async () => {
      const approveDto = {
        approved: true,
        restockingFee: 10,
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED,
        approvedBy: 'admin-123',
        approvedAt: new Date(),
        refundAmount: 90, // 100 - 10 restocking fee
        restockingFee: 10,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.approveReturn('return-123', 'admin-123', approveDto);

      expect(result.status).toBe(ReturnStatus.APPROVED);
      expect(result.refundAmount).toBe(90);
      expect(mockEmailService.sendReturnApproved).toHaveBeenCalled();
    });

    it('should reject return with reason', async () => {
      const rejectDto = {
        approved: false,
        reason: 'Does not meet return policy requirements',
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedReason: 'Does not meet return policy requirements',
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.approveReturn('return-123', 'admin-123', rejectDto);

      expect(result.status).toBe(ReturnStatus.REJECTED);
      expect(mockEmailService.sendReturnRejected).toHaveBeenCalled();
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.approveReturn('invalid', 'admin-123', { approved: true })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if return is not in valid status', async () => {
      const completedReturn = { ...mockReturnRequest, status: ReturnStatus.COMPLETED };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(completedReturn);

      await expect(
        service.approveReturn('return-123', 'admin-123', { approved: true })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveReturn('return-123', 'admin-123', { approved: true })
      ).rejects.toThrow('Return request cannot be approved in current status');
    });

    it('should calculate refund with restocking fee', async () => {
      const approveDto = {
        approved: true,
        restockingFee: 25,
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED,
        refundAmount: 75, // 100 - 25
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      await service.approveReturn('return-123', 'admin-123', approveDto);

      expect(mockPrismaService.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundAmount: 75,
            restockingFee: 25,
          }),
        })
      );
    });
  });

  describe('generateReturnLabel', () => {
    const mockReturnRequest = {
      id: 'return-123',
      rmaNumber: 'RMA12345678ABCD',
      orderId: 'order-123',
      userId: 'user-123',
      status: ReturnStatus.APPROVED,
      order: {
        id: 'order-123',
        shippingAddress: JSON.stringify({
          name: 'John Doe',
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        }),
      },
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    };

    const mockWarehouse = {
      id: 'warehouse-123',
      name: 'Main Warehouse',
      address: '456 Warehouse Blvd',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
      isPrimary: true,
      isActive: true,
    };

    const mockShipment = {
      id: 'shipment-123',
      carrier: 'UPS',
      trackingNumber: 'TRACK123456',
      labelUrl: 'https://example.com/label.pdf',
      labelFormat: 'PDF',
    };

    it('should generate return label successfully', async () => {
      const labelDto = {
        returnRequestId: 'return-123',
        carrier: ShippingCarrierEnum.UPS,
        serviceLevel: ServiceLevelEnum.GROUND,
      };

      const mockLabel = {
        id: 'label-123',
        shipmentId: 'shipment-123',
        carrier: 'UPS',
        trackingNumber: 'TRACK123456',
        labelUrl: 'https://example.com/label.pdf',
        labelFormat: 'PDF',
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.LABEL_SENT,
        returnLabelId: 'label-123',
        trackingNumber: 'TRACK123456',
        returnLabel: mockLabel,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockShippingService.createShipment.mockResolvedValue(mockShipment);
      mockPrismaService.returnLabel.create.mockResolvedValue(mockLabel);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.generateReturnLabel('return-123', labelDto);

      expect(result.returnRequest.status).toBe(ReturnStatus.LABEL_SENT);
      expect(result.label.trackingNumber).toBe('TRACK123456');
      expect(mockShippingService.createShipment).toHaveBeenCalled();
      expect(mockEmailService.sendReturnLabelReady).toHaveBeenCalled();
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.generateReturnLabel('invalid', { returnRequestId: 'invalid' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if return not approved', async () => {
      const unapprovedReturn = { ...mockReturnRequest, status: ReturnStatus.REQUESTED };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(unapprovedReturn);

      await expect(
        service.generateReturnLabel('return-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateReturnLabel('return-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow('Return must be approved before generating label');
    });

    it('should throw NotFoundException if no active warehouse found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null);

      await expect(
        service.generateReturnLabel('return-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generateReturnLabel('return-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow('No active warehouse found');
    });

    it('should use default carrier and service level if not provided', async () => {
      const mockLabel = {
        id: 'label-123',
        shipmentId: 'shipment-123',
        carrier: 'UPS',
        trackingNumber: 'TRACK123456',
        labelUrl: 'https://example.com/label.pdf',
        labelFormat: 'PDF',
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      mockShippingService.createShipment.mockResolvedValue(mockShipment);
      mockPrismaService.returnLabel.create.mockResolvedValue(mockLabel);
      mockPrismaService.returnRequest.update.mockResolvedValue({ ...mockReturnRequest, returnLabel: mockLabel, user: mockReturnRequest.user, timeline: [] });

      await service.generateReturnLabel('return-123', { returnRequestId: 'return-123' });

      expect(mockShippingService.createShipment).toHaveBeenCalledWith(
        expect.objectContaining({
          carrier: ShippingCarrierEnum.UPS,
          serviceLevel: ServiceLevelEnum.GROUND,
        })
      );
    });
  });

  describe('inspectReturn', () => {
    const mockReturnRequest = {
      id: 'return-123',
      status: ReturnStatus.RECEIVED,
      refundAmount: 100,
    };

    it('should approve return after inspection', async () => {
      const inspectDto = {
        approved: true,
        inspectionNotes: 'Item received in good condition',
        inspectionPhotos: ['photo1.jpg', 'photo2.jpg'],
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED_REFUND,
        inspectedAt: new Date(),
        inspectedBy: 'admin-123',
        inspectionNotes: 'Item received in good condition',
        inspectionPhotos: ['photo1.jpg', 'photo2.jpg'],
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.inspectReturn('return-123', 'admin-123', inspectDto);

      expect(result.status).toBe(ReturnStatus.APPROVED_REFUND);
      expect(result.inspectionNotes).toBe('Item received in good condition');
    });

    it('should reject return after inspection', async () => {
      const inspectDto = {
        approved: false,
        inspectionNotes: 'Item damaged by customer',
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
        inspectionNotes: 'Item damaged by customer',
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.inspectReturn('return-123', 'admin-123', inspectDto);

      expect(result.status).toBe(ReturnStatus.REJECTED);
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.inspectReturn('invalid', 'admin-123', { approved: true })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if return not received', async () => {
      const notReceivedReturn = { ...mockReturnRequest, status: ReturnStatus.APPROVED };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(notReceivedReturn);

      await expect(
        service.inspectReturn('return-123', 'admin-123', { approved: true })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.inspectReturn('return-123', 'admin-123', { approved: true })
      ).rejects.toThrow('Return must be received before inspection');
    });

    it('should adjust refund amount if provided', async () => {
      const inspectDto = {
        approved: true,
        adjustedRefundAmount: 75,
        inspectionNotes: 'Minor damage, partial refund',
      };

      const updatedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED_REFUND,
        refundAmount: 75,
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(updatedReturn);

      const result = await service.inspectReturn('return-123', 'admin-123', inspectDto);

      expect(result.refundAmount).toBe(75);
    });
  });

  describe('createRefund', () => {
    const mockReturnRequest = {
      id: 'return-123',
      rmaNumber: 'RMA12345678ABCD',
      orderId: 'order-123',
      userId: 'user-123',
      status: ReturnStatus.APPROVED_REFUND,
      refundAmount: 100,
      shippingRefund: 10,
      restockingFee: 5,
      refund: null,
      items: [],
    };

    it('should create refund successfully', async () => {
      const refundDto = {
        returnRequestId: 'return-123',
        method: RefundMethod.ORIGINAL_PAYMENT,
        subtotal: 100,
        shippingRefund: 10,
        taxRefund: 8,
        restockingFee: 5,
      };

      const mockRefund = {
        id: 'refund-123',
        returnRequestId: 'return-123',
        orderId: 'order-123',
        userId: 'user-123',
        method: RefundMethod.ORIGINAL_PAYMENT,
        subtotal: 100,
        shippingRefund: 10,
        taxRefund: 8,
        restockingFee: 5,
        totalAmount: 113, // 100 + 10 + 8 - 5
        status: RefundStatus.PENDING,
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.refund.create.mockResolvedValue(mockRefund);
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      const result = await service.createRefund('return-123', refundDto);

      expect(result.totalAmount).toBe(113);
      expect(result.status).toBe(RefundStatus.PENDING);
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.createRefund('invalid', { returnRequestId: 'invalid', method: RefundMethod.ORIGINAL_PAYMENT })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund already exists', async () => {
      const returnWithRefund = { ...mockReturnRequest, refund: { id: 'refund-123' } };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(returnWithRefund);

      await expect(
        service.createRefund('return-123', { returnRequestId: 'return-123', method: RefundMethod.ORIGINAL_PAYMENT })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRefund('return-123', { returnRequestId: 'return-123', method: RefundMethod.ORIGINAL_PAYMENT })
      ).rejects.toThrow('Refund already exists for this return');
    });

    it('should throw BadRequestException if return not approved for refund', async () => {
      const notApprovedReturn = { ...mockReturnRequest, status: ReturnStatus.RECEIVED, refund: null };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(notApprovedReturn);

      await expect(
        service.createRefund('return-123', { returnRequestId: 'return-123', method: RefundMethod.ORIGINAL_PAYMENT })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRefund('return-123', { returnRequestId: 'return-123', method: RefundMethod.ORIGINAL_PAYMENT })
      ).rejects.toThrow('Return must be approved for refund');
    });

    it('should use default values if optional fields not provided', async () => {
      const refundDto = {
        returnRequestId: 'return-123',
        method: RefundMethod.ORIGINAL_PAYMENT,
      };

      const mockRefund = {
        id: 'refund-123',
        totalAmount: 105, // 100 (subtotal) + 10 (shipping) + 0 (tax) - 5 (restocking)
        status: RefundStatus.PENDING,
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.refund.create.mockResolvedValue(mockRefund);
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      await service.createRefund('return-123', refundDto);

      expect(mockPrismaService.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 100,
            shippingRefund: 10,
            taxRefund: 0,
            restockingFee: 5,
          }),
        })
      );
    });
  });

  describe('processRefund', () => {
    const mockRefund = {
      id: 'refund-123',
      returnRequestId: 'return-123',
      orderId: 'order-123',
      userId: 'user-123',
      method: RefundMethod.ORIGINAL_PAYMENT,
      totalAmount: 100,
      status: RefundStatus.PENDING,
      returnRequest: {
        id: 'return-123',
        rmaNumber: 'RMA12345678ABCD',
        status: ReturnStatus.APPROVED_REFUND,
      },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      order: {
        paymentMethod: 'STRIPE',
        paymentIntentId: 'pi_12345',
      },
    };

    it('should process refund successfully via payment gateway', async () => {
      const mockPaymentRefund = {
        refundId: 're_12345',
        amount: 100,
        status: 'succeeded',
      };

      const updatedRefund = {
        ...mockRefund,
        status: RefundStatus.COMPLETED,
        processedAt: new Date(),
        processedBy: 'admin-123',
        transactionId: 're_12345',
      };

      mockPrismaService.refund.findUnique.mockResolvedValue(mockRefund);
      mockPrismaService.refund.update.mockResolvedValue(updatedRefund);
      mockPaymentsService.processRefund.mockResolvedValue(mockPaymentRefund);
      mockPrismaService.returnRequest.update.mockResolvedValue(mockRefund.returnRequest);

      const result = await service.processRefund('refund-123', 'admin-123');

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(
        'STRIPE',
        'pi_12345',
        100,
        'Return RMA12345678ABCD',
        expect.any(Object)
      );
      expect(mockEmailService.sendRefundProcessed).toHaveBeenCalled();
    });

    it('should throw NotFoundException if refund not found', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue(null);

      await expect(service.processRefund('invalid', 'admin-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund not in pending status', async () => {
      const completedRefund = { ...mockRefund, status: RefundStatus.COMPLETED };
      mockPrismaService.refund.findUnique.mockResolvedValue(completedRefund);

      await expect(service.processRefund('refund-123', 'admin-123')).rejects.toThrow(BadRequestException);
      await expect(service.processRefund('refund-123', 'admin-123')).rejects.toThrow('Refund is not in pending status');
    });

    it('should handle refund failure', async () => {
      const failedRefund = {
        ...mockRefund,
        status: RefundStatus.FAILED,
        failedReason: 'Payment gateway error',
      };

      mockPrismaService.refund.findUnique.mockResolvedValue(mockRefund);
      mockPrismaService.refund.update
        .mockResolvedValueOnce({ ...mockRefund, status: RefundStatus.PROCESSING })
        .mockResolvedValueOnce(failedRefund);
      mockPaymentsService.processRefund.mockRejectedValue(new Error('Payment gateway error'));
      mockPrismaService.returnRequest.update.mockResolvedValue(mockRefund.returnRequest);

      await expect(service.processRefund('refund-123', 'admin-123')).rejects.toThrow(BadRequestException);
      await expect(service.processRefund('refund-123', 'admin-123')).rejects.toThrow('Refund failed: Payment gateway error');
    });

    it('should process store credit refund without payment gateway', async () => {
      const storeCreditRefund = {
        ...mockRefund,
        method: RefundMethod.STORE_CREDIT,
      };

      const updatedRefund = {
        ...storeCreditRefund,
        status: RefundStatus.COMPLETED,
        processedAt: new Date(),
      };

      mockPrismaService.refund.findUnique.mockResolvedValue(storeCreditRefund);
      mockPrismaService.refund.update
        .mockResolvedValueOnce({ ...storeCreditRefund, status: RefundStatus.PROCESSING })
        .mockResolvedValueOnce(updatedRefund);
      mockPrismaService.returnRequest.update.mockResolvedValue(mockRefund.returnRequest);

      const result = await service.processRefund('refund-123', 'admin-123');

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockPaymentsService.processRefund).not.toHaveBeenCalled();
    });

    it('should determine payment method correctly', async () => {
      const paypalRefund = {
        ...mockRefund,
        order: {
          paymentMethod: 'PAYPAL',
          paymentIntentId: 'paypal_12345',
        },
      };

      mockPrismaService.refund.findUnique.mockResolvedValue(paypalRefund);
      mockPrismaService.refund.update.mockResolvedValue({ ...paypalRefund, status: RefundStatus.PROCESSING });
      mockPaymentsService.processRefund.mockResolvedValue({ refundId: 'paypal_refund_123' });
      mockPrismaService.returnRequest.update.mockResolvedValue(mockRefund.returnRequest);

      await service.processRefund('refund-123', 'admin-123');

      expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(
        'PAYPAL',
        'paypal_12345',
        expect.any(Number),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('issueStoreCredit', () => {
    const mockReturnRequest = {
      id: 'return-123',
      rmaNumber: 'RMA12345678ABCD',
      userId: 'user-123',
      returnType: ReturnType.STORE_CREDIT,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        storeCredit: null,
      },
    };

    it('should issue store credit successfully', async () => {
      const creditDto = {
        returnRequestId: 'return-123',
        amount: 100,
        reason: 'Return refund',
      };

      const mockStoreCredit = {
        id: 'credit-123',
        userId: 'user-123',
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      };

      const mockTransaction = {
        id: 'transaction-123',
        storeCreditId: 'credit-123',
        type: StoreCreditType.REFUND,
        transactionType: TransactionType.REFUND,
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 100,
        description: 'Store credit from return RMA12345678ABCD',
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.storeCredit.create.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.storeCredit.update.mockResolvedValue({ ...mockStoreCredit, currentBalance: 100 });
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      const result = await service.issueStoreCredit('return-123', 'admin-123', creditDto);

      expect(result.transaction.amount).toBe(100);
      expect(result.storeCredit.currentBalance).toBe(100);
      expect(mockEmailService.sendStoreCreditIssued).toHaveBeenCalled();
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.issueStoreCredit('invalid', 'admin-123', { returnRequestId: 'invalid', amount: 100 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if return type is not STORE_CREDIT', async () => {
      const refundReturn = { ...mockReturnRequest, returnType: ReturnType.REFUND };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(refundReturn);

      await expect(
        service.issueStoreCredit('return-123', 'admin-123', { returnRequestId: 'return-123', amount: 100 })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.issueStoreCredit('return-123', 'admin-123', { returnRequestId: 'return-123', amount: 100 })
      ).rejects.toThrow('Return type must be STORE_CREDIT');
    });

    it('should use existing store credit account if available', async () => {
      const existingCredit = {
        id: 'credit-existing',
        userId: 'user-123',
        currentBalance: 50,
        totalEarned: 50,
        totalSpent: 0,
      };

      const returnWithCredit = {
        ...mockReturnRequest,
        user: { ...mockReturnRequest.user, storeCredit: existingCredit },
      };

      const mockTransaction = {
        id: 'transaction-123',
        amount: 100,
        balanceBefore: 50,
        balanceAfter: 150,
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(returnWithCredit);
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.storeCredit.update.mockResolvedValue({ ...existingCredit, currentBalance: 150 });
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      const result = await service.issueStoreCredit('return-123', 'admin-123', {
        returnRequestId: 'return-123',
        amount: 100,
      });

      expect(result.transaction.balanceBefore).toBe(50);
      expect(result.transaction.balanceAfter).toBe(150);
      expect(mockPrismaService.storeCredit.create).not.toHaveBeenCalled();
    });

    it('should set expiration date if provided', async () => {
      const expiresAt = '2025-12-31T23:59:59.000Z';
      const creditDto = {
        returnRequestId: 'return-123',
        amount: 100,
        expiresAt,
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.storeCredit.create.mockResolvedValue({ id: 'credit-123', currentBalance: 0 });
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue({ id: 'transaction-123', balanceBefore: 0, balanceAfter: 100 });
      mockPrismaService.storeCredit.update.mockResolvedValue({ id: 'credit-123', currentBalance: 100 });
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      await service.issueStoreCredit('return-123', 'admin-123', creditDto);

      expect(mockPrismaService.storeCreditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: new Date(expiresAt),
          }),
        })
      );
    });
  });

  describe('restockItems', () => {
    const mockReturnRequest = {
      id: 'return-123',
      status: ReturnStatus.APPROVED_REFUND,
      items: [
        {
          id: 'return-item-1',
          productId: 'product-123',
          quantity: 2,
        },
        {
          id: 'return-item-2',
          productId: 'product-456',
          quantity: 3,
        },
      ],
    };

    it('should restock items successfully', async () => {
      const restockDto = {
        returnRequestId: 'return-123',
        items: [
          {
            returnItemId: 'return-item-1',
            warehouseId: 'warehouse-123',
            quantity: 2,
          },
          {
            returnItemId: 'return-item-2',
            warehouseId: 'warehouse-123',
            quantity: 3,
          },
        ],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.inventoryItem.upsert.mockResolvedValue({});
      mockPrismaService.returnItem.update.mockResolvedValue({});
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      const result = await service.restockItems(restockDto, 'admin-123');

      expect(result.message).toBe('Items restocked successfully');
      expect(result.updates).toHaveLength(2);
      expect(mockPrismaService.inventoryItem.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.returnItem.update).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.restockItems({ returnRequestId: 'invalid', items: [] }, 'admin-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if return not approved for restocking', async () => {
      const notApprovedReturn = { ...mockReturnRequest, status: ReturnStatus.RECEIVED };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(notApprovedReturn);

      await expect(
        service.restockItems({ returnRequestId: 'return-123', items: [] }, 'admin-123')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.restockItems({ returnRequestId: 'return-123', items: [] }, 'admin-123')
      ).rejects.toThrow('Return must be approved for restocking');
    });

    it('should throw NotFoundException if return item not found', async () => {
      const restockDto = {
        returnRequestId: 'return-123',
        items: [
          {
            returnItemId: 'invalid-item',
            warehouseId: 'warehouse-123',
          },
        ],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);

      await expect(service.restockItems(restockDto, 'admin-123')).rejects.toThrow(NotFoundException);
      await expect(service.restockItems(restockDto, 'admin-123')).rejects.toThrow('Return item invalid-item not found');
    });

    it('should use default quantity from return item if not provided', async () => {
      const restockDto = {
        returnRequestId: 'return-123',
        items: [
          {
            returnItemId: 'return-item-1',
            warehouseId: 'warehouse-123',
            // quantity not provided
          },
        ],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.inventoryItem.upsert.mockResolvedValue({});
      mockPrismaService.returnItem.update.mockResolvedValue({});
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      await service.restockItems(restockDto, 'admin-123');

      expect(mockPrismaService.inventoryItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            quantity: 2, // Uses quantity from return item
          }),
          update: expect.objectContaining({
            quantity: { increment: 2 },
          }),
        })
      );
    });

    it('should create inventory item if it does not exist', async () => {
      const restockDto = {
        returnRequestId: 'return-123',
        items: [
          {
            returnItemId: 'return-item-1',
            warehouseId: 'warehouse-123',
            quantity: 2,
          },
        ],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.inventoryItem.upsert.mockResolvedValue({});
      mockPrismaService.returnItem.update.mockResolvedValue({});
      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturnRequest);

      await service.restockItems(restockDto, 'admin-123');

      expect(mockPrismaService.inventoryItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId_warehouseId: {
              productId: 'product-123',
              warehouseId: 'warehouse-123',
            },
          },
          create: expect.objectContaining({
            productId: 'product-123',
            warehouseId: 'warehouse-123',
            quantity: 2,
            availableQty: 2,
          }),
        })
      );
    });
  });

  describe('getReturns', () => {
    it('should return all returns for admin', async () => {
      const mockReturns = [
        { id: 'return-1', userId: 'user-1' },
        { id: 'return-2', userId: 'user-2' },
      ];

      mockPrismaService.returnRequest.findMany.mockResolvedValue(mockReturns);

      const result = await service.getReturns(null, {});

      expect(result).toEqual(mockReturns);
      expect(mockPrismaService.returnRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should filter returns by userId for non-admin', async () => {
      const mockReturns = [{ id: 'return-1', userId: 'user-123' }];

      mockPrismaService.returnRequest.findMany.mockResolvedValue(mockReturns);

      await service.getReturns('user-123', {});

      expect(mockPrismaService.returnRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should filter returns by status', async () => {
      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      await service.getReturns(null, { status: ReturnStatus.APPROVED });

      expect(mockPrismaService.returnRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReturnStatus.APPROVED,
          }),
        })
      );
    });

    it('should filter returns by date range', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      mockPrismaService.returnRequest.findMany.mockResolvedValue([]);

      await service.getReturns(null, { fromDate, toDate });

      expect(mockPrismaService.returnRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            },
          }),
        })
      );
    });
  });

  describe('getReturnById', () => {
    it('should return return request by ID', async () => {
      const mockReturn = {
        id: 'return-123',
        rmaNumber: 'RMA12345678ABCD',
        items: [],
        order: {},
        user: {},
        refund: null,
        returnLabel: null,
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturn);

      const result = await service.getReturnById('return-123');

      expect(result).toEqual(mockReturn);
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(service.getReturnById('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.getReturnById('invalid')).rejects.toThrow('Return request not found');
    });
  });

  describe('cancelReturn', () => {
    const mockReturnRequest = {
      id: 'return-123',
      userId: 'user-123',
      status: ReturnStatus.REQUESTED,
    };

    it('should cancel return successfully', async () => {
      const cancelDto = {
        returnRequestId: 'return-123',
        reason: 'Customer changed mind',
      };

      const cancelledReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.CANCELLED,
        cancelledAt: new Date(),
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);
      mockPrismaService.returnRequest.update.mockResolvedValue(cancelledReturn);

      const result = await service.cancelReturn('return-123', 'user-123', cancelDto);

      expect(result.status).toBe(ReturnStatus.CANCELLED);
    });

    it('should throw NotFoundException if return not found', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelReturn('invalid', 'user-123', { returnRequestId: 'invalid' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own return', async () => {
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(mockReturnRequest);

      await expect(
        service.cancelReturn('return-123', 'different-user', { returnRequestId: 'return-123' })
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cancelReturn('return-123', 'different-user', { returnRequestId: 'return-123' })
      ).rejects.toThrow('You can only cancel your own returns');
    });

    it('should throw BadRequestException if return cannot be cancelled', async () => {
      const completedReturn = { ...mockReturnRequest, status: ReturnStatus.COMPLETED };
      mockPrismaService.returnRequest.findUnique.mockResolvedValue(completedReturn);

      await expect(
        service.cancelReturn('return-123', 'user-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelReturn('return-123', 'user-123', { returnRequestId: 'return-123' })
      ).rejects.toThrow('Return cannot be cancelled in current status');
    });

    it('should allow cancellation in REQUESTED, PENDING_APPROVAL, and APPROVED statuses', async () => {
      const statuses = [ReturnStatus.REQUESTED, ReturnStatus.PENDING_APPROVAL, ReturnStatus.APPROVED];

      for (const status of statuses) {
        const returnWithStatus = { ...mockReturnRequest, status };
        mockPrismaService.returnRequest.findUnique.mockResolvedValue(returnWithStatus);
        mockPrismaService.returnRequest.update.mockResolvedValue({ ...returnWithStatus, status: ReturnStatus.CANCELLED, items: [], timeline: [] });

        await expect(
          service.cancelReturn('return-123', 'user-123', { returnRequestId: 'return-123' })
        ).resolves.toBeDefined();
      }
    });
  });

  describe('getReturnAnalytics', () => {
    it('should return analytics summary', async () => {
      const mockAnalytics = {
        totalReturns: 100,
        returnsByStatus: [
          { status: ReturnStatus.REQUESTED, _count: 20 },
          { status: ReturnStatus.APPROVED, _count: 30 },
          { status: ReturnStatus.COMPLETED, _count: 50 },
        ],
        returnsByReason: [
          { reason: ReturnReason.DEFECTIVE, _count: 40 },
          { reason: ReturnReason.WRONG_ITEM, _count: 30 },
        ],
        returnsByType: [
          { returnType: ReturnType.REFUND, _count: 80 },
          { returnType: ReturnType.STORE_CREDIT, _count: 20 },
        ],
        totalRefunded: { _sum: { totalAmount: 5000 } },
      };

      mockPrismaService.returnRequest.count.mockResolvedValue(100);
      mockPrismaService.returnRequest.groupBy
        .mockResolvedValueOnce(mockAnalytics.returnsByStatus)
        .mockResolvedValueOnce(mockAnalytics.returnsByReason)
        .mockResolvedValueOnce(mockAnalytics.returnsByType);
      mockPrismaService.refund.aggregate.mockResolvedValue(mockAnalytics.totalRefunded);

      const result = await service.getReturnAnalytics({});

      expect(result.totalReturns).toBe(100);
      expect(result.totalRefunded).toBe(5000);
      expect(result.returnsByStatus).toEqual(mockAnalytics.returnsByStatus);
    });

    it('should filter analytics by date range', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockPrismaService.returnRequest.count.mockResolvedValue(50);
      mockPrismaService.returnRequest.groupBy.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: 2500 } });

      await service.getReturnAnalytics(filters);

      expect(mockPrismaService.returnRequest.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(filters.startDate),
              lte: new Date(filters.endDate),
            },
          }),
        })
      );
    });

    it('should handle null total refunded', async () => {
      mockPrismaService.returnRequest.count.mockResolvedValue(10);
      mockPrismaService.returnRequest.groupBy.mockResolvedValue([]);
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await service.getReturnAnalytics({});

      expect(result.totalRefunded).toBe(0);
    });
  });

  describe('markAsReceived', () => {
    it('should mark return as received', async () => {
      const mockReturn = {
        id: 'return-123',
        status: ReturnStatus.RECEIVED,
        receivedAt: new Date(),
        items: [],
        timeline: [],
      };

      mockPrismaService.returnRequest.update.mockResolvedValue(mockReturn);

      const result = await service.markAsReceived('return-123', 'admin-123');

      expect(result.status).toBe(ReturnStatus.RECEIVED);
      expect(result.receivedAt).toBeDefined();
    });

    it('should update timeline when marking as received', async () => {
      mockPrismaService.returnRequest.update.mockResolvedValue({
        id: 'return-123',
        status: ReturnStatus.RECEIVED,
        items: [],
        timeline: [],
      });

      await service.markAsReceived('return-123', 'admin-123');

      expect(mockPrismaService.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReturnStatus.RECEIVED,
            receivedAt: expect.any(Date),
            timeline: expect.objectContaining({
              create: expect.objectContaining({
                status: ReturnStatus.RECEIVED,
                description: 'Return package received at warehouse',
                performedBy: 'admin-123',
              }),
            }),
          }),
        })
      );
    });
  });
});
