import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { VendorCouponApprovalStatus, CouponType } from '@prisma/client';

export interface CreateVendorCouponDto {
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  startDate: string;
  endDate?: string;
  applicableProductIds?: string[];
}

export interface UpdateVendorCouponDto extends Partial<CreateVendorCouponDto> {
  isActive?: boolean;
}

@Injectable()
export class VendorCouponsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a vendor coupon
   */
  async createVendorCoupon(vendorId: string, dto: CreateVendorCouponDto) {
    // Check if code already exists
    const existing = await this.prisma.vendorCoupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    // Verify products belong to vendor
    if (dto.applicableProductIds && dto.applicableProductIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: dto.applicableProductIds },
          vendorId,
        },
        select: { id: true },
      });

      if (products.length !== dto.applicableProductIds.length) {
        throw new BadRequestException('Some products do not belong to your store');
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

    const coupon = await this.prisma.vendorCoupon.create({
      data: {
        vendorId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minOrderValue: dto.minOrderValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        usageLimitPerUser: dto.usageLimitPerUser,
        totalUsageLimit: dto.totalUsageLimit,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        applicableProductIds: dto.applicableProductIds || [],
        requiresApproval: false, // Can be made configurable
        approvalStatus: VendorCouponApprovalStatus.APPROVED, // Auto-approve by default
      },
    });

    return coupon;
  }

  /**
   * Get vendor's coupons
   */
  async getVendorCoupons(vendorId: string, params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, isActive, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      this.prisma.vendorCoupon.findMany({
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
      this.prisma.vendorCoupon.count({ where }),
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
   * Get vendor coupon by ID
   */
  async getVendorCoupon(vendorId: string, couponId: string) {
    const coupon = await this.prisma.vendorCoupon.findFirst({
      where: { id: couponId, vendorId },
      include: {
        usages: {
          take: 10,
          orderBy: { usedAt: 'desc' },
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
   * Update vendor coupon
   */
  async updateVendorCoupon(vendorId: string, couponId: string, dto: UpdateVendorCouponDto) {
    await this.getVendorCoupon(vendorId, couponId);

    if (dto.code) {
      const existing = await this.prisma.vendorCoupon.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          NOT: { id: couponId },
        },
      });

      if (existing) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    // Verify products belong to vendor if updating
    if (dto.applicableProductIds && dto.applicableProductIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: dto.applicableProductIds },
          vendorId,
        },
        select: { id: true },
      });

      if (products.length !== dto.applicableProductIds.length) {
        throw new BadRequestException('Some products do not belong to your store');
      }
    }

    const coupon = await this.prisma.vendorCoupon.update({
      where: { id: couponId },
      data: {
        code: dto.code ? dto.code.toUpperCase() : undefined,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minOrderValue: dto.minOrderValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        usageLimitPerUser: dto.usageLimitPerUser,
        totalUsageLimit: dto.totalUsageLimit,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        applicableProductIds: dto.applicableProductIds,
        isActive: dto.isActive,
      },
    });

    return coupon;
  }

  /**
   * Delete vendor coupon
   */
  async deleteVendorCoupon(vendorId: string, couponId: string) {
    await this.getVendorCoupon(vendorId, couponId);

    await this.prisma.vendorCoupon.delete({
      where: { id: couponId },
    });

    return { message: 'Coupon deleted successfully' };
  }

  /**
   * Validate vendor coupon for a purchase
   */
  async validateVendorCoupon(code: string, params: {
    userId: string;
    productIds: string[];
    subtotal: number;
  }) {
    const coupon = await this.prisma.vendorCoupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    // Check approval status
    if (coupon.approvalStatus !== VendorCouponApprovalStatus.APPROVED) {
      return { valid: false, message: 'This coupon is not available' };
    }

    // Check if active
    if (!coupon.isActive) {
      return { valid: false, message: 'This coupon is no longer active' };
    }

    // Check date validity
    const now = new Date();
    if (now < coupon.startDate) {
      return { valid: false, message: 'This coupon is not yet valid' };
    }

    if (coupon.endDate && now > coupon.endDate) {
      return { valid: false, message: 'This coupon has expired' };
    }

    // Check total usage limit
    if (coupon.totalUsageLimit && coupon.timesUsed >= coupon.totalUsageLimit) {
      return { valid: false, message: 'This coupon has reached its usage limit' };
    }

    // Check user usage limit
    if (coupon.usageLimitPerUser) {
      const userUsageCount = await this.prisma.vendorCouponUsage.count({
        where: {
          vendorCouponId: coupon.id,
          userId: params.userId,
        },
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        return { valid: false, message: 'You have already used this coupon the maximum number of times' };
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue && params.subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        message: `Minimum order value of $${coupon.minOrderValue} required`,
      };
    }

    // Check product restrictions - coupon only applies to vendor's products
    if (coupon.applicableProductIds.length > 0) {
      const hasApplicableProduct = params.productIds.some((id) =>
        coupon.applicableProductIds.includes(id),
      );

      if (!hasApplicableProduct) {
        return {
          valid: false,
          message: 'This coupon is not applicable to the products in your cart',
        };
      }
    } else {
      // Check if any products in cart belong to the vendor
      const vendorProducts = await this.prisma.product.findMany({
        where: {
          id: { in: params.productIds },
          vendorId: coupon.vendorId,
        },
        select: { id: true },
      });

      if (vendorProducts.length === 0) {
        return {
          valid: false,
          message: 'This coupon is only valid for products from this vendor',
        };
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, params.subtotal);

    return {
      valid: true,
      message: 'Coupon is valid',
      discountAmount,
      discountPercentage: coupon.type === CouponType.PERCENTAGE ? coupon.value : undefined,
      coupon,
      newSubtotal: params.subtotal - discountAmount,
    };
  }

  /**
   * Apply vendor coupon to order
   */
  async applyVendorCoupon(code: string, params: {
    userId: string;
    orderId: string;
    productIds: string[];
    subtotal: number;
  }) {
    const validation = await this.validateVendorCoupon(code, {
      userId: params.userId,
      productIds: params.productIds,
      subtotal: params.subtotal,
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Record usage
    await this.prisma.vendorCouponUsage.create({
      data: {
        vendorCouponId: validation.coupon!.id,
        userId: params.userId,
        orderId: params.orderId,
        discountAmount: validation.discountAmount!,
      },
    });

    // Update times used
    await this.prisma.vendorCoupon.update({
      where: { id: validation.coupon!.id },
      data: { timesUsed: { increment: 1 } },
    });

    return {
      discountAmount: validation.discountAmount,
      newSubtotal: validation.newSubtotal,
    };
  }

  /**
   * Get coupon analytics for a vendor
   */
  async getVendorCouponAnalytics(vendorId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      vendorCoupon: { vendorId },
    };

    if (startDate || endDate) {
      where.usedAt = {};
      if (startDate) where.usedAt.gte = startDate;
      if (endDate) where.usedAt.lte = endDate;
    }

    const [totalUsages, totalDiscountAmount, couponStats] = await Promise.all([
      this.prisma.vendorCouponUsage.count({ where }),
      this.prisma.vendorCouponUsage.aggregate({
        where,
        _sum: { discountAmount: true },
      }),
      this.prisma.vendorCouponUsage.groupBy({
        by: ['vendorCouponId'],
        where,
        _count: true,
        _sum: { discountAmount: true },
        orderBy: { _count: { vendorCouponId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get coupon details
    const couponDetails = await this.prisma.vendorCoupon.findMany({
      where: {
        id: { in: couponStats.map((c) => c.vendorCouponId) },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    const topCoupons = couponStats.map((stat) => {
      const coupon = couponDetails.find((c) => c.id === stat.vendorCouponId);
      return {
        ...coupon,
        usageCount: stat._count,
        totalDiscount: stat._sum.discountAmount,
      };
    });

    // Get active coupons count
    const activeCoupons = await this.prisma.vendorCoupon.count({
      where: {
        vendorId,
        isActive: true,
        approvalStatus: VendorCouponApprovalStatus.APPROVED,
      },
    });

    return {
      totalUsages,
      totalDiscountAmount: totalDiscountAmount._sum.discountAmount || 0,
      activeCoupons,
      topCoupons,
    };
  }

  // Admin methods

  /**
   * Get all vendor coupons pending approval (Admin)
   */
  async getPendingApprovalCoupons() {
    return this.prisma.vendorCoupon.findMany({
      where: {
        requiresApproval: true,
        approvalStatus: VendorCouponApprovalStatus.PENDING,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve vendor coupon (Admin)
   */
  async approveCoupon(couponId: string, adminId: string) {
    const coupon = await this.prisma.vendorCoupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.vendorCoupon.update({
      where: { id: couponId },
      data: {
        approvalStatus: VendorCouponApprovalStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Reject vendor coupon (Admin)
   */
  async rejectCoupon(couponId: string, adminId: string, reason: string) {
    const coupon = await this.prisma.vendorCoupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.vendorCoupon.update({
      where: { id: couponId },
      data: {
        approvalStatus: VendorCouponApprovalStatus.REJECTED,
        approvedById: adminId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  // Private helpers

  private calculateDiscount(coupon: any, subtotal: number): number {
    let discount = 0;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discount = (subtotal * coupon.value) / 100;
        break;
      case CouponType.FIXED_AMOUNT:
        discount = coupon.value;
        break;
      case CouponType.FREE_SHIPPING:
        discount = 0; // Handled separately
        break;
      default:
        discount = 0;
    }

    // Apply maximum discount cap
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    // Ensure discount doesn't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return Math.round(discount * 100) / 100;
  }
}
