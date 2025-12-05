import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditQueryDto } from '../dto/audit-query.dto';

export interface AuditLogEntry {
  organizationId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.organizationAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  /**
   * Query audit logs for an organization
   */
  async query(organizationId: string, query: AuditQueryDto) {
    const where: any = { organizationId };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.organizationAuditLog.findMany({
        where,
        take: query.limit || 50,
        skip: query.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.organizationAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };
  }

  /**
   * Get recent activity for an organization
   */
  async getRecentActivity(organizationId: string, limit: number = 20) {
    return this.prisma.organizationAuditLog.findMany({
      where: { organizationId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceHistory(
    organizationId: string,
    resource: string,
    resourceId: string,
  ) {
    return this.prisma.organizationAuditLog.findMany({
      where: {
        organizationId,
        resource,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user activity in an organization
   */
  async getUserActivity(
    organizationId: string,
    userId: string,
    limit: number = 50,
  ) {
    return this.prisma.organizationAuditLog.findMany({
      where: {
        organizationId,
        userId,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit statistics for an organization
   */
  async getStats(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalActions, actionsByType, actionsByUser] = await Promise.all([
      this.prisma.organizationAuditLog.count({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.organizationAuditLog.groupBy({
        by: ['action'],
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.organizationAuditLog.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      actionsByType: actionsByType.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      actionsByUser: actionsByUser.map((a) => ({
        userId: a.userId,
        count: a._count.userId,
      })),
      period: {
        start: startDate,
        end: new Date(),
        days,
      },
    };
  }
}
