import { Test, TestingModule } from '@nestjs/testing';
import { VendorCommissionsService } from './vendor-commissions.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('VendorCommissionsService', () => {
  let service: VendorCommissionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorProfile: {
      findUnique: jest.fn(),
    },
    vendorCommissionRule: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
    commissionRate: 15.0,
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Electronics',
  };

  const mockCommissionRule = {
    id: 'rule-123',
    vendorProfileId: 'vendor-123',
    name: 'Electronics Commission',
    commissionRate: 12.5,
    categoryId: 'category-123',
    minOrderValue: 50,
    maxOrderValue: 1000,
    minCommission: 5,
    maxCommission: 100,
    priority: 1,
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2024-12-31'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorCommissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorCommissionsService>(VendorCommissionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCommissionRule', () => {
    const createDto = {
      name: 'New Commission Rule',
      commissionRate: 10,
      categoryId: 'category-123',
      minOrderValue: 100,
      maxOrderValue: 500,
      priority: 1,
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      isActive: true,
    };

    it('should create a commission rule successfully', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.vendorCommissionRule.create.mockResolvedValue({
        ...mockCommissionRule,
        ...createDto,
      });

      const result = await service.createCommissionRule('vendor-123', createDto);

      expect(mockPrismaService.vendorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendor-123' },
      });
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-123' },
      });
      expect(mockPrismaService.vendorCommissionRule.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.createCommissionRule('nonexistent', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if category not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.createCommissionRule('vendor-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const invalidDto = {
        ...createDto,
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };

      await expect(service.createCommissionRule('vendor-123', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create rule without category', async () => {
      const dtoWithoutCategory = {
        name: 'General Commission',
        commissionRate: 15,
        priority: 0,
        isActive: true,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorCommissionRule.create.mockResolvedValue({
        ...mockCommissionRule,
        categoryId: null,
      });

      await service.createCommissionRule('vendor-123', dtoWithoutCategory);

      expect(mockPrismaService.category.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('updateCommissionRule', () => {
    const updateDto = {
      name: 'Updated Rule Name',
      commissionRate: 18,
      isActive: false,
    };

    it('should update commission rule successfully', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(mockCommissionRule);
      mockPrismaService.vendorCommissionRule.update.mockResolvedValue({
        ...mockCommissionRule,
        ...updateDto,
      });

      const result = await service.updateCommissionRule('vendor-123', 'rule-123', updateDto);

      expect(result.name).toBe('Updated Rule Name');
      expect(mockPrismaService.vendorCommissionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: expect.objectContaining({
          name: 'Updated Rule Name',
          commissionRate: 18,
          isActive: false,
        }),
      });
    });

    it('should throw NotFoundException if rule not found', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(null);

      await expect(service.updateCommissionRule('vendor-123', 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if rule belongs to different vendor', async () => {
      const otherVendorRule = {
        ...mockCommissionRule,
        vendorProfileId: 'other-vendor',
      };

      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(otherVendorRule);

      await expect(service.updateCommissionRule('vendor-123', 'rule-123', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate category if provided', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(mockCommissionRule);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      const dtoWithCategory = {
        ...updateDto,
        categoryId: 'invalid-category',
      };

      await expect(service.updateCommissionRule('vendor-123', 'rule-123', dtoWithCategory)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCommissionRules', () => {
    it('should return active commission rules', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.getCommissionRules('vendor-123', false);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.vendorCommissionRule.findMany).toHaveBeenCalledWith({
        where: { vendorProfileId: 'vendor-123', isActive: true },
        orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
      });
    });

    it('should include inactive rules when requested', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      await service.getCommissionRules('vendor-123', true);

      expect(mockPrismaService.vendorCommissionRule.findMany).toHaveBeenCalledWith({
        where: { vendorProfileId: 'vendor-123' },
        orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
      });
    });
  });

  describe('getCommissionRule', () => {
    it('should return a specific commission rule', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(mockCommissionRule);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.getCommissionRule('vendor-123', 'rule-123');

      expect(result.id).toBe('rule-123');
      expect(result.category).toEqual(mockCategory);
    });

    it('should throw NotFoundException if rule not found', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(null);

      await expect(service.getCommissionRule('vendor-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if rule belongs to different vendor', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue({
        ...mockCommissionRule,
        vendorProfileId: 'other-vendor',
      });

      await expect(service.getCommissionRule('vendor-123', 'rule-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteCommissionRule', () => {
    it('should delete commission rule successfully', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(mockCommissionRule);
      mockPrismaService.vendorCommissionRule.delete.mockResolvedValue(mockCommissionRule);

      const result = await service.deleteCommissionRule('vendor-123', 'rule-123');

      expect(result).toEqual({ success: true, message: 'Commission rule deleted successfully' });
      expect(mockPrismaService.vendorCommissionRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
      });
    });

    it('should throw NotFoundException if rule not found', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue(null);

      await expect(service.deleteCommissionRule('vendor-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if rule belongs to different vendor', async () => {
      mockPrismaService.vendorCommissionRule.findUnique.mockResolvedValue({
        ...mockCommissionRule,
        vendorProfileId: 'other-vendor',
      });

      await expect(service.deleteCommissionRule('vendor-123', 'rule-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('calculateCommissionForOrder', () => {
    it('should calculate commission using matching rule', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);

      const result = await service.calculateCommissionForOrder('vendor-123', 100, 'category-123');

      expect(result.commissionRate).toBe(12.5);
      expect(result.commissionAmount).toBe(12.5); // 100 * 12.5%
      expect(result.ruleId).toBe('rule-123');
    });

    it('should apply minimum commission constraint', async () => {
      const ruleWithHighMinimum = {
        ...mockCommissionRule,
        minCommission: 20,
      };

      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([ruleWithHighMinimum]);

      const result = await service.calculateCommissionForOrder('vendor-123', 100, 'category-123');

      expect(result.commissionAmount).toBe(20); // Min commission applied
    });

    it('should apply maximum commission constraint', async () => {
      const ruleWithLowMaximum = {
        ...mockCommissionRule,
        maxCommission: 5,
      };

      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([ruleWithLowMaximum]);

      const result = await service.calculateCommissionForOrder('vendor-123', 100, 'category-123');

      expect(result.commissionAmount).toBe(5); // Max commission applied
    });

    it('should use default rate when no matching rule found', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);

      const result = await service.calculateCommissionForOrder('vendor-123', 100);

      expect(result.ruleName).toBe('Default Rate');
      expect(result.commissionRate).toBe(15); // Vendor's default rate
      expect(result.ruleId).toBeNull();
    });

    it('should skip rules that do not match category', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);

      const result = await service.calculateCommissionForOrder('vendor-123', 100, 'different-category');

      expect(result.ruleName).toBe('Default Rate');
    });

    it('should skip rules when order value is out of range', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);

      // Order value below minimum
      const result = await service.calculateCommissionForOrder('vendor-123', 10, 'category-123');

      expect(result.ruleName).toBe('Default Rate');
    });
  });

  describe('getCommissionSummary', () => {
    const periodStart = new Date('2024-01-01');
    const periodEnd = new Date('2024-01-31');

    it('should return commission summary for period', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          items: [
            {
              price: 100,
              quantity: 2,
              product: { vendorId: 'vendor-123', categoryId: 'category-123' },
            },
          ],
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);

      const result = await service.getCommissionSummary('vendor-123', periodStart, periodEnd);

      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('totalOrderValue');
      expect(result).toHaveProperty('totalCommission');
      expect(result).toHaveProperty('netEarnings');
    });

    it('should return zero values when no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getCommissionSummary('vendor-123', periodStart, periodEnd);

      expect(result.totalOrders).toBe(0);
      expect(result.totalOrderValue).toBe(0);
      expect(result.totalCommission).toBe(0);
    });
  });

  describe('getAllCommissionRules (Admin)', () => {
    it('should return paginated commission rules', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([mockCommissionRule]);
      mockPrismaService.vendorCommissionRule.count.mockResolvedValue(1);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.getAllCommissionRules(1, 20);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by vendor id', async () => {
      mockPrismaService.vendorCommissionRule.findMany.mockResolvedValue([]);
      mockPrismaService.vendorCommissionRule.count.mockResolvedValue(0);

      await service.getAllCommissionRules(1, 20, 'vendor-123');

      expect(mockPrismaService.vendorCommissionRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorProfileId: 'vendor-123' },
        }),
      );
    });
  });

  describe('getCommissionStats', () => {
    it('should return commission statistics', async () => {
      mockPrismaService.vendorCommissionRule.count
        .mockResolvedValueOnce(10) // total rules
        .mockResolvedValueOnce(8); // active rules

      mockPrismaService.vendorCommissionRule.aggregate.mockResolvedValue({
        _avg: { commissionRate: 12.5 },
      });

      const result = await service.getCommissionStats();

      expect(result).toEqual({
        totalRules: 10,
        activeRules: 8,
        inactiveRules: 2,
        averageCommissionRate: 12.5,
      });
    });

    it('should filter stats by vendor id', async () => {
      mockPrismaService.vendorCommissionRule.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);

      mockPrismaService.vendorCommissionRule.aggregate.mockResolvedValue({
        _avg: { commissionRate: 15 },
      });

      await service.getCommissionStats('vendor-123');

      expect(mockPrismaService.vendorCommissionRule.count).toHaveBeenCalledWith({
        vendorProfileId: 'vendor-123',
      });
    });
  });
});
