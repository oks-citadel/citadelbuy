import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface EnterpriseContract {
  id: string;
  organizationId: string;
  vendorId?: string;
  title: string;
  type: 'MASTER_AGREEMENT' | 'PURCHASE_AGREEMENT' | 'SERVICE_AGREEMENT' | 'NDA' | 'SLA';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  terms: any;
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  renewalTermDays?: number;
  value?: number;
  currency?: string;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create enterprise contract
   */
  async createContract(data: Omit<EnterpriseContract, 'id'>) {
    this.logger.log(`Creating contract: ${data.title}`);

    const contract = await this.prisma.enterpriseContract.create({
      data: {
        organizationId: data.organizationId,
        vendorId: data.vendorId,
        title: data.title,
        type: data.type,
        status: data.status || 'DRAFT',
        terms: data.terms as any,
        startDate: data.startDate,
        endDate: data.endDate,
        autoRenew: data.autoRenew,
        renewalTermDays: data.renewalTermDays,
        value: data.value,
        currency: data.currency || 'USD',
      },
    });

    return contract;
  }

  /**
   * Get contracts
   */
  async getContracts(filters?: {
    organizationId?: string;
    vendorId?: string;
    status?: string;
    type?: string;
  }) {
    const where: any = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    return this.prisma.enterpriseContract.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        vendor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check expiring contracts
   */
  async checkExpiringContracts(daysAhead: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    const expiring = await this.prisma.enterpriseContract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
    });

    return expiring;
  }
}
