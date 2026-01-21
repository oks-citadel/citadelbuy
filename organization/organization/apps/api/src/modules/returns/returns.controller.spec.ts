import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReturnStatus, ReturnReason, ReturnType, RefundMethod } from '@prisma/client';

describe('ReturnsController', () => {
  let controller: ReturnsController;
  let service: ReturnsService;

  const mockReturnsService = {
    createReturnRequest: jest.fn(),
    getReturns: jest.fn(),
    getReturnById: jest.fn(),
    getReturnByIdSecure: jest.fn(),
    cancelReturn: jest.fn(),
    approveReturn: jest.fn(),
    generateReturnLabel: jest.fn(),
    markAsReceived: jest.fn(),
    inspectReturn: jest.fn(),
    createRefund: jest.fn(),
    processRefund: jest.fn(),
    issueStoreCredit: jest.fn(),
    restockItems: jest.fn(),
    getReturnAnalytics: jest.fn(),
  };

  const mockPrismaService = {
    returnRequest: {
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  };

  const mockReturnRequest = {
    id: 'return-123',
    rmaNumber: 'RMA12345678ABCD',
    orderId: 'order-123',
    userId: 'user-123',
    status: ReturnStatus.REQUESTED,
    returnType: ReturnType.REFUND,
    reason: ReturnReason.DEFECTIVE,
    refundAmount: 100,
    createdAt: new Date(),
    items: [],
    timeline: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReturnsController],
      providers: [
        {
          provide: ReturnsService,
          useValue: mockReturnsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = request.user || mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ReturnsController>(ReturnsController);
    service = module.get<ReturnsService>(ReturnsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReturn', () => {
    it('should create a return request', async () => {
      const createDto = {
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
            itemPrice: 100,
          },
        ],
      };

      mockReturnsService.createReturnRequest.mockResolvedValue(mockReturnRequest);

      const result = await controller.createReturn({ user: mockUser }, createDto);

      expect(result).toEqual(mockReturnRequest);
      expect(mockReturnsService.createReturnRequest).toHaveBeenCalledWith('user-123', createDto);
    });

    it('should pass user ID from request', async () => {
      const createDto = {
        orderId: 'order-456',
        returnType: ReturnType.EXCHANGE,
        reason: ReturnReason.WRONG_ITEM,
        items: [],
      };

      mockReturnsService.createReturnRequest.mockResolvedValue(mockReturnRequest);

      await controller.createReturn({ user: { id: 'different-user' } }, createDto);

      expect(mockReturnsService.createReturnRequest).toHaveBeenCalledWith('different-user', createDto);
    });
  });

  describe('getMyReturns', () => {
    it('should return user returns', async () => {
      const mockReturns = [mockReturnRequest];
      const filters = { status: ReturnStatus.REQUESTED };

      mockReturnsService.getReturns.mockResolvedValue(mockReturns);

      const result = await controller.getMyReturns({ user: mockUser }, filters);

      expect(result).toEqual(mockReturns);
      expect(mockReturnsService.getReturns).toHaveBeenCalledWith('user-123', filters);
    });

    it('should pass filters to service', async () => {
      const filters = {
        status: ReturnStatus.APPROVED,
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      };

      mockReturnsService.getReturns.mockResolvedValue([]);

      await controller.getMyReturns({ user: mockUser }, filters);

      expect(mockReturnsService.getReturns).toHaveBeenCalledWith('user-123', filters);
    });
  });

  describe('getReturnById', () => {
    it('should return a single return request', async () => {
      mockReturnsService.getReturnByIdSecure.mockResolvedValue(mockReturnRequest);

      const result = await controller.getReturnById({ user: mockUser }, 'return-123');

      expect(result).toEqual(mockReturnRequest);
      expect(mockReturnsService.getReturnByIdSecure).toHaveBeenCalledWith('return-123', 'user-123', 'CUSTOMER');
    });

    it('should handle different return IDs', async () => {
      const differentReturn = { ...mockReturnRequest, id: 'return-456' };
      mockReturnsService.getReturnByIdSecure.mockResolvedValue(differentReturn);

      await controller.getReturnById({ user: mockAdminUser }, 'return-456');

      expect(mockReturnsService.getReturnByIdSecure).toHaveBeenCalledWith('return-456', 'admin-123', 'ADMIN');
    });
  });

  describe('cancelReturn', () => {
    it('should cancel a return request', async () => {
      const cancelDto = {
        returnRequestId: 'return-123',
        reason: 'Customer changed mind',
      };

      const cancelledReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.CANCELLED,
        cancelledAt: new Date(),
      };

      mockReturnsService.cancelReturn.mockResolvedValue(cancelledReturn);

      const result = await controller.cancelReturn({ user: mockUser }, 'return-123', cancelDto);

      expect(result.status).toBe(ReturnStatus.CANCELLED);
      expect(mockReturnsService.cancelReturn).toHaveBeenCalledWith('return-123', 'user-123', cancelDto);
    });

    it('should pass user ID from request', async () => {
      const cancelDto = { returnRequestId: 'return-123' };

      mockReturnsService.cancelReturn.mockResolvedValue(mockReturnRequest);

      await controller.cancelReturn({ user: { id: 'another-user' } }, 'return-123', cancelDto);

      expect(mockReturnsService.cancelReturn).toHaveBeenCalledWith('return-123', 'another-user', cancelDto);
    });
  });

  describe('getAllReturns (Admin)', () => {
    it('should return all returns for admin', async () => {
      const mockReturns = [mockReturnRequest];
      const filters = {};

      mockReturnsService.getReturns.mockResolvedValue(mockReturns);

      const result = await controller.getAllReturns(filters);

      expect(result).toEqual(mockReturns);
      expect(mockReturnsService.getReturns).toHaveBeenCalledWith(null, filters);
    });

    it('should apply filters', async () => {
      const filters = {
        status: ReturnStatus.APPROVED,
        returnType: ReturnType.REFUND,
      };

      mockReturnsService.getReturns.mockResolvedValue([]);

      await controller.getAllReturns(filters);

      expect(mockReturnsService.getReturns).toHaveBeenCalledWith(null, filters);
    });
  });

  describe('approveReturn (Admin)', () => {
    it('should approve a return', async () => {
      const approveDto = {
        approved: true,
        restockingFee: 10,
      };

      const approvedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED,
        approvedBy: 'admin-123',
        approvedAt: new Date(),
      };

      mockReturnsService.approveReturn.mockResolvedValue(approvedReturn);

      const result = await controller.approveReturn({ user: mockAdminUser }, 'return-123', approveDto);

      expect(result.status).toBe(ReturnStatus.APPROVED);
      expect(mockReturnsService.approveReturn).toHaveBeenCalledWith('return-123', 'admin-123', approveDto);
    });

    it('should reject a return', async () => {
      const rejectDto = {
        approved: false,
        reason: 'Does not meet return policy',
      };

      const rejectedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
        rejectedAt: new Date(),
      };

      mockReturnsService.approveReturn.mockResolvedValue(rejectedReturn);

      const result = await controller.approveReturn({ user: mockAdminUser }, 'return-123', rejectDto);

      expect(result.status).toBe(ReturnStatus.REJECTED);
    });
  });

  describe('generateReturnLabel (Admin)', () => {
    it('should generate a return label', async () => {
      const labelDto = {
        returnRequestId: 'return-123',
        carrier: 'UPS',
        serviceLevel: 'GROUND',
      };

      const mockLabel = {
        id: 'label-123',
        trackingNumber: 'TRACK123456',
        labelUrl: 'https://example.com/label.pdf',
      };

      const result = {
        returnRequest: {
          ...mockReturnRequest,
          status: ReturnStatus.LABEL_SENT,
          trackingNumber: 'TRACK123456',
        },
        label: mockLabel,
      };

      mockReturnsService.generateReturnLabel.mockResolvedValue(result);

      const response = await controller.generateReturnLabel('return-123', labelDto);

      expect(response.returnRequest.status).toBe(ReturnStatus.LABEL_SENT);
      expect(response.label.trackingNumber).toBe('TRACK123456');
      expect(mockReturnsService.generateReturnLabel).toHaveBeenCalledWith('return-123', labelDto);
    });

    it('should handle label generation without carrier/service level', async () => {
      const labelDto = { returnRequestId: 'return-123' };

      mockReturnsService.generateReturnLabel.mockResolvedValue({
        returnRequest: mockReturnRequest,
        label: { id: 'label-123' },
      });

      await controller.generateReturnLabel('return-123', labelDto);

      expect(mockReturnsService.generateReturnLabel).toHaveBeenCalledWith('return-123', labelDto);
    });
  });

  describe('markAsReceived (Admin)', () => {
    it('should mark return as received', async () => {
      const receivedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.RECEIVED,
        receivedAt: new Date(),
      };

      mockReturnsService.markAsReceived.mockResolvedValue(receivedReturn);

      const result = await controller.markAsReceived({ user: mockAdminUser }, 'return-123');

      expect(result.status).toBe(ReturnStatus.RECEIVED);
      expect(mockReturnsService.markAsReceived).toHaveBeenCalledWith('return-123', 'admin-123');
    });

    it('should pass admin ID from request', async () => {
      mockReturnsService.markAsReceived.mockResolvedValue(mockReturnRequest);

      await controller.markAsReceived({ user: { id: 'different-admin' } }, 'return-123');

      expect(mockReturnsService.markAsReceived).toHaveBeenCalledWith('return-123', 'different-admin');
    });
  });

  describe('inspectReturn (Admin)', () => {
    it('should approve return after inspection', async () => {
      const inspectDto = {
        approved: true,
        inspectionNotes: 'Item in good condition',
        inspectionPhotos: ['photo1.jpg'],
      };

      const inspectedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.APPROVED_REFUND,
        inspectedAt: new Date(),
        inspectedBy: 'admin-123',
      };

      mockReturnsService.inspectReturn.mockResolvedValue(inspectedReturn);

      const result = await controller.inspectReturn({ user: mockAdminUser }, 'return-123', inspectDto);

      expect(result.status).toBe(ReturnStatus.APPROVED_REFUND);
      expect(mockReturnsService.inspectReturn).toHaveBeenCalledWith('return-123', 'admin-123', inspectDto);
    });

    it('should reject return after inspection', async () => {
      const inspectDto = {
        approved: false,
        inspectionNotes: 'Item damaged by customer',
      };

      const inspectedReturn = {
        ...mockReturnRequest,
        status: ReturnStatus.REJECTED,
      };

      mockReturnsService.inspectReturn.mockResolvedValue(inspectedReturn);

      const result = await controller.inspectReturn({ user: mockAdminUser }, 'return-123', inspectDto);

      expect(result.status).toBe(ReturnStatus.REJECTED);
    });
  });

  describe('createRefund (Admin)', () => {
    it('should create a refund', async () => {
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
        method: RefundMethod.ORIGINAL_PAYMENT,
        totalAmount: 113,
        status: 'PENDING',
      };

      mockReturnsService.createRefund.mockResolvedValue(mockRefund);

      const result = await controller.createRefund('return-123', refundDto);

      expect(result).toEqual(mockRefund);
      expect(mockReturnsService.createRefund).toHaveBeenCalledWith('return-123', {
        ...refundDto,
        returnRequestId: 'return-123',
      });
    });

    it('should handle minimal refund DTO', async () => {
      const refundDto = {
        returnRequestId: 'return-123',
        method: RefundMethod.STORE_CREDIT,
      };

      mockReturnsService.createRefund.mockResolvedValue({ id: 'refund-123' });

      await controller.createRefund('return-123', refundDto);

      expect(mockReturnsService.createRefund).toHaveBeenCalledWith('return-123', {
        ...refundDto,
        returnRequestId: 'return-123',
      });
    });
  });

  describe('processRefund (Admin)', () => {
    it('should process a refund', async () => {
      const processedRefund = {
        id: 'refund-123',
        status: 'COMPLETED',
        processedAt: new Date(),
        processedBy: 'admin-123',
        transactionId: 're_12345',
      };

      mockReturnsService.processRefund.mockResolvedValue(processedRefund);

      const result = await controller.processRefund({ user: mockAdminUser }, 'refund-123');

      expect(result.status).toBe('COMPLETED');
      expect(mockReturnsService.processRefund).toHaveBeenCalledWith('refund-123', 'admin-123');
    });

    it('should pass admin ID from request', async () => {
      mockReturnsService.processRefund.mockResolvedValue({ id: 'refund-123' });

      await controller.processRefund({ user: { id: 'other-admin' } }, 'refund-123');

      expect(mockReturnsService.processRefund).toHaveBeenCalledWith('refund-123', 'other-admin');
    });
  });

  describe('issueStoreCredit (Admin)', () => {
    it('should issue store credit', async () => {
      const creditDto = {
        returnRequestId: 'return-123',
        amount: 100,
        reason: 'Return refund',
        expiresAt: '2025-12-31T23:59:59.000Z',
      };

      const mockResult = {
        transaction: {
          id: 'transaction-123',
          amount: 100,
          balanceAfter: 100,
        },
        storeCredit: {
          id: 'credit-123',
          currentBalance: 100,
        },
      };

      mockReturnsService.issueStoreCredit.mockResolvedValue(mockResult);

      const result = await controller.issueStoreCredit({ user: mockAdminUser }, 'return-123', creditDto);

      expect(result.transaction.amount).toBe(100);
      expect(result.storeCredit.currentBalance).toBe(100);
      expect(mockReturnsService.issueStoreCredit).toHaveBeenCalledWith('return-123', 'admin-123', {
        ...creditDto,
        returnRequestId: 'return-123',
      });
    });

    it('should handle store credit without expiration', async () => {
      const creditDto = {
        returnRequestId: 'return-123',
        amount: 50,
      };

      mockReturnsService.issueStoreCredit.mockResolvedValue({
        transaction: { id: 'transaction-123' },
        storeCredit: { id: 'credit-123' },
      });

      await controller.issueStoreCredit({ user: mockAdminUser }, 'return-123', creditDto);

      expect(mockReturnsService.issueStoreCredit).toHaveBeenCalledWith('return-123', 'admin-123', {
        ...creditDto,
        returnRequestId: 'return-123',
      });
    });
  });

  describe('restockItems (Admin)', () => {
    it('should restock items', async () => {
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

      const mockResult = {
        message: 'Items restocked successfully',
        updates: [
          { returnItemId: 'return-item-1', quantity: 2 },
          { returnItemId: 'return-item-2', quantity: 3 },
        ],
      };

      mockReturnsService.restockItems.mockResolvedValue(mockResult);

      const result = await controller.restockItems({ user: mockAdminUser }, restockDto);

      expect(result.message).toBe('Items restocked successfully');
      expect(result.updates).toHaveLength(2);
      expect(mockReturnsService.restockItems).toHaveBeenCalledWith(restockDto, 'admin-123');
    });

    it('should handle single item restock', async () => {
      const restockDto = {
        returnRequestId: 'return-123',
        items: [
          {
            returnItemId: 'return-item-1',
            warehouseId: 'warehouse-123',
            quantity: 1,
          },
        ],
      };

      mockReturnsService.restockItems.mockResolvedValue({
        message: 'Items restocked successfully',
        updates: [{ returnItemId: 'return-item-1', quantity: 1 }],
      });

      await controller.restockItems({ user: mockAdminUser }, restockDto);

      expect(mockReturnsService.restockItems).toHaveBeenCalledWith(restockDto, 'admin-123');
    });
  });

  describe('getAnalytics (Admin)', () => {
    it('should return return analytics', async () => {
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
        totalRefunded: 5000,
      };

      mockReturnsService.getReturnAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics({});

      expect(result).toEqual(mockAnalytics);
      expect(result.totalReturns).toBe(100);
      expect(result.totalRefunded).toBe(5000);
    });

    it('should apply date filters to analytics', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockReturnsService.getReturnAnalytics.mockResolvedValue({
        totalReturns: 50,
        returnsByStatus: [],
        returnsByReason: [],
        returnsByType: [],
        totalRefunded: 2500,
      });

      await controller.getAnalytics(filters);

      expect(mockReturnsService.getReturnAnalytics).toHaveBeenCalledWith(filters);
    });
  });

  describe('updateReturn (Admin)', () => {
    it('should update return request', async () => {
      const updateDto = {
        status: ReturnStatus.APPROVED,
        comments: 'Updated comments',
      };

      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        ...updateDto,
      });

      const result = await controller.updateReturn('return-123', updateDto);

      expect(result.status).toBe(ReturnStatus.APPROVED);
      expect(mockPrismaService.returnRequest.update).toHaveBeenCalledWith({
        where: { id: 'return-123' },
        data: updateDto,
      });
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        comments: 'New comment only',
      };

      mockPrismaService.returnRequest.update.mockResolvedValue({
        ...mockReturnRequest,
        comments: 'New comment only',
      });

      await controller.updateReturn('return-123', updateDto);

      expect(mockPrismaService.returnRequest.update).toHaveBeenCalledWith({
        where: { id: 'return-123' },
        data: updateDto,
      });
    });
  });
});
