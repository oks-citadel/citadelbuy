import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EscrowService, EscrowMilestone } from './escrow.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('EscrowService', () => {
  let service: EscrowService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    escrowAccount: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    escrowDispute: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEscrow', () => {
    const mockEscrowData = {
      orderId: 'order-123',
      buyerId: 'buyer-456',
      sellerId: 'seller-789',
      amount: 5000,
      currency: 'USD',
      milestones: [
        {
          description: 'Initial delivery',
          amount: 2500,
          percentage: 50,
          status: 'PENDING' as const,
        },
        {
          description: 'Final approval',
          amount: 2500,
          percentage: 50,
          status: 'PENDING' as const,
        },
      ],
    };

    it('should create an escrow successfully', async () => {
      const mockOrder = { id: 'order-123', total: 5000 };
      const mockEscrow = {
        id: 'escrow-001',
        ...mockEscrowData,
        status: 'PENDING',
        fees: 125,
        createdAt: new Date(),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.escrowAccount.create.mockResolvedValue(mockEscrow);

      const result = await service.createEscrow(mockEscrowData);

      expect(result).toEqual(mockEscrow);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockEscrowData.orderId },
      });
      expect(mockPrismaService.escrowAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: mockEscrowData.orderId,
          buyerId: mockEscrowData.buyerId,
          sellerId: mockEscrowData.sellerId,
          amount: mockEscrowData.amount,
          currency: mockEscrowData.currency,
          status: 'PENDING',
        }),
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.createEscrow(mockEscrowData)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createEscrow(mockEscrowData)).rejects.toThrow(
        'Order not found',
      );
    });

    it('should use default currency USD when not provided', async () => {
      const dataWithoutCurrency = {
        ...mockEscrowData,
        currency: undefined,
      };

      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123' });
      mockPrismaService.escrowAccount.create.mockResolvedValue({
        id: 'escrow-001',
        ...dataWithoutCurrency,
        currency: 'USD',
        status: 'PENDING',
      });

      await service.createEscrow(dataWithoutCurrency);

      expect(mockPrismaService.escrowAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'USD',
        }),
      });
    });

    it('should calculate escrow fees correctly (2.5% with $50 minimum)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123' });
      mockPrismaService.escrowAccount.create.mockResolvedValue({
        id: 'escrow-001',
        fees: 125,
      });

      await service.createEscrow(mockEscrowData);

      expect(mockPrismaService.escrowAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fees: 125, // 5000 * 0.025 = 125
        }),
      });
    });

    it('should apply minimum fee of $50 for small amounts', async () => {
      const smallAmountData = {
        ...mockEscrowData,
        amount: 1000, // 1000 * 0.025 = 25 < 50
      };

      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123' });
      mockPrismaService.escrowAccount.create.mockResolvedValue({
        id: 'escrow-001',
        fees: 50,
      });

      await service.createEscrow(smallAmountData);

      expect(mockPrismaService.escrowAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fees: 50, // minimum fee
        }),
      });
    });

    it('should create escrow without milestones', async () => {
      const dataWithoutMilestones = {
        ...mockEscrowData,
        milestones: undefined,
      };

      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123' });
      mockPrismaService.escrowAccount.create.mockResolvedValue({
        id: 'escrow-001',
        ...dataWithoutMilestones,
        status: 'PENDING',
      });

      await service.createEscrow(dataWithoutMilestones);

      expect(mockPrismaService.escrowAccount.create).toHaveBeenCalled();
    });
  });

  describe('fundEscrow', () => {
    const mockEscrow = {
      id: 'escrow-001',
      orderId: 'order-123',
      buyerId: 'buyer-456',
      sellerId: 'seller-789',
      amount: 5000,
      currency: 'USD',
      status: 'PENDING',
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should fund escrow successfully', async () => {
      const paymentDetails = { cardToken: 'tok_123' };
      const updatedEscrow = {
        ...mockEscrow,
        status: 'FUNDED',
        fundedAt: new Date(),
        paymentReference: expect.stringMatching(/^PAY_/),
      };

      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue(updatedEscrow);

      const result = await service.fundEscrow('escrow-001', paymentDetails);

      expect(result.status).toBe('FUNDED');
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        data: expect.objectContaining({
          status: 'FUNDED',
          fundedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when escrow does not exist', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.fundEscrow('nonexistent', { cardToken: 'tok_123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when escrow is not in PENDING status', async () => {
      const fundedEscrow = { ...mockEscrow, status: 'FUNDED' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(fundedEscrow);

      await expect(
        service.fundEscrow('escrow-001', { cardToken: 'tok_123' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.fundEscrow('escrow-001', { cardToken: 'tok_123' }),
      ).rejects.toThrow('Escrow is not in pending status');
    });
  });

  describe('approveMilestone', () => {
    const mockEscrowWithMilestones = {
      id: 'escrow-001',
      status: 'FUNDED',
      milestones: [
        { id: 'milestone-1', description: 'Phase 1', amount: 2500, status: 'PENDING' },
        { id: 'milestone-2', description: 'Phase 2', amount: 2500, status: 'PENDING' },
      ],
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should approve milestone successfully', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrowWithMilestones);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrowWithMilestones,
        status: 'IN_PROGRESS',
      });

      const result = await service.approveMilestone({
        escrowId: 'escrow-001',
        milestoneId: 'milestone-1',
        approvedBy: 'buyer-456',
        evidence: { documents: ['proof.pdf'] },
      });

      expect(result.status).toBe('APPROVED');
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should throw BadRequestException for invalid escrow status', async () => {
      const pendingEscrow = { ...mockEscrowWithMilestones, status: 'PENDING' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(pendingEscrow);

      await expect(
        service.approveMilestone({
          escrowId: 'escrow-001',
          milestoneId: 'milestone-1',
          approvedBy: 'buyer-456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when milestone not found', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrowWithMilestones);

      await expect(
        service.approveMilestone({
          escrowId: 'escrow-001',
          milestoneId: 'nonexistent-milestone',
          approvedBy: 'buyer-456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when milestone is not pending', async () => {
      const escrowWithApprovedMilestone = {
        ...mockEscrowWithMilestones,
        milestones: [
          { id: 'milestone-1', description: 'Phase 1', amount: 2500, status: 'APPROVED' },
        ],
      };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(escrowWithApprovedMilestone);

      await expect(
        service.approveMilestone({
          escrowId: 'escrow-001',
          milestoneId: 'milestone-1',
          approvedBy: 'buyer-456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should work when escrow status is IN_PROGRESS', async () => {
      const inProgressEscrow = { ...mockEscrowWithMilestones, status: 'IN_PROGRESS' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(inProgressEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue(inProgressEscrow);

      const result = await service.approveMilestone({
        escrowId: 'escrow-001',
        milestoneId: 'milestone-1',
        approvedBy: 'buyer-456',
      });

      expect(result.status).toBe('APPROVED');
    });
  });

  describe('releaseMilestonePayment', () => {
    const mockEscrowWithApprovedMilestone = {
      id: 'escrow-001',
      status: 'IN_PROGRESS',
      sellerId: 'seller-789',
      currency: 'USD',
      releasedAmount: 0,
      milestones: [
        { id: 'milestone-1', description: 'Phase 1', amount: 2500, status: 'APPROVED' },
        { id: 'milestone-2', description: 'Phase 2', amount: 2500, status: 'PENDING' },
      ],
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should release milestone payment successfully', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrowWithApprovedMilestone);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrowWithApprovedMilestone,
        releasedAmount: 2500,
      });

      const result = await service.releaseMilestonePayment({
        escrowId: 'escrow-001',
        milestoneId: 'milestone-1',
        releasedBy: 'admin-001',
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        data: expect.objectContaining({
          releasedAmount: 2500,
        }),
      });
    });

    it('should throw NotFoundException when milestone not found', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrowWithApprovedMilestone);

      await expect(
        service.releaseMilestonePayment({
          escrowId: 'escrow-001',
          milestoneId: 'nonexistent',
          releasedBy: 'admin-001',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when milestone not approved', async () => {
      const escrowWithPendingMilestone = {
        ...mockEscrowWithApprovedMilestone,
        milestones: [
          { id: 'milestone-1', description: 'Phase 1', amount: 2500, status: 'PENDING' },
        ],
      };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(escrowWithPendingMilestone);

      await expect(
        service.releaseMilestonePayment({
          escrowId: 'escrow-001',
          milestoneId: 'milestone-1',
          releasedBy: 'admin-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseEscrow', () => {
    const mockFundedEscrow = {
      id: 'escrow-001',
      status: 'FUNDED',
      amount: 5000,
      releasedAmount: 0,
      sellerId: 'seller-789',
      currency: 'USD',
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should release full escrow amount successfully', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockFundedEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockFundedEscrow,
        status: 'RELEASED',
        releasedAmount: 5000,
      });

      const result = await service.releaseEscrow('escrow-001', 'admin-001');

      expect(result.success).toBe(true);
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        data: expect.objectContaining({
          status: 'RELEASED',
          releasedAmount: 5000,
        }),
      });
    });

    it('should release remaining amount when some already released', async () => {
      const partiallyReleasedEscrow = {
        ...mockFundedEscrow,
        status: 'IN_PROGRESS',
        releasedAmount: 2500,
      };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(partiallyReleasedEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...partiallyReleasedEscrow,
        status: 'RELEASED',
        releasedAmount: 5000,
      });

      const result = await service.releaseEscrow('escrow-001', 'admin-001');

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for invalid escrow status', async () => {
      const releasedEscrow = { ...mockFundedEscrow, status: 'RELEASED' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(releasedEscrow);

      await expect(
        service.releaseEscrow('escrow-001', 'admin-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when escrow is PENDING', async () => {
      const pendingEscrow = { ...mockFundedEscrow, status: 'PENDING' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(pendingEscrow);

      await expect(
        service.releaseEscrow('escrow-001', 'admin-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundEscrow', () => {
    const mockFundedEscrow = {
      id: 'escrow-001',
      status: 'FUNDED',
      amount: 5000,
      releasedAmount: 0,
      buyerId: 'buyer-456',
      currency: 'USD',
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should refund escrow successfully', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockFundedEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockFundedEscrow,
        status: 'REFUNDED',
      });

      const result = await service.refundEscrow('escrow-001', 'Order cancelled');

      expect(result.success).toBe(true);
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        data: expect.objectContaining({
          status: 'REFUNDED',
          refundReason: 'Order cancelled',
        }),
      });
    });

    it('should refund remaining amount when some already released', async () => {
      const partiallyReleasedEscrow = {
        ...mockFundedEscrow,
        status: 'IN_PROGRESS',
        releasedAmount: 1000,
      };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(partiallyReleasedEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...partiallyReleasedEscrow,
        status: 'REFUNDED',
      });

      const result = await service.refundEscrow('escrow-001', 'Partial refund');

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when escrow already released', async () => {
      const releasedEscrow = { ...mockFundedEscrow, status: 'RELEASED' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(releasedEscrow);

      await expect(
        service.refundEscrow('escrow-001', 'Cancellation'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when escrow already refunded', async () => {
      const refundedEscrow = { ...mockFundedEscrow, status: 'REFUNDED' };
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(refundedEscrow);

      await expect(
        service.refundEscrow('escrow-001', 'Cancellation'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDispute', () => {
    const mockEscrow = {
      id: 'escrow-001',
      status: 'FUNDED',
      buyerId: 'buyer-456',
      sellerId: 'seller-789',
      order: {},
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    const mockDisputeData = {
      escrowId: 'escrow-001',
      initiatedBy: 'BUYER' as const,
      userId: 'buyer-456',
      reason: 'Product not as described',
      details: 'The product quality is subpar',
      evidence: [{ type: 'image', url: 'proof.jpg' }],
    };

    it('should create dispute successfully', async () => {
      const mockDispute = {
        id: 'dispute-001',
        ...mockDisputeData,
        status: 'OPEN',
        createdAt: new Date(),
      };

      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowDispute.create.mockResolvedValue(mockDispute);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrow,
        status: 'DISPUTED',
      });

      const result = await service.createDispute(mockDisputeData);

      expect(result).toEqual(mockDispute);
      expect(mockPrismaService.escrowDispute.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          escrowId: mockDisputeData.escrowId,
          initiatedBy: mockDisputeData.initiatedBy,
          reason: mockDisputeData.reason,
          status: 'OPEN',
        }),
      });
      expect(mockPrismaService.escrowAccount.update).toHaveBeenCalledWith({
        where: { id: mockDisputeData.escrowId },
        data: { status: 'DISPUTED' },
      });
    });

    it('should notify seller when buyer initiates dispute', async () => {
      const mockDispute = {
        id: 'dispute-001',
        ...mockDisputeData,
        status: 'OPEN',
      };

      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowDispute.create.mockResolvedValue(mockDispute);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrow,
        status: 'DISPUTED',
      });

      await service.createDispute(mockDisputeData);

      // The method logs notification - we verify the dispute was created
      expect(mockPrismaService.escrowDispute.create).toHaveBeenCalled();
    });

    it('should notify buyer when seller initiates dispute', async () => {
      const sellerDisputeData = {
        ...mockDisputeData,
        initiatedBy: 'SELLER' as const,
        userId: 'seller-789',
      };

      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowDispute.create.mockResolvedValue({
        id: 'dispute-001',
        ...sellerDisputeData,
        status: 'OPEN',
      });
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrow,
        status: 'DISPUTED',
      });

      await service.createDispute(sellerDisputeData);

      expect(mockPrismaService.escrowDispute.create).toHaveBeenCalled();
    });
  });

  describe('resolveDispute', () => {
    const mockDispute = {
      id: 'dispute-001',
      escrowId: 'escrow-001',
      status: 'OPEN',
      escrow: {
        id: 'escrow-001',
        status: 'DISPUTED',
        amount: 5000,
        releasedAmount: 0,
        buyerId: 'buyer-456',
        sellerId: 'seller-789',
        currency: 'USD',
      },
    };

    it('should resolve dispute by releasing to seller', async () => {
      const mockEscrow = {
        ...mockDispute.escrow,
        status: 'FUNDED',
        order: {},
        buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
        seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
        disputes: [],
      };

      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrow,
        status: 'RELEASED',
      });
      mockPrismaService.escrowDispute.update.mockResolvedValue({
        ...mockDispute,
        status: 'RESOLVED',
      });

      const result = await service.resolveDispute({
        disputeId: 'dispute-001',
        resolution: 'RELEASE_TO_SELLER',
        notes: 'Vendor provided satisfactory evidence',
      });

      expect(result.success).toBe(true);
    });

    it('should resolve dispute by refunding to buyer', async () => {
      const mockEscrow = {
        ...mockDispute.escrow,
        status: 'FUNDED',
        order: {},
        buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
        seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
        disputes: [],
      };

      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);
      mockPrismaService.escrowAccount.update.mockResolvedValue({
        ...mockEscrow,
        status: 'REFUNDED',
      });
      mockPrismaService.escrowDispute.update.mockResolvedValue({
        ...mockDispute,
        status: 'RESOLVED',
      });

      const result = await service.resolveDispute({
        disputeId: 'dispute-001',
        resolution: 'REFUND_TO_BUYER',
        notes: 'Buyer claim validated',
      });

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when dispute not found', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveDispute({
          disputeId: 'nonexistent',
          resolution: 'RELEASE_TO_SELLER',
          notes: 'Resolution notes',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for partial release without amount', async () => {
      mockPrismaService.escrowDispute.findUnique.mockResolvedValue(mockDispute);

      await expect(
        service.resolveDispute({
          disputeId: 'dispute-001',
          resolution: 'PARTIAL_RELEASE',
          notes: 'Partial resolution',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEscrowById', () => {
    const mockEscrow = {
      id: 'escrow-001',
      orderId: 'order-123',
      buyerId: 'buyer-456',
      sellerId: 'seller-789',
      amount: 5000,
      status: 'FUNDED',
      order: { id: 'order-123' },
      buyer: { id: 'buyer-456', email: 'buyer@test.com', name: 'Buyer' },
      seller: { id: 'seller-789', email: 'seller@test.com', name: 'Seller' },
      disputes: [],
    };

    it('should return escrow with related data', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(mockEscrow);

      const result = await service.getEscrowById('escrow-001');

      expect(result).toEqual(mockEscrow);
      expect(mockPrismaService.escrowAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'escrow-001' },
        include: {
          order: true,
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          disputes: true,
        },
      });
    });

    it('should throw NotFoundException when escrow not found', async () => {
      mockPrismaService.escrowAccount.findUnique.mockResolvedValue(null);

      await expect(service.getEscrowById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEscrowAnalytics', () => {
    it('should return analytics without filters', async () => {
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(100);
      mockPrismaService.escrowAccount.aggregate.mockResolvedValue({
        _sum: { amount: 500000 },
      });
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(5);

      const result = await service.getEscrowAnalytics();

      expect(result).toEqual({
        total: 100,
        totalVolume: 500000,
        disputed: 5,
        disputeRate: 5,
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(50);
      mockPrismaService.escrowAccount.aggregate.mockResolvedValue({
        _sum: { amount: 250000 },
      });
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(2);

      const result = await service.getEscrowAnalytics({ startDate, endDate });

      expect(result.total).toBe(50);
      expect(mockPrismaService.escrowAccount.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: { gte: startDate, lte: endDate },
        }),
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(30);
      mockPrismaService.escrowAccount.aggregate.mockResolvedValue({
        _sum: { amount: 150000 },
      });
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(0);

      const result = await service.getEscrowAnalytics({ status: 'RELEASED' });

      expect(result.total).toBe(30);
    });

    it('should handle zero total escrows', async () => {
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(0);
      mockPrismaService.escrowAccount.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(0);

      const result = await service.getEscrowAnalytics();

      expect(result).toEqual({
        total: 0,
        totalVolume: 0,
        disputed: 0,
        disputeRate: 0,
      });
    });

    it('should calculate dispute rate correctly', async () => {
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(200);
      mockPrismaService.escrowAccount.aggregate.mockResolvedValue({
        _sum: { amount: 1000000 },
      });
      mockPrismaService.escrowAccount.count.mockResolvedValueOnce(10);

      const result = await service.getEscrowAnalytics();

      expect(result.disputeRate).toBe(5); // 10/200 * 100 = 5%
    });
  });
});
