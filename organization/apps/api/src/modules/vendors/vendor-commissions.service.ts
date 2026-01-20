import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
} from './dto';

@Injectable()
export class VendorCommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== COMMISSION RULE MANAGEMENT ====================

  async createCommissionRule(vendorId: string, dto: CreateCommissionRuleDto) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Invalid category ID');
      }
    }

    // Validate date range
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const rule = await this.prisma.vendorCommissionRule.create({
      data: {
        vendorProfileId: vendorId,
        name: dto.name,
        commissionRate: dto.commissionRate,
        categoryId: dto.categoryId,
        minOrderValue: dto.minOrderValue,
        maxOrderValue: dto.maxOrderValue,
        minCommission: dto.minCommission,
        maxCommission: dto.maxCommission,
        priority: dto.priority || 0,
        effectiveFrom: dto.startDate ? new Date(dto.startDate) : new Date(),
        effectiveTo: dto.endDate ? new Date(dto.endDate) : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    // Fetch category details separately if categoryId exists
    let category = null;
    if (rule.categoryId) {
      category = await this.prisma.category.findUnique({
        where: { id: rule.categoryId },
        select: { id: true, name: true },
      });
    }

    return { ...rule, category };
  }

  async updateCommissionRule(vendorId: string, ruleId: string, dto: UpdateCommissionRuleDto) {
    const rule = await this.prisma.vendorCommissionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    if (rule.vendorProfileId !== vendorId) {
      throw new ForbiddenException('You do not have access to this commission rule');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Invalid category ID');
      }
    }

    // Validate date range if both are provided
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.commissionRate !== undefined) updateData.commissionRate = dto.commissionRate;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.minOrderValue !== undefined) updateData.minOrderValue = dto.minOrderValue;
    if (dto.maxOrderValue !== undefined) updateData.maxOrderValue = dto.maxOrderValue;
    if (dto.minCommission !== undefined) updateData.minCommission = dto.minCommission;
    if (dto.maxCommission !== undefined) updateData.maxCommission = dto.maxCommission;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.startDate !== undefined) updateData.effectiveFrom = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.effectiveTo = dto.endDate ? new Date(dto.endDate) : null;

    const updated = await this.prisma.vendorCommissionRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    // Fetch category details separately if categoryId exists
    let category = null;
    if (updated.categoryId) {
      category = await this.prisma.category.findUnique({
        where: { id: updated.categoryId },
        select: { id: true, name: true },
      });
    }

    return { ...updated, category };
  }

  async getCommissionRules(vendorId: string, includeInactive = false) {
    const where: any = { vendorProfileId: vendorId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const rules = await this.prisma.vendorCommissionRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { effectiveFrom: 'desc' },
      ],
    });

    // Fetch category details for each rule
    const rulesWithCategories = await Promise.all(
      rules.map(async (rule) => {
        let category = null;
        if (rule.categoryId) {
          category = await this.prisma.category.findUnique({
            where: { id: rule.categoryId },
            select: { id: true, name: true },
          });
        }
        return { ...rule, category };
      }),
    );

    return rulesWithCategories;
  }

  async getCommissionRule(vendorId: string, ruleId: string) {
    const rule = await this.prisma.vendorCommissionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    if (rule.vendorProfileId !== vendorId) {
      throw new ForbiddenException('You do not have access to this commission rule');
    }

    // Fetch category details separately if categoryId exists
    let category = null;
    if (rule.categoryId) {
      category = await this.prisma.category.findUnique({
        where: { id: rule.categoryId },
        select: { id: true, name: true },
      });
    }

    return { ...rule, category };
  }

  async deleteCommissionRule(vendorId: string, ruleId: string) {
    const rule = await this.prisma.vendorCommissionRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    if (rule.vendorProfileId !== vendorId) {
      throw new ForbiddenException('You do not have access to this commission rule');
    }

    await this.prisma.vendorCommissionRule.delete({
      where: { id: ruleId },
    });

    return { success: true, message: 'Commission rule deleted successfully' };
  }

  // ==================== COMMISSION CALCULATION ====================

  async calculateCommissionForOrder(vendorId: string, orderAmount: number, categoryId?: string) {
    const now = new Date();

    // Get applicable rules
    const rules = await this.prisma.vendorCommissionRule.findMany({
      where: {
        vendorProfileId: vendorId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
      ],
    });

    // Find the first matching rule
    for (const rule of rules) {
      // Check category match
      if (rule.categoryId && rule.categoryId !== categoryId) {
        continue;
      }

      // Check order value range
      if (rule.minOrderValue && orderAmount < rule.minOrderValue) {
        continue;
      }
      if (rule.maxOrderValue && orderAmount > rule.maxOrderValue) {
        continue;
      }

      // Calculate commission
      let commission = (orderAmount * rule.commissionRate) / 100;

      // Apply min/max commission constraints
      if (rule.minCommission && commission < rule.minCommission) {
        commission = rule.minCommission;
      }
      if (rule.maxCommission && commission > rule.maxCommission) {
        commission = rule.maxCommission;
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        commissionRate: rule.commissionRate,
        commissionAmount: Math.round(commission * 100) / 100,
        orderAmount,
      };
    }

    // Fall back to vendor's default commission rate
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { commissionRate: true, businessName: true },
    });

    const defaultRate = profile?.commissionRate || 15;
    const commission = (orderAmount * defaultRate) / 100;

    return {
      ruleId: null,
      ruleName: 'Default Rate',
      commissionRate: defaultRate,
      commissionAmount: Math.round(commission * 100) / 100,
      orderAmount,
    };
  }

  async getCommissionSummary(vendorId: string, periodStart: Date, periodEnd: Date) {
    // Get orders with commissions in the period
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        items: {
          some: {
            product: {
              vendorId,
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                vendorId: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    let totalOrderValue = 0;
    let totalCommission = 0;
    const categoryBreakdown: Record<string, { orders: number; value: number; commission: number }> = {};

    for (const order of orders) {
      for (const item of order.items) {
        if (item.product?.vendorId !== vendorId) continue;

        const itemValue = item.price * item.quantity;
        totalOrderValue += itemValue;

        const commissionCalc = await this.calculateCommissionForOrder(
          vendorId,
          itemValue,
          item.product?.categoryId,
        );

        totalCommission += commissionCalc.commissionAmount;

        // Track by category
        const categoryId = item.product?.categoryId || 'uncategorized';
        if (!categoryBreakdown[categoryId]) {
          categoryBreakdown[categoryId] = { orders: 0, value: 0, commission: 0 };
        }
        categoryBreakdown[categoryId].orders += 1;
        categoryBreakdown[categoryId].value += itemValue;
        categoryBreakdown[categoryId].commission += commissionCalc.commissionAmount;
      }
    }

    return {
      periodStart,
      periodEnd,
      totalOrders: orders.length,
      totalOrderValue: Math.round(totalOrderValue * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      averageCommissionRate: totalOrderValue > 0 ? (totalCommission / totalOrderValue) * 100 : 0,
      netEarnings: Math.round((totalOrderValue - totalCommission) * 100) / 100,
      categoryBreakdown,
    };
  }

  // ==================== ADMIN FUNCTIONS ====================

  async getAllCommissionRules(page: number = 1, limit: number = 20, vendorId?: string) {
    const where: any = {};
    if (vendorId) {
      where.vendorProfileId = vendorId;
    }

    const skip = (page - 1) * limit;

    const [rules, total] = await Promise.all([
      this.prisma.vendorCommissionRule.findMany({
        where,
        include: {
          vendorProfile: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.vendorCommissionRule.count({ where }),
    ]);

    // Fetch category details for each rule
    const rulesWithCategories = await Promise.all(
      rules.map(async (rule) => {
        let category = null;
        if (rule.categoryId) {
          category = await this.prisma.category.findUnique({
            where: { id: rule.categoryId },
            select: { id: true, name: true },
          });
        }
        return { ...rule, category };
      }),
    );

    return {
      data: rulesWithCategories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCommissionStats(vendorId?: string) {
    const where: any = {};
    if (vendorId) {
      where.vendorProfileId = vendorId;
    }

    const [totalRules, activeRules, avgRate] = await Promise.all([
      this.prisma.vendorCommissionRule.count({ where }),
      this.prisma.vendorCommissionRule.count({ where: { ...where, isActive: true } }),
      this.prisma.vendorCommissionRule.aggregate({
        where: { ...where, isActive: true },
        _avg: { commissionRate: true },
      }),
    ]);

    return {
      totalRules,
      activeRules,
      inactiveRules: totalRules - activeRules,
      averageCommissionRate: avgRate._avg.commissionRate || 0,
    };
  }
}
