import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  // Marketplace - Vendor Commissions
  async calculateCommission(vendorId: string, orderId: string, orderTotal: number, rate: number = 0.15) {
    const amount = orderTotal * rate;
    return this.prisma.vendorCommission.create({
      data: { vendorId, orderId, amount, rate },
    });
  }

  async getVendorCommissions(vendorId: string) {
    return this.prisma.vendorCommission.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async payoutCommission(commissionId: string) {
    return this.prisma.vendorCommission.update({
      where: { id: commissionId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  // Advanced Loyalty - Referrals
  async createReferral(userId: string, refereeEmail: string) {
    return this.prisma.referral.create({
      data: {
        referrerId: userId,
        refereeEmail,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId, status: 'COMPLETED' },
    });
    return {
      total: referrals.length,
      totalPoints: referrals.reduce((sum, r) => sum + (r.referrerPoints || 0), 0),
    };
  }

  // Infrastructure - Cache & Rate Limiting
  async getCacheConfig(key: string) {
    return this.prisma.cacheConfig.findUnique({ where: { key } });
  }

  async upsertCacheConfig(key: string, ttl: number) {
    return this.prisma.cacheConfig.upsert({
      where: { key },
      update: { ttl },
      create: { key, ttl },
    });
  }

  async getRateLimits() {
    return this.prisma.rateLimit.findMany({ where: { isActive: true } });
  }

  async upsertRateLimit(endpoint: string, maxRequests: number, windowMs: number) {
    const existing = await this.prisma.rateLimit.findFirst({ where: { endpoint } });
    if (existing) {
      return this.prisma.rateLimit.update({
        where: { id: existing.id },
        data: { maxRequests, windowMs },
      });
    }
    return this.prisma.rateLimit.create({
      data: { endpoint, maxRequests, windowMs },
    });
  }

  // Health Check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
  }
}
