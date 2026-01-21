import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CouponType } from './dto/create-coupon.dto';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    coupon: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    couponUsage: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
    automaticDiscount: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCoupon', () => {
    const validCouponDto = {
      code: 'SAVE10',
      name: 'Save 10%',
      description: 'Get 10% off',
      type: CouponType.PERCENTAGE,
      value: 10,
      startDate: '2024-01-01',
      endDate: null,
      isActive: true,
      totalUsageLimit: 100,
      usageLimitPerUser: 1,
      minOrderValue: 50,
      maxDiscountAmount: null,
      firstTimeOnly: false,
      applicableProductIds: [],
      applicableCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
      userGroupIds: [],
    };

    it('should create a new coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.coupon.create.mockResolvedValue({
        id: 'coupon-123',
        ...validCouponDto,
        code: 'SAVE10',
      });

      const result = await service.createCoupon(validCouponDto);

      expect(result).toHaveProperty('id');
      expect(result.code).toBe('SAVE10');
      expect(mockPrismaService.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'SAVE10',
          type: CouponType.PERCENTAGE,
          value: 10,
        }),
      });
    });

    it('should convert code to uppercase', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.coupon.create.mockResolvedValue({
        id: 'coupon-123',
        ...validCouponDto,
        code: 'SAVE10',
      });

      await service.createCoupon({ ...validCouponDto, code: 'save10' });

      expect(mockPrismaService.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'SAVE10',
          }),
        })
      );
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'existing-123',
        code: 'SAVE10',
      });

      await expect(service.createCoupon(validCouponDto)).rejects.toThrow(ConflictException);
      await expect(service.createCoupon(validCouponDto)).rejects.toThrow(
        'Coupon code already exists'
      );
    });

    it('should throw BadRequestException if percentage exceeds 100', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const invalidCoupon = {
        ...validCouponDto,
        value: 150,
      };

      await expect(service.createCoupon(invalidCoupon)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const invalidCoupon = {
        ...validCouponDto,
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };

      await expect(service.createCoupon(invalidCoupon)).rejects.toThrow(BadRequestException);
    });

    it('should validate BUY_X_GET_Y type requires quantities', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const buyXgetYCoupon = {
        ...validCouponDto,
        type: CouponType.BUY_X_GET_Y,
      };

      await expect(service.createCoupon(buyXgetYCoupon)).rejects.toThrow(BadRequestException);
    });

    it('should validate TIERED type requires tiered rules', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const tieredCoupon = {
        ...validCouponDto,
        type: CouponType.TIERED,
      };

      await expect(service.createCoupon(tieredCoupon)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCoupons', () => {
    const mockCoupons = [
      {
        id: 'coupon-1',
        code: 'SAVE10',
        type: CouponType.PERCENTAGE,
        value: 10,
        isActive: true,
        _count: { usages: 5 },
      },
      {
        id: 'coupon-2',
        code: 'FIXED20',
        type: CouponType.FIXED_AMOUNT,
        value: 20,
        isActive: true,
        _count: { usages: 10 },
      },
    ];

    it('should return paginated coupons', async () => {
      mockPrismaService.coupon.findMany.mockResolvedValue(mockCoupons);
      mockPrismaService.coupon.count.mockResolvedValue(2);

      const result = await service.getCoupons({ page: 1, limit: 20 });

      expect(result.coupons).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by type', async () => {
      mockPrismaService.coupon.findMany.mockResolvedValue([mockCoupons[0]]);
      mockPrismaService.coupon.count.mockResolvedValue(1);

      await service.getCoupons({ type: CouponType.PERCENTAGE });

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CouponType.PERCENTAGE,
          }),
        })
      );
    });

    it('should filter by active status', async () => {
      mockPrismaService.coupon.findMany.mockResolvedValue(mockCoupons);
      mockPrismaService.coupon.count.mockResolvedValue(2);

      await service.getCoupons({ isActive: true });

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should search by code, name, or description', async () => {
      mockPrismaService.coupon.findMany.mockResolvedValue([mockCoupons[0]]);
      mockPrismaService.coupon.count.mockResolvedValue(1);

      await service.getCoupons({ search: 'SAVE' });

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { code: { contains: 'SAVE', mode: 'insensitive' } },
              { name: { contains: 'SAVE', mode: 'insensitive' } },
              { description: { contains: 'SAVE', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('getCoupon', () => {
    const mockCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
      usages: [],
      _count: { usages: 5 },
    };

    it('should return coupon by ID', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.getCoupon('coupon-123');

      expect(result).toEqual(mockCoupon);
      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if coupon not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.getCoupon('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCouponByCode', () => {
    const mockCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
    };

    it('should return coupon by code', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.getCouponByCode('save10');

      expect(result).toEqual(mockCoupon);
      expect(mockPrismaService.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'SAVE10' },
      });
    });

    it('should throw NotFoundException if coupon not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.getCouponByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCoupon', () => {
    const existingCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
      usages: [],
      _count: { usages: 0 },
    };

    it('should update coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(existingCoupon);
      mockPrismaService.coupon.update.mockResolvedValue({
        ...existingCoupon,
        name: 'Updated Name',
      });

      const result = await service.updateCoupon('coupon-123', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.coupon.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if new code already exists', async () => {
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce(existingCoupon)
        .mockResolvedValueOnce({ id: 'other-123', code: 'NEWCODE' });
      mockPrismaService.coupon.findFirst.mockResolvedValue({
        id: 'other-123',
        code: 'NEWCODE',
      });

      await expect(
        service.updateCoupon('coupon-123', { code: 'NEWCODE' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCoupon', () => {
    const mockCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
      usages: [],
      _count: { usages: 0 },
    };

    it('should delete coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaService.coupon.delete.mockResolvedValue(mockCoupon);

      const result = await service.deleteCoupon('coupon-123');

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.coupon.delete).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
      });
    });

    it('should throw NotFoundException if coupon not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.deleteCoupon('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateCoupon', () => {
    const validCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
      type: CouponType.PERCENTAGE,
      value: 10,
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: null,
      totalUsageLimit: 100,
      timesUsed: 5,
      usageLimitPerUser: 3,
      firstTimeOnly: false,
      minOrderValue: 0,
      maxDiscountAmount: null,
      applicableProductIds: [],
      excludedProductIds: [],
    };

    it('should validate a valid coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(validCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10);
    });

    it('should reject non-existent coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const result = await service.validateCoupon({
        code: 'INVALID',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid coupon code');
    });

    it('should reject inactive coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        isActive: false,
      });

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('This coupon is no longer active');
    });

    it('should reject expired coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        endDate: new Date('2020-01-01'),
      });

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('This coupon has expired');
    });

    it('should reject coupon that has not started yet', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        startDate: new Date('2099-01-01'),
      });

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('This coupon is not yet valid');
    });

    it('should reject if total usage limit reached', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        totalUsageLimit: 10,
        timesUsed: 10,
      });

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('This coupon has reached its usage limit');
    });

    it('should reject if user usage limit reached', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(validCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(3);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('already used this coupon');
    });

    it('should reject if below minimum order value', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        minOrderValue: 100,
      });
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 50,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Minimum order value');
    });

    it('should reject for non-first-time customers if first-time only', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        firstTimeOnly: true,
      });
      mockPrismaService.couponUsage.count.mockResolvedValue(0);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('first-time customers');
    });

    it('should calculate percentage discount correctly', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(validCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.discountAmount).toBe(10); // 10% of 100
    });

    it('should calculate fixed amount discount correctly', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        type: CouponType.FIXED_AMOUNT,
        value: 15,
      });
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.discountAmount).toBe(15);
    });

    it('should apply maximum discount cap', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        value: 50, // 50% discount
        maxDiscountAmount: 20,
      });
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.discountAmount).toBe(20); // Capped at maxDiscountAmount
    });

    it('should not allow discount to exceed subtotal', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        type: CouponType.FIXED_AMOUNT,
        value: 150,
      });
      mockPrismaService.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
      });

      expect(result.discountAmount).toBe(100); // Limited to subtotal
    });
  });

  describe('applyCoupon', () => {
    const validCoupon = {
      id: 'coupon-123',
      code: 'SAVE10',
      type: CouponType.PERCENTAGE,
      value: 10,
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: null,
      totalUsageLimit: 100,
      timesUsed: 5,
      usageLimitPerUser: 3,
      firstTimeOnly: false,
      minOrderValue: 0,
      maxDiscountAmount: null,
      applicableProductIds: [],
      excludedProductIds: [],
    };

    it('should apply valid coupon', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(validCoupon);
      mockPrismaService.couponUsage.count.mockResolvedValue(0);
      mockPrismaService.couponUsage.create.mockResolvedValue({
        id: 'usage-123',
        couponId: 'coupon-123',
        userId: 'user-123',
        discountAmount: 10,
      });
      mockPrismaService.coupon.update.mockResolvedValue(validCoupon);

      const result = await service.applyCoupon({
        code: 'SAVE10',
        userId: 'user-123',
        subtotal: 100,
        orderId: 'order-123',
      });

      expect(result).toHaveProperty('usage');
      expect(result.discount).toBe(10);
      expect(mockPrismaService.couponUsage.create).toHaveBeenCalled();
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { timesUsed: { increment: 1 } },
      });
    });

    it('should throw BadRequestException if coupon is invalid', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        ...validCoupon,
        isActive: false,
      });

      await expect(
        service.applyCoupon({
          code: 'SAVE10',
          userId: 'user-123',
          subtotal: 100,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkGenerateCoupons', () => {
    it('should generate multiple unique coupons', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.coupon.create.mockImplementation((data) => {
        return Promise.resolve({
          id: 'coupon-' + Math.random(),
          ...data.data,
        });
      });

      const result = await service.bulkGenerateCoupons({
        quantity: 5,
        codePrefix: 'TEST',
        codeLength: 8,
        name: 'Test Coupon',
        description: 'Test',
        type: CouponType.PERCENTAGE,
        value: 10,
        startDate: '2024-01-01',
        isActive: true,
      });

      expect(result.generated).toBe(5);
      expect(result.coupons).toHaveLength(5);
      expect(mockPrismaService.coupon.create).toHaveBeenCalledTimes(5);
    });

    it('should handle duplicate codes by retrying', async () => {
      let callCount = 0;
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // First call finds duplicate
        .mockResolvedValueOnce(null); // Second call succeeds

      mockPrismaService.coupon.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new ConflictException();
        }
        return Promise.resolve({ id: 'coupon-new', code: 'TEST123' });
      });

      const result = await service.bulkGenerateCoupons({
        quantity: 1,
        codePrefix: 'TEST',
        codeLength: 8,
        name: 'Test Coupon',
        description: 'Test',
        type: CouponType.PERCENTAGE,
        value: 10,
        startDate: '2024-01-01',
        isActive: true,
      });

      expect(result.generated).toBe(1);
    });
  });

  describe('getCouponAnalytics', () => {
    it('should return coupon analytics', async () => {
      mockPrismaService.couponUsage.count.mockResolvedValue(50);
      mockPrismaService.couponUsage.aggregate.mockResolvedValue({
        _sum: { discountAmount: 500 },
      });
      mockPrismaService.couponUsage.groupBy.mockResolvedValue([
        {
          couponId: 'coupon-1',
          _count: 20,
          _sum: { discountAmount: 200 },
        },
        {
          couponId: 'coupon-2',
          _count: 15,
          _sum: { discountAmount: 150 },
        },
      ]);
      mockPrismaService.coupon.findMany.mockResolvedValue([
        { id: 'coupon-1', code: 'SAVE10', name: 'Save 10%', type: CouponType.PERCENTAGE },
        { id: 'coupon-2', code: 'FIXED20', name: 'Fixed $20', type: CouponType.FIXED_AMOUNT },
      ]);

      const result = await service.getCouponAnalytics();

      expect(result.totalUsages).toBe(50);
      expect(result.totalDiscountAmount).toBe(500);
      expect(result.topCoupons).toHaveLength(2);
      expect(result.topCoupons[0].usageCount).toBe(20);
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.couponUsage.count.mockResolvedValue(10);
      mockPrismaService.couponUsage.aggregate.mockResolvedValue({
        _sum: { discountAmount: 100 },
      });
      mockPrismaService.couponUsage.groupBy.mockResolvedValue([]);
      mockPrismaService.coupon.findMany.mockResolvedValue([]);

      await service.getCouponAnalytics(startDate, endDate);

      expect(mockPrismaService.couponUsage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('createAutomaticDiscount', () => {
    const discountDto = {
      name: 'Auto Discount',
      description: 'Automatic 10% off',
      type: 'PERCENTAGE' as any,
      value: 10,
      startDate: '2024-01-01',
      endDate: null,
      isActive: true,
      priority: 1,
      rules: { type: 'min_cart_value', value: 100 },
      applicableProductIds: [],
      applicableCategoryIds: [],
      excludedProductIds: [],
      excludedCategoryIds: [],
    };

    it('should create automatic discount', async () => {
      mockPrismaService.automaticDiscount.create.mockResolvedValue({
        id: 'discount-123',
        ...discountDto,
      });

      const result = await service.createAutomaticDiscount(discountDto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.automaticDiscount.create).toHaveBeenCalled();
    });
  });

  describe('getApplicableAutomaticDiscounts', () => {
    it('should return applicable automatic discounts', async () => {
      const mockDiscounts = [
        {
          id: 'discount-1',
          name: 'Auto 10%',
          type: 'PERCENTAGE',
          value: 10,
          priority: 1,
          rules: { type: 'min_cart_value', operator: 'gte', value: 50 },
        },
        {
          id: 'discount-2',
          name: 'Auto $20',
          type: 'FIXED_AMOUNT',
          value: 20,
          priority: 2,
          rules: { type: 'min_cart_value', operator: 'gte', value: 100 },
        },
      ];

      mockPrismaService.automaticDiscount.findMany.mockResolvedValue(mockDiscounts);

      const result = await service.getApplicableAutomaticDiscounts({
        subtotal: 75,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
