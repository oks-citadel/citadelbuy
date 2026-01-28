import { Test, TestingModule } from '@nestjs/testing';
import { VendorPayoutsService } from './vendor-payouts.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VendorPayoutsService', () => {
  let service: VendorPayoutsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    vendorPayout: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('sk_test_dummy_key'),
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
    commissionRate: 15,
    paypalEmail: 'vendor@paypal.com',
    stripeAccountId: null,
    bankName: 'Test Bank',
  };

  const mockPayout = {
    id: 'payout-123',
    vendorProfileId: 'vendor-123',
    amount: 500,
    currency: 'USD',
    status: 'PENDING',
    method: 'PAYPAL',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    totalSales: 600,
    totalCommission: 100,
    platformFees: 0,
    adjustments: 0,
    netAmount: 500,
    orderIds: ['order-1', 'order-2'],
    reference: 'PAY-ABC123',
    transactionId: null,
    processedAt: null,
    processedBy: null,
    createdAt: new Date(),
    vendorProfile: { businessName: 'Test Business' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPayoutsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VendorPayoutsService>(VendorPayoutsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateVendorPayout', () => {
    const periodStart = new Date('2024-01-01');
    const periodEnd = new Date('2024-01-31');

    it('should calculate payout for vendor', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          items: [
            { price: 100, quantity: 2, product: { vendorId: 'user-123' } },
          ],
          refunds: [],
        },
      ]);

      const result = await service.calculateVendorPayout('vendor-123', periodStart, periodEnd);

      expect(result).toEqual({
        vendorId: 'vendor-123',
        vendorName: 'Test Business',
        periodStart,
        periodEnd,
        orderCount: 1,
        grossAmount: 200,
        commissionAmount: 30, // 15% of 200
        refundAmount: 0,
        netAmount: 170,
        orderIds: ['order-1'],
      });
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateVendorPayout('nonexistent', periodStart, periodEnd),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle refunds in payout calculation', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          items: [
            { price: 100, quantity: 1, product: { vendorId: 'user-123' } },
          ],
          refunds: [{ status: 'COMPLETED', subtotal: 50 }],
        },
      ]);

      const result = await service.calculateVendorPayout('vendor-123', periodStart, periodEnd);

      expect(result.refundAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(result.grossAmount);
    });

    it('should return zero values when no orders', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.calculateVendorPayout('vendor-123', periodStart, periodEnd);

      expect(result.orderCount).toBe(0);
      expect(result.grossAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe('createPayout', () => {
    const periodStart = new Date('2024-01-01');
    const periodEnd = new Date('2024-01-31');

    it('should create a payout successfully', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorPayout.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          items: [{ price: 100, quantity: 1, product: { vendorId: 'user-123' } }],
          refunds: [],
        },
      ]);
      mockPrismaService.vendorPayout.create.mockResolvedValue(mockPayout);

      const result = await service.createPayout('vendor-123', periodStart, periodEnd, 'admin-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('vendorName');
      expect(mockPrismaService.vendorPayout.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayout('nonexistent', periodStart, periodEnd),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payout already exists for period', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorPayout.findFirst.mockResolvedValue(mockPayout);

      await expect(
        service.createPayout('vendor-123', periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if net amount is zero or negative', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorPayout.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await expect(
        service.createPayout('vendor-123', periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use PayPal method when paypalEmail is set', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue({
        ...mockVendorProfile,
        stripeAccountId: null,
        paypalEmail: 'vendor@paypal.com',
      });
      mockPrismaService.vendorPayout.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          items: [{ price: 100, quantity: 1, product: { vendorId: 'user-123' } }],
          refunds: [],
        },
      ]);
      mockPrismaService.vendorPayout.create.mockResolvedValue({
        ...mockPayout,
        method: 'PAYPAL',
      });

      await service.createPayout('vendor-123', periodStart, periodEnd);

      expect(mockPrismaService.vendorPayout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: 'PAYPAL',
          }),
        }),
      );
    });
  });

  describe('processPayout', () => {
    it('should process a pending payout', async () => {
      mockPrismaService.vendorPayout.findUnique.mockResolvedValue({
        ...mockPayout,
        vendorProfile: mockVendorProfile,
      });
      mockPrismaService.vendorPayout.update.mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
        transactionId: 'TXN-123',
        processedAt: new Date(),
      });
      mockPrismaService.vendorProfile.update.mockResolvedValue(mockVendorProfile);

      const result = await service.processPayout('payout-123', 'admin-123');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrismaService.vendorProfile.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payout not found', async () => {
      mockPrismaService.vendorPayout.findUnique.mockResolvedValue(null);

      await expect(service.processPayout('nonexistent', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payout is not pending', async () => {
      mockPrismaService.vendorPayout.findUnique.mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });

      await expect(service.processPayout('payout-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVendorPayouts', () => {
    it('should return paginated payouts for vendor', async () => {
      mockPrismaService.vendorPayout.findMany.mockResolvedValue([mockPayout]);
      mockPrismaService.vendorPayout.count.mockResolvedValue(1);

      const result = await service.getVendorPayouts('vendor-123', 1, 10);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.vendorPayout.findMany.mockResolvedValue([]);
      mockPrismaService.vendorPayout.count.mockResolvedValue(0);

      await service.getVendorPayouts('vendor-123', 1, 10, 'COMPLETED');

      expect(mockPrismaService.vendorPayout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorProfileId: 'vendor-123', status: 'COMPLETED' },
        }),
      );
    });
  });

  describe('getAllPayouts', () => {
    it('should return all payouts with pagination', async () => {
      mockPrismaService.vendorPayout.findMany.mockResolvedValue([mockPayout]);
      mockPrismaService.vendorPayout.count.mockResolvedValue(1);

      const result = await service.getAllPayouts(1, 10);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status and vendor', async () => {
      mockPrismaService.vendorPayout.findMany.mockResolvedValue([]);
      mockPrismaService.vendorPayout.count.mockResolvedValue(0);

      await service.getAllPayouts(1, 10, 'PENDING', 'vendor-123');

      expect(mockPrismaService.vendorPayout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING', vendorProfileId: 'vendor-123' },
        }),
      );
    });
  });

  describe('getPayoutDetails', () => {
    it('should return payout details', async () => {
      mockPrismaService.vendorPayout.findUnique.mockResolvedValue(mockPayout);

      const result = await service.getPayoutDetails('payout-123');

      expect(result).toHaveProperty('id', 'payout-123');
      expect(result).toHaveProperty('vendorName');
      expect(result).toHaveProperty('amount');
    });

    it('should throw NotFoundException if payout not found', async () => {
      mockPrismaService.vendorPayout.findUnique.mockResolvedValue(null);

      await expect(service.getPayoutDetails('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPayoutStats', () => {
    it('should return payout statistics', async () => {
      mockPrismaService.vendorPayout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: 5 }) // pending
        .mockResolvedValueOnce({ _sum: { amount: 5000 }, _count: 20 }) // completed
        .mockResolvedValueOnce({ _sum: { amount: 200 }, _count: 2 }) // failed
        .mockResolvedValueOnce({ _sum: { netAmount: 4500 } }); // total paid

      const result = await service.getPayoutStats();

      expect(result).toEqual({
        pending: { count: 5, amount: 1000 },
        completed: { count: 20, amount: 5000 },
        failed: { count: 2, amount: 200 },
        totalPaid: 4500,
      });
    });

    it('should filter stats by vendor', async () => {
      mockPrismaService.vendorPayout.aggregate.mockResolvedValue({
        _sum: { amount: 0, netAmount: 0 },
        _count: 0,
      });

      await service.getPayoutStats('vendor-123');

      expect(mockPrismaService.vendorPayout.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vendorProfileId: 'vendor-123',
          }),
        }),
      );
    });
  });

  describe('calculatePendingPayouts', () => {
    const periodStart = new Date('2024-01-01');
    const periodEnd = new Date('2024-01-31');

    it('should calculate pending payouts for all eligible vendors', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue([mockVendorProfile]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          items: [{ price: 100, quantity: 1, product: { vendorId: 'user-123' } }],
          refunds: [],
        },
      ]);

      const result = await service.calculatePendingPayouts(periodStart, periodEnd);

      expect(result).toBeInstanceOf(Array);
      expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith({
        where: { isVerified: true, canSell: true },
        select: {
          id: true,
          businessName: true,
          commissionRate: true,
          userId: true,
        },
      });
    });

    it('should exclude vendors with zero or negative net amount', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue([mockVendorProfile]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.calculatePendingPayouts(periodStart, periodEnd);

      expect(result).toHaveLength(0);
    });
  });
});
