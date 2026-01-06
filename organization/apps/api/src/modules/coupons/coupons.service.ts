import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCouponDto, CouponType } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto, ApplyCouponDto, CouponValidationResult } from './dto/validate-coupon.dto';
import { CreateAutomaticDiscountDto, DiscountType } from './dto/create-automatic-discount.dto';
import { BulkGenerateCouponsDto } from './dto/bulk-generate-coupons.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new coupon
   */
  async createCoupon(dto: CreateCouponDto) {
    // Check if code already exists
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    // Validate coupon configuration
    this.validateCouponConfig(dto);

    const coupon = await this.prisma.coupon.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        tieredRules: dto.tieredRules ? JSON.parse(JSON.stringify(dto.tieredRules)) : null,
        applicableProductIds: dto.applicableProductIds || [],
        applicableCategoryIds: dto.applicableCategoryIds || [],
        excludedProductIds: dto.excludedProductIds || [],
        excludedCategoryIds: dto.excludedCategoryIds || [],
        userGroupIds: dto.userGroupIds || [],
      },
    });

    return coupon;
  }

  /**
   * Bulk generate coupons
   */
  async bulkGenerateCoupons(dto: BulkGenerateCouponsDto) {
    const { quantity, codePrefix, codeLength = 8, ...couponData } = dto;
    const coupons = [];

    for (let i = 0; i < quantity; i++) {
      const code = `${codePrefix}${this.generateRandomCode(codeLength)}`;

      try {
        const coupon = await this.createCoupon({
          ...couponData,
          code,
          name: `${couponData.name} ${i + 1}`,
        });
        coupons.push(coupon);
      } catch (error) {
        // Skip duplicates and continue
        if (error instanceof ConflictException) {
          i--; // Retry this iteration
        }
      }
    }

    return {
      generated: coupons.length,
      coupons,
    };
  }

  /**
   * Get all coupons with pagination and filtering
   */
  async getCoupons(params: {
    page?: number;
    limit?: number;
    type?: CouponType;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, type, isActive, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get coupon by ID
   */
  async getCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          take: 10,
          orderBy: { usedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  /**
   * Update coupon
   */
  async updateCoupon(id: string, dto: UpdateCouponDto) {
    await this.getCoupon(id); // Check exists

    if (dto.code) {
      const existing = await this.prisma.coupon.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        tieredRules: dto.tieredRules ? JSON.parse(JSON.stringify(dto.tieredRules)) : undefined,
      },
    });

    return coupon;
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(id: string) {
    await this.getCoupon(id); // Check exists

    await this.prisma.coupon.delete({
      where: { id },
    });

    return { message: 'Coupon deleted successfully' };
  }

  /**
   * Validate coupon
   */
  async validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    // Check if coupon exists
    if (!coupon) {
      return {
        valid: false,
        message: 'Invalid coupon code',
      };
    }

    // Check if active
    if (!coupon.isActive) {
      return {
        valid: false,
        message: 'This coupon is no longer active',
      };
    }

    // Check date validity
    const now = new Date();
    if (now < coupon.startDate) {
      return {
        valid: false,
        message: 'This coupon is not yet valid',
      };
    }

    if (coupon.endDate && now > coupon.endDate) {
      return {
        valid: false,
        message: 'This coupon has expired',
      };
    }

    // Check total usage limit
    if (coupon.totalUsageLimit && coupon.timesUsed >= coupon.totalUsageLimit) {
      return {
        valid: false,
        message: 'This coupon has reached its usage limit',
      };
    }

    // Check user usage limit
    if (coupon.usageLimitPerUser) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: dto.userId,
        },
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        return {
          valid: false,
          message: 'You have already used this coupon the maximum number of times',
        };
      }
    }

    // Check first-time customer requirement
    if (coupon.firstTimeOnly) {
      const orderCount = await this.prisma.order.count({
        where: { userId: dto.userId },
      });

      if (orderCount > 0) {
        return {
          valid: false,
          message: 'This coupon is only valid for first-time customers',
        };
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue && dto.subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        message: `Minimum order value of $${coupon.minOrderValue} required`,
      };
    }

    // Check product/category restrictions
    if (dto.productIds && dto.productIds.length > 0) {
      // If applicable products specified, check if any cart items match
      if (coupon.applicableProductIds.length > 0) {
        const hasApplicableProduct = dto.productIds.some((id) =>
          coupon.applicableProductIds.includes(id),
        );

        if (!hasApplicableProduct) {
          return {
            valid: false,
            message: 'This coupon is not applicable to the products in your cart',
          };
        }
      }

      // Check excluded products
      const hasExcludedProduct = dto.productIds.some((id) =>
        coupon.excludedProductIds.includes(id),
      );

      if (hasExcludedProduct) {
        return {
          valid: false,
          message: 'This coupon cannot be applied to some products in your cart',
        };
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, dto.subtotal, dto.productIds);

    return {
      valid: true,
      message: 'Coupon is valid',
      discountAmount,
      discountPercentage: coupon.type === CouponType.PERCENTAGE ? coupon.value : undefined,
      coupon,
      newSubtotal: dto.subtotal - discountAmount,
    };
  }

  /**
   * Apply coupon to user
   */
  async applyCoupon(dto: ApplyCouponDto) {
    const validation = await this.validateCoupon(dto);

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const usage = await this.prisma.couponUsage.create({
      data: {
        couponId: validation.coupon!.id,
        userId: dto.userId,
        orderId: dto.orderId || null,
        discountAmount: validation.discountAmount!,
      },
    });

    // Update coupon times used
    await this.prisma.coupon.update({
      where: { id: validation.coupon!.id },
      data: { timesUsed: { increment: 1 } },
    });

    return {
      usage,
      discount: validation.discountAmount,
      newSubtotal: validation.newSubtotal,
    };
  }

  /**
   * Get applicable automatic discounts
   */
  async getApplicableAutomaticDiscounts(params: {
    subtotal: number;
    productIds?: string[];
    categoryIds?: string[];
  }) {
    const now = new Date();

    const discounts = await this.prisma.automaticDiscount.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { priority: 'desc' },
    });

    const applicable = discounts.filter((discount) => {
      return this.checkAutomaticDiscountRules(discount, params);
    });

    return applicable;
  }

  /**
   * Create automatic discount
   */
  async createAutomaticDiscount(dto: CreateAutomaticDiscountDto) {
    const discount = await this.prisma.automaticDiscount.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        rules: JSON.parse(JSON.stringify(dto.rules)),
        applicableProductIds: dto.applicableProductIds || [],
        applicableCategoryIds: dto.applicableCategoryIds || [],
        excludedProductIds: dto.excludedProductIds || [],
        excludedCategoryIds: dto.excludedCategoryIds || [],
      },
    });

    return discount;
  }

  /**
   * Get coupon analytics
   */
  async getCouponAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.usedAt = {};
      if (startDate) where.usedAt.gte = startDate;
      if (endDate) where.usedAt.lte = endDate;
    }

    const [totalUsages, totalDiscountAmount, topCoupons] = await Promise.all([
      this.prisma.couponUsage.count({ where }),
      this.prisma.couponUsage.aggregate({
        where,
        _sum: { discountAmount: true },
      }),
      this.prisma.couponUsage.groupBy({
        by: ['couponId'],
        where,
        _count: true,
        _sum: { discountAmount: true },
        orderBy: { _count: { couponId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get coupon details for top coupons
    const couponDetails = await this.prisma.coupon.findMany({
      where: {
        id: { in: topCoupons.map((c) => c.couponId) },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    const topCouponsWithDetails = topCoupons.map((tc) => {
      const coupon = couponDetails.find((c) => c.id === tc.couponId);
      return {
        ...coupon,
        usageCount: tc._count,
        totalDiscount: tc._sum.discountAmount,
      };
    });

    return {
      totalUsages,
      totalDiscountAmount: totalDiscountAmount._sum.discountAmount || 0,
      topCoupons: topCouponsWithDetails,
    };
  }

  // ==================== Private Helper Methods ====================

  private validateCouponConfig(dto: CreateCouponDto) {
    // Validate BUY_X_GET_Y type
    if (dto.type === CouponType.BUY_X_GET_Y) {
      if (!dto.buyQuantity || !dto.getQuantity) {
        throw new BadRequestException('BUY_X_GET_Y coupons require buyQuantity and getQuantity');
      }
    }

    // Validate TIERED type
    if (dto.type === CouponType.TIERED) {
      if (!dto.tieredRules || dto.tieredRules.length === 0) {
        throw new BadRequestException('TIERED coupons require tieredRules');
      }
    }

    // Validate percentage value
    if (dto.type === CouponType.PERCENTAGE && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // Validate dates
    if (dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  private calculateDiscount(coupon: any, subtotal: number, productIds?: string[]): number {
    let discount = 0;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discount = (subtotal * coupon.value) / 100;
        break;

      case CouponType.FIXED_AMOUNT:
        discount = coupon.value;
        break;

      case CouponType.FREE_SHIPPING:
        discount = 0; // Handled separately in order calculation
        break;

      case CouponType.TIERED: {
        const tieredRules = coupon.tieredRules as Array<{ minAmount: number; discount: number }>;
        const applicableRule = tieredRules
          .filter((rule) => subtotal >= rule.minAmount)
          .sort((a, b) => b.minAmount - a.minAmount)[0];

        if (applicableRule) {
          discount = (subtotal * applicableRule.discount) / 100;
        }
        break;
      }

      case CouponType.BUY_X_GET_Y:
        // Simplified calculation - would need product prices for accurate calculation
        discount = 0;
        break;
    }

    // Apply maximum discount cap
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    // Ensure discount doesn't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return Math.round(discount * 100) / 100; // Round to 2 decimal places
  }

  private checkAutomaticDiscountRules(discount: any, params: any): boolean {
    const rules = discount.rules as any;

    // Check cart value rule
    if (rules.type === 'min_cart_value') {
      if (rules.operator === 'gte') {
        return params.subtotal >= rules.value;
      }
    }

    // Add more rule types as needed

    return true;
  }

  private generateRandomCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
