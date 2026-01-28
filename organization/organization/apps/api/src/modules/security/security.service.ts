import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityType, DevicePlatform } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

// Default configuration for session limits
const DEFAULT_MAX_CONCURRENT_SESSIONS = 5;
const DEFAULT_MAX_MOBILE_SESSIONS = 3;
const DEFAULT_MAX_WEB_SESSIONS = 3;
const DEFAULT_ENFORCEMENT_MODE = 'evict_oldest'; // 'block' | 'evict_oldest' | 'evict_idle'
const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

export interface SessionLimitConfig {
  maxConcurrentSessions: number;
  maxMobileSessions: number;
  maxWebSessions: number;
  enforcementMode: 'block' | 'evict_oldest' | 'evict_idle';
  idleTimeoutMinutes: number;
  notifyOnNewSession: boolean;
  notifyOnEviction: boolean;
}

export interface ActiveSessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  deviceType: DevicePlatform;
  deviceName: string | null;
  location: any;
  lastActivityAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

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
    const hashedKey = await bcrypt.hash(key, 12);
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
      backupCodes.map((code) => bcrypt.hash(code, 12)),
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

  /**
   * Get session limit configuration (from database or defaults)
   */
  async getSessionLimitConfig(organizationId?: string): Promise<SessionLimitConfig> {
    const settings = await this.prisma.sessionSettings.findFirst({
      where: organizationId ? { organizationId } : { organizationId: null },
    });

    if (settings) {
      return {
        maxConcurrentSessions: settings.maxConcurrentSessions,
        maxMobileSessions: settings.maxMobileSessions,
        maxWebSessions: settings.maxWebSessions,
        enforcementMode: settings.enforcementMode as SessionLimitConfig['enforcementMode'],
        idleTimeoutMinutes: settings.idleTimeoutMinutes,
        notifyOnNewSession: settings.notifyOnNewSession,
        notifyOnEviction: settings.notifyOnEviction,
      };
    }

    // Return defaults from environment or hardcoded
    return {
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '', 10) || DEFAULT_MAX_CONCURRENT_SESSIONS,
      maxMobileSessions: parseInt(process.env.MAX_MOBILE_SESSIONS || '', 10) || DEFAULT_MAX_MOBILE_SESSIONS,
      maxWebSessions: parseInt(process.env.MAX_WEB_SESSIONS || '', 10) || DEFAULT_MAX_WEB_SESSIONS,
      enforcementMode: (process.env.SESSION_ENFORCEMENT_MODE as SessionLimitConfig['enforcementMode']) || DEFAULT_ENFORCEMENT_MODE,
      idleTimeoutMinutes: parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '', 10) || DEFAULT_IDLE_TIMEOUT_MINUTES,
      notifyOnNewSession: process.env.NOTIFY_ON_NEW_SESSION !== 'false',
      notifyOnEviction: process.env.NOTIFY_ON_EVICTION !== 'false',
    };
  }

  /**
   * Count active sessions for a user
   */
  async getActiveSessionCount(userId: string, deviceType?: DevicePlatform): Promise<number> {
    return this.prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        ...(deviceType && { deviceType }),
      },
    });
  }

  /**
   * Get active sessions for a user with details
   */
  async getUserActiveSessions(userId: string, currentSessionId?: string): Promise<ActiveSessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceType: true,
        deviceName: true,
        location: true,
        lastActivityAt: true,
        createdAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }

  /**
   * Find the oldest or most idle session based on enforcement mode
   */
  private async findSessionToEvict(userId: string, enforcementMode: string): Promise<string | null> {
    let orderBy: { [key: string]: 'asc' | 'desc' };

    if (enforcementMode === 'evict_idle') {
      // Evict the session with the oldest lastActivityAt (most idle)
      orderBy = { lastActivityAt: 'asc' };
    } else {
      // Default: evict_oldest - evict the session with the oldest createdAt
      orderBy = { createdAt: 'asc' };
    }

    const sessionToEvict = await this.prisma.userSession.findFirst({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy,
      select: { id: true },
    });

    return sessionToEvict?.id || null;
  }

  /**
   * Enforce session limits by evicting sessions if necessary
   * Returns the session that was evicted, if any
   */
  async enforceSessionLimit(
    userId: string,
    deviceType: DevicePlatform = DevicePlatform.WEB,
  ): Promise<{ evictedSessionId: string | null; shouldBlock: boolean }> {
    const config = await this.getSessionLimitConfig();

    // Check total concurrent sessions
    const totalCount = await this.getActiveSessionCount(userId);

    // Check device-specific limits
    const deviceCount = await this.getActiveSessionCount(userId, deviceType);
    const deviceLimit = deviceType === DevicePlatform.WEB ? config.maxWebSessions :
      (deviceType === DevicePlatform.IOS || deviceType === DevicePlatform.ANDROID) ? config.maxMobileSessions :
        config.maxConcurrentSessions;

    // Determine if we've exceeded any limit
    const exceedsTotal = totalCount >= config.maxConcurrentSessions;
    const exceedsDevice = deviceCount >= deviceLimit;

    if (!exceedsTotal && !exceedsDevice) {
      return { evictedSessionId: null, shouldBlock: false };
    }

    // Handle enforcement mode
    if (config.enforcementMode === 'block') {
      return { evictedSessionId: null, shouldBlock: true };
    }

    // Evict a session
    const sessionIdToEvict = await this.findSessionToEvict(userId, config.enforcementMode);

    if (sessionIdToEvict) {
      await this.revokeSessionById(userId, sessionIdToEvict, 'session_limit');

      await this.logActivity({
        userId,
        activityType: ActivityType.LOGOUT,
        action: 'Session terminated due to concurrent session limit',
        resource: `session:${sessionIdToEvict}`,
        metadata: {
          reason: 'session_limit',
          enforcementMode: config.enforcementMode,
          totalSessions: totalCount,
          maxAllowed: config.maxConcurrentSessions,
        },
      });
    }

    return { evictedSessionId: sessionIdToEvict, shouldBlock: false };
  }

  /**
   * Create a new session with concurrent session limit enforcement
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    options?: {
      deviceType?: DevicePlatform;
      deviceId?: string;
      deviceName?: string;
      location?: { city?: string; country?: string; lat?: number; lng?: number };
    },
  ) {
    const deviceType = options?.deviceType || DevicePlatform.WEB;

    // Enforce session limits before creating a new session
    const { shouldBlock, evictedSessionId } = await this.enforceSessionLimit(userId, deviceType);

    if (shouldBlock) {
      throw new ConflictException({
        message: 'Maximum concurrent sessions reached. Please logout from another device to continue.',
        code: 'SESSION_LIMIT_REACHED',
        maxSessions: (await this.getSessionLimitConfig()).maxConcurrentSessions,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 12);

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        token: hashedToken,
        ipAddress,
        userAgent,
        deviceType,
        deviceId: options?.deviceId,
        deviceName: options?.deviceName,
        location: options?.location,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.LOGIN,
      action: 'New session created',
      resource: `session:${session.id}`,
      ipAddress,
      userAgent,
      metadata: {
        deviceType,
        evictedSession: evictedSessionId,
      },
    });

    // Emit notification events
    const config = await this.getSessionLimitConfig();

    if (config.notifyOnNewSession) {
      this.eventEmitter.emit('session.created', {
        userId,
        sessionId: session.id,
        ipAddress,
        userAgent,
        deviceType,
        deviceName: options?.deviceName,
        location: options?.location,
        evictedSessionId,
      });
      this.logger.log(`New session notification emitted for user ${userId}`);
    }

    if (evictedSessionId && config.notifyOnEviction) {
      this.eventEmitter.emit('session.evicted', {
        userId,
        evictedSessionId,
        reason: 'session_limit_exceeded',
        newSessionId: session.id,
        newDeviceType: deviceType,
      });
      this.logger.log(`Session eviction notification emitted for user ${userId}, evicted session ${evictedSessionId}`);
    }

    return { session, plainToken: token, evictedSessionId };
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

  /**
   * Revoke a specific session by ID (for remote logout)
   */
  async revokeSessionById(
    userId: string,
    sessionId: string,
    reason: string = 'user_logout',
  ): Promise<{ message: string; sessionId: string }> {
    // Verify the session belongs to the user
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true,
        isRevoked: false,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        isActive: false,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.LOGOUT,
      action: `Session revoked: ${reason}`,
      resource: `session:${sessionId}`,
      metadata: { reason, sessionId },
    });

    return { message: 'Session revoked successfully', sessionId };
  }

  /**
   * Revoke all sessions except optionally the current one
   */
  async revokeSessions(
    userId: string,
    exceptSessionId?: string,
    reason: string = 'user_logout_all',
  ) {
    const updateResult = await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: {
        isRevoked: true,
        isActive: false,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });

    await this.logActivity({
      userId,
      activityType: ActivityType.LOGOUT,
      action: exceptSessionId ? 'All other sessions revoked' : 'All sessions revoked',
      metadata: {
        reason,
        sessionsRevoked: updateResult.count,
        exceptSessionId,
      },
    });

    return {
      message: 'Sessions revoked successfully',
      count: updateResult.count,
    };
  }

  /**
   * Update session settings (admin only)
   */
  async updateSessionSettings(
    settings: Partial<SessionLimitConfig>,
    organizationId?: string,
  ) {
    const existingSettings = await this.prisma.sessionSettings.findFirst({
      where: organizationId ? { organizationId } : { organizationId: null },
    });

    if (existingSettings) {
      return this.prisma.sessionSettings.update({
        where: { id: existingSettings.id },
        data: {
          ...(settings.maxConcurrentSessions !== undefined && { maxConcurrentSessions: settings.maxConcurrentSessions }),
          ...(settings.maxMobileSessions !== undefined && { maxMobileSessions: settings.maxMobileSessions }),
          ...(settings.maxWebSessions !== undefined && { maxWebSessions: settings.maxWebSessions }),
          ...(settings.enforcementMode !== undefined && { enforcementMode: settings.enforcementMode }),
          ...(settings.idleTimeoutMinutes !== undefined && { idleTimeoutMinutes: settings.idleTimeoutMinutes }),
          ...(settings.notifyOnNewSession !== undefined && { notifyOnNewSession: settings.notifyOnNewSession }),
          ...(settings.notifyOnEviction !== undefined && { notifyOnEviction: settings.notifyOnEviction }),
        },
      });
    }

    return this.prisma.sessionSettings.create({
      data: {
        organizationId,
        maxConcurrentSessions: settings.maxConcurrentSessions ?? DEFAULT_MAX_CONCURRENT_SESSIONS,
        maxMobileSessions: settings.maxMobileSessions ?? DEFAULT_MAX_MOBILE_SESSIONS,
        maxWebSessions: settings.maxWebSessions ?? DEFAULT_MAX_WEB_SESSIONS,
        enforcementMode: settings.enforcementMode ?? DEFAULT_ENFORCEMENT_MODE,
        idleTimeoutMinutes: settings.idleTimeoutMinutes ?? DEFAULT_IDLE_TIMEOUT_MINUTES,
        notifyOnNewSession: settings.notifyOnNewSession ?? true,
        notifyOnEviction: settings.notifyOnEviction ?? true,
      },
    });
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
