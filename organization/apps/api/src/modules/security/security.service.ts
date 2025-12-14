import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ActivityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  // ==================== Audit Logging ====================

  async logActivity(params: {
    userId?: string;
    activityType: ActivityType;
    action: string;
    resource?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    isSuspicious?: boolean;
    riskScore?: number;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: params,
    });
  }

  async getAuditLogs(params: {
    userId?: string;
    activityType?: ActivityType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, activityType, startDate, endDate, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (activityType) where.activityType = activityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== API Key Management ====================

  async createApiKey(userId: string, name: string, scopes: string[], expiresInDays?: number) {
    const key = crypto.randomBytes(32).toString('hex');
    const hashedKey = await bcrypt.hash(key, 10);
    const keyPrefix = key.substring(0, 8);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        key: hashedKey,
        keyPrefix,
        scopes,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.API_KEY_CREATED,
      action: 'API key created',
      resource: `apikey:${apiKey.id}`,
      metadata: { name, scopes },
    });

    return { apiKey, plainKey: key };
  }

  async validateApiKey(key: string, requiredScopes?: string[]) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { isActive: true },
    });

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(key, apiKey.key);
      if (isValid) {
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          throw new UnauthorizedException('API key expired');
        }

        if (requiredScopes) {
          const hasAllScopes = requiredScopes.every((scope) => apiKey.scopes.includes(scope));
          if (!hasAllScopes) {
            throw new UnauthorizedException('Insufficient permissions');
          }
        }

        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
          },
        });

        return apiKey;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  async revokeApiKey(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== userId) {
      throw new BadRequestException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.API_KEY_DELETED,
      action: 'API key revoked',
      resource: `apikey:${id}`,
    });

    return { message: 'API key revoked successfully' };
  }

  // ==================== Two-Factor Authentication ====================

  async setup2FA(userId: string) {
    const secret = speakeasy.generateSecret({
      name: `Broxiva (${userId})`,
      length: 32,
    });

    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
      },
      update: {
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
      },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url || "");

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  async enable2FA(userId: string, token: string) {
    const twoFA = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!twoFA) {
      throw new BadRequestException('2FA not set up');
    }

    const verified = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.PROFILE_UPDATE,
      action: '2FA enabled',
    });

    return { message: '2FA enabled successfully' };
  }

  async verify2FA(userId: string, token: string) {
    const twoFA = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!twoFA?.isEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });
      return true;
    }

    for (const hashedCode of twoFA.backupCodes) {
      if (await bcrypt.compare(token, hashedCode)) {
        return true;
      }
    }

    return false;
  }

  async disable2FA(userId: string, token: string) {
    const verified = await this.verify2FA(userId, token);
    if (!verified) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: false },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.PROFILE_UPDATE,
      action: '2FA disabled',
    });

    return { message: '2FA disabled successfully' };
  }

  // ==================== Session Management ====================

  async createSession(userId: string, ipAddress: string, userAgent?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        token: hashedToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { session, plainToken: token };
  }

  async validateSession(token: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { isActive: true, isRevoked: false },
    });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(token, session.token);
      if (isValid) {
        if (session.expiresAt < new Date()) {
          await this.prisma.userSession.update({
            where: { id: session.id },
            data: { isActive: false },
          });
          throw new UnauthorizedException('Session expired');
        }

        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { lastActivityAt: new Date() },
        });

        return session;
      }
    }

    throw new UnauthorizedException('Invalid session');
  }

  async revokeSessions(userId: string, exceptSessionId?: string) {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        id: exceptSessionId ? { not: exceptSessionId } : undefined,
      },
      data: { isRevoked: true, isActive: false },
    });

    return { message: 'Sessions revoked successfully' };
  }

  // ==================== Brute Force Protection ====================

  async recordLoginAttempt(email: string, ipAddress: string, success: boolean, userAgent?: string, failureReason?: string) {
    await this.prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        success,
        userAgent,
        failureReason,
      },
    });

    if (!success) {
      const recentAttempts = await this.prisma.loginAttempt.count({
        where: {
          email,
          success: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
      });

      if (recentAttempts >= 5) {
        await this.createSecurityEvent({
          type: 'BRUTE_FORCE',
          severity: 'HIGH',
          description: `Multiple failed login attempts for ${email}`,
          ipAddress,
        });
      }
    }
  }

  async isIpBlocked(ipAddress: string) {
    const blocked = await this.prisma.ipBlacklist.findFirst({
      where: {
        ipAddress,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    return !!blocked;
  }

  // ==================== GDPR Compliance ====================

  async requestDataExport(userId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const request = await this.prisma.dataExportRequest.create({
      data: {
        userId,
        format,
        status: 'PENDING',
      },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.DATA_EXPORT,
      action: 'Data export requested',
      metadata: { format },
    });

    return request;
  }

  async processDataExport(requestId: string) {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new BadRequestException('Request not found');
    }

    try {
      const userData = await this.collectUserData(request.userId);

      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          fileUrl: '/exports/placeholder.json',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return userData;
    } catch (error) {
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  private async collectUserData(userId: string) {
    const [user, orders, reviews, wishlists, carts] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.order.findMany({ where: { userId } }),
      this.prisma.review.findMany({ where: { userId } }),
      this.prisma.wishlistCollection.findMany({ where: { userId }, include: { items: true } }),
      this.prisma.cart.findMany({ where: { userId }, include: { items: true } }),
    ]);

    return { user, orders, reviews, wishlists, carts };
  }

  // ==================== Security Events ====================

  async createSecurityEvent(params: {
    type: string;
    severity: string;
    description: string;
    ipAddress?: string;
    userId?: string;
    metadata?: any;
  }) {
    return this.prisma.securityEvent.create({
      data: params,
    });
  }

  async getSecurityEvents(params: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { type, severity, resolved, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved;

    const [events, total] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return {
      events,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
