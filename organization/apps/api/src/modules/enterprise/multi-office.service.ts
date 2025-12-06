import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface Office {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: 'HEADQUARTERS' | 'REGIONAL' | 'BRANCH' | 'WAREHOUSE';
  address: any;
  contactInfo: any;
  operatingHours?: any;
  isActive: boolean;
}

export interface OfficeApprovalRule {
  officeId: string;
  approvalType: 'PURCHASE' | 'EXPENSE' | 'CONTRACT';
  minAmount: number;
  maxAmount: number;
  approvers: string[];
  requiresMultipleApprovals: boolean;
}

export interface OfficeTransfer {
  id: string;
  fromOfficeId: string;
  toOfficeId: string;
  items: any[];
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class MultiOfficeService {
  private readonly logger = new Logger(MultiOfficeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create office location
   */
  async createOffice(data: Omit<Office, 'id'>) {
    this.logger.log(`Creating office: ${data.name}`);

    // Validate organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if code is unique within organization
    const existing = await this.prisma.office.findFirst({
      where: {
        organizationId: data.organizationId,
        code: data.code,
      },
    });

    if (existing) {
      throw new BadRequestException('Office code already exists');
    }

    const office = await this.prisma.office.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        code: data.code,
        type: data.type,
        address: data.address as any,
        contactInfo: data.contactInfo as any,
        operatingHours: data.operatingHours as any,
        isActive: data.isActive !== false,
      },
    });

    this.logger.log(`Office created: ${office.id}`);
    return office;
  }

  /**
   * Get offices by organization
   */
  async getOffices(organizationId: string, filters?: {
    type?: string;
    isActive?: boolean;
  }) {
    const where: any = { organizationId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.office.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get office by ID
   */
  async getOfficeById(id: string) {
    const office = await this.prisma.office.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!office) {
      throw new NotFoundException(`Office ${id} not found`);
    }

    return office;
  }

  /**
   * Update office
   */
  async updateOffice(id: string, updates: Partial<Office>) {
    await this.getOfficeById(id);

    return this.prisma.office.update({
      where: { id },
      data: {
        name: updates.name,
        type: updates.type,
        address: updates.address as any,
        contactInfo: updates.contactInfo as any,
        operatingHours: updates.operatingHours as any,
        isActive: updates.isActive,
      },
    });
  }

  /**
   * Set approval rules for office
   */
  async setApprovalRules(officeId: string, rules: OfficeApprovalRule[]) {
    this.logger.log(`Setting approval rules for office: ${officeId}`);

    await this.getOfficeById(officeId);

    await this.prisma.office.update({
      where: { id: officeId },
      data: {
        approvalRules: rules as any,
      },
    });

    return { success: true };
  }

  /**
   * Get approval requirements for a transaction
   */
  async getApprovalRequirements(params: {
    officeId: string;
    type: 'PURCHASE' | 'EXPENSE' | 'CONTRACT';
    amount: number;
  }) {
    const office = await this.getOfficeById(params.officeId);
    const rules = (office.approvalRules as any[]) || [];

    const applicableRule = rules.find(
      (rule) =>
        rule.approvalType === params.type &&
        params.amount >= rule.minAmount &&
        params.amount <= rule.maxAmount,
    );

    if (!applicableRule) {
      return {
        requiresApproval: false,
        approvers: [],
      };
    }

    return {
      requiresApproval: true,
      approvers: applicableRule.approvers,
      requiresMultiple: applicableRule.requiresMultipleApprovals,
    };
  }

  /**
   * Create inter-office transfer
   */
  async createTransfer(data: {
    fromOfficeId: string;
    toOfficeId: string;
    items: any[];
    requestedBy: string;
    reason?: string;
  }) {
    this.logger.log(`Creating office transfer: ${data.fromOfficeId} -> ${data.toOfficeId}`);

    // Validate offices exist
    await this.getOfficeById(data.fromOfficeId);
    await this.getOfficeById(data.toOfficeId);

    if (data.fromOfficeId === data.toOfficeId) {
      throw new BadRequestException('Cannot transfer to same office');
    }

    const transfer = await this.prisma.officeTransfer.create({
      data: {
        fromOfficeId: data.fromOfficeId,
        toOfficeId: data.toOfficeId,
        items: data.items as any,
        requestedBy: data.requestedBy,
        reason: data.reason,
        status: 'PENDING',
      },
    });

    return transfer;
  }

  /**
   * Approve transfer
   */
  async approveTransfer(transferId: string, approvedBy: string) {
    const transfer = await this.prisma.officeTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      throw new BadRequestException('Transfer is not pending approval');
    }

    await this.prisma.officeTransfer.update({
      where: { id: transferId },
      data: {
        status: 'IN_TRANSIT',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Transfer approved: ${transferId}`);
    return { success: true };
  }

  /**
   * Complete transfer
   */
  async completeTransfer(transferId: string, receivedBy: string) {
    const transfer = await this.prisma.officeTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Transfer is not in transit');
    }

    await this.prisma.officeTransfer.update({
      where: { id: transferId },
      data: {
        status: 'DELIVERED',
        receivedBy,
        deliveredAt: new Date(),
      },
    });

    // Update inventory for both offices
    await this.updateOfficeInventory(transfer);

    this.logger.log(`Transfer completed: ${transferId}`);
    return { success: true };
  }

  /**
   * Get office budget
   */
  async getOfficeBudget(officeId: string, period: {
    startDate: Date;
    endDate: Date;
  }) {
    await this.getOfficeById(officeId);

    const expenses = await this.prisma.expense.aggregate({
      where: {
        officeId,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const purchases = await this.prisma.purchase.aggregate({
      where: {
        officeId,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      _sum: {
        total: true,
      },
    });

    return {
      officeId,
      period,
      totalExpenses: expenses._sum.amount || 0,
      totalPurchases: purchases._sum.total || 0,
      totalSpend: (expenses._sum.amount || 0) + (purchases._sum.total || 0),
    };
  }

  /**
   * Get office performance metrics
   */
  async getOfficeMetrics(officeId: string, period: {
    startDate: Date;
    endDate: Date;
  }) {
    await this.getOfficeById(officeId);

    const orders = await this.prisma.order.count({
      where: {
        officeId,
        createdAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });

    const revenue = await this.prisma.order.aggregate({
      where: {
        officeId,
        createdAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    });

    return {
      officeId,
      period,
      totalOrders: orders,
      totalRevenue: revenue._sum.total || 0,
      averageOrderValue: orders > 0 ? (revenue._sum.total || 0) / orders : 0,
    };
  }

  /**
   * Consolidate office inventory
   */
  async consolidateInventory(organizationId: string) {
    this.logger.log(`Consolidating inventory for organization: ${organizationId}`);

    const offices = await this.getOffices(organizationId);
    const inventory: Record<string, any> = {};

    for (const office of offices) {
      const officeInventory = await this.prisma.inventory.findMany({
        where: { officeId: office.id },
      });

      for (const item of officeInventory) {
        if (!inventory[item.productId]) {
          inventory[item.productId] = {
            productId: item.productId,
            totalQuantity: 0,
            offices: [],
          };
        }

        inventory[item.productId].totalQuantity += item.quantity;
        inventory[item.productId].offices.push({
          officeId: office.id,
          officeName: office.name,
          quantity: item.quantity,
        });
      }
    }

    return {
      organizationId,
      totalProducts: Object.keys(inventory).length,
      inventory: Object.values(inventory),
    };
  }

  /**
   * Update office inventory after transfer
   */
  private async updateOfficeInventory(transfer: any) {
    this.logger.log(`Updating inventory for transfer: ${transfer.id}`);

    for (const item of transfer.items) {
      // Decrease from source office
      await this.prisma.inventory.updateMany({
        where: {
          officeId: transfer.fromOfficeId,
          productId: item.productId,
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      // Increase at destination office
      await this.prisma.inventory.upsert({
        where: {
          officeId_productId: {
            officeId: transfer.toOfficeId,
            productId: item.productId,
          },
        },
        create: {
          officeId: transfer.toOfficeId,
          productId: item.productId,
          quantity: item.quantity,
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
  }
}
