import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DevicePlatform, ActivityType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Session eviction modes
export type EvictionMode = 'block' | 'evict_oldest' | 'evict_idle';

// Default session limits
export const DEFAULT_SESSION_LIMITS = {
  maxConcurrentSessions: 5,
  maxMobileSessions: 3,
  maxWebSessions: 3,
  enforcementMode: 'evict_oldest' as EvictionMode,
  idleTimeoutMinutes: 30,
  notifyOnNewSession: true,
  notifyOnEviction: true,
};

export interface SessionLimitConfig {
  maxConcurrentSessions: number;
  maxMobileSessions: number;
  maxWebSessions: number;
  enforcementMode: EvictionMode;
  idleTimeoutMinutes: number;
  notifyOnNewSession: boolean;
  notifyOnEviction: boolean;
}

export interface NewSessionInfo {
  ipAddress: string;
  userAgent?: string;
  deviceType?: DevicePlatform;
  deviceId?: string;
  deviceName?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
}

export interface ActiveSessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  deviceType: DevicePlatform;
  deviceName: string | null;
  deviceId: string | null;
  location: any;
  lastActivityAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface SessionTerminationResult {
  sessionId: string;
  reason: string;
  terminatedAt: Date;
}

export interface SessionEnforcementResult {
  allowed: boolean;
  evictedSessionId: string | null;
  reason?: string;
}

/**
 * SessionManagerService handles concurrent session limits and session lifecycle management.
 *
 * Features:
 * - Get active session count for a user (total and per device type)
 * - Enforce session limits with configurable eviction modes (block, evict_oldest, evict_idle)
 * - List all active sessions for a user
 * - Terminate specific sessions or all sessions
 * - Device/platform categorization (WEB, MOBILE-IOS, MOBILE-ANDROID)
 * - Notification triggers for new sessions and evictions
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Categorize a device type as mobile for limit calculations
   */
  private isMobileDevice(deviceType: DevicePlatform): boolean {
    return deviceType === DevicePlatform.IOS || deviceType === DevicePlatform.ANDROID;
  }

  /**
   * Categorize a device type as desktop for limit calculations
   * Desktop includes native desktop applications
   */
  private isDesktopDevice(deviceType: DevicePlatform): boolean {
    return deviceType === DevicePlatform.DESKTOP;
  }

  /**
   * Check if device is web-based (browser)
   */
  private isWebDevice(deviceType: DevicePlatform): boolean {
    return deviceType === DevicePlatform.WEB;
  }

  /**
   * Get the session limit configuration (from database or defaults)
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
        enforcementMode: settings.enforcementMode as EvictionMode,
        idleTimeoutMinutes: settings.idleTimeoutMinutes,
        notifyOnNewSession: settings.notifyOnNewSession,
        notifyOnEviction: settings.notifyOnEviction,
      };
    }

    // Return defaults from environment or hardcoded values
    return {
      maxConcurrentSessions:
        parseInt(process.env.MAX_CONCURRENT_SESSIONS || '', 10) || DEFAULT_SESSION_LIMITS.maxConcurrentSessions,
      maxMobileSessions:
        parseInt(process.env.MAX_MOBILE_SESSIONS || '', 10) || DEFAULT_SESSION_LIMITS.maxMobileSessions,
      maxWebSessions:
        parseInt(process.env.MAX_WEB_SESSIONS || '', 10) || DEFAULT_SESSION_LIMITS.maxWebSessions,
      enforcementMode:
        (process.env.SESSION_ENFORCEMENT_MODE as EvictionMode) || DEFAULT_SESSION_LIMITS.enforcementMode,
      idleTimeoutMinutes:
        parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '', 10) || DEFAULT_SESSION_LIMITS.idleTimeoutMinutes,
      notifyOnNewSession: process.env.NOTIFY_ON_NEW_SESSION !== 'false',
      notifyOnEviction: process.env.NOTIFY_ON_EVICTION !== 'false',
    };
  }

  /**
   * Get the count of active sessions for a user
   * @param userId - The user ID to check
   * @param deviceType - Optional device type filter (IOS, ANDROID, WEB)
   * @returns The number of active sessions
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
   * Get mobile session count (iOS + Android combined)
   */
  async getMobileSessionCount(userId: string): Promise<number> {
    return this.prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        deviceType: { in: [DevicePlatform.IOS, DevicePlatform.ANDROID] },
      },
    });
  }

  /**
   * Get all active sessions for a user
   * @param userId - The user ID
   * @param currentSessionId - Optional ID of the current session to mark as "isCurrent"
   * @returns Array of active session information
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
        deviceId: true,
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
   * Find the session to evict based on enforcement mode
   * @param userId - The user ID
   * @param enforcementMode - The eviction mode (evict_oldest or evict_idle)
   * @param deviceType - Optional device type filter for device-specific eviction
   * @returns Session ID to evict, or null if none found
   */
  private async findSessionToEvict(
    userId: string,
    enforcementMode: EvictionMode,
    deviceType?: DevicePlatform,
  ): Promise<string | null> {
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
        ...(deviceType && { deviceType }),
      },
      orderBy,
      select: { id: true },
    });

    return sessionToEvict?.id || null;
  }

  /**
   * Enforce session limits for a user when creating a new session
   *
   * This method checks both total session limits and device-specific limits.
   * Based on the enforcement mode, it will either:
   * - 'block': Reject the new session
   * - 'evict_oldest': Terminate the oldest session
   * - 'evict_idle': Terminate the most idle session
   *
   * @param userId - The user ID
   * @param newSessionInfo - Information about the new session being created
   * @returns Result indicating whether the session is allowed and any evicted session
   */
  async enforceSessionLimit(
    userId: string,
    newSessionInfo: NewSessionInfo,
  ): Promise<SessionEnforcementResult> {
    const config = await this.getSessionLimitConfig();
    const deviceType = newSessionInfo.deviceType || DevicePlatform.WEB;

    // Check total concurrent sessions
    const totalCount = await this.getActiveSessionCount(userId);

    // Check device-specific limits
    const isMobile = this.isMobileDevice(deviceType);
    let deviceCount: number;
    let deviceLimit: number;

    if (isMobile) {
      deviceCount = await this.getMobileSessionCount(userId);
      deviceLimit = config.maxMobileSessions;
    } else {
      deviceCount = await this.getActiveSessionCount(userId, DevicePlatform.WEB);
      deviceLimit = config.maxWebSessions;
    }

    // Determine if we've exceeded any limit
    const exceedsTotal = totalCount >= config.maxConcurrentSessions;
    const exceedsDevice = deviceCount >= deviceLimit;

    if (!exceedsTotal && !exceedsDevice) {
      // No limits exceeded, session is allowed
      return { allowed: true, evictedSessionId: null };
    }

    // Handle enforcement mode
    if (config.enforcementMode === 'block') {
      this.logger.warn(
        `Session limit reached for user ${userId}: total=${totalCount}/${config.maxConcurrentSessions}, ` +
          `${isMobile ? 'mobile' : 'web'}=${deviceCount}/${deviceLimit}`,
      );
      return {
        allowed: false,
        evictedSessionId: null,
        reason: `Maximum concurrent sessions reached. Please logout from another device to continue.`,
      };
    }

    // Evict a session (evict_oldest or evict_idle)
    let sessionIdToEvict: string | null = null;

    // Prioritize evicting from the same device type if that limit is exceeded
    if (exceedsDevice) {
      if (isMobile) {
        // Find oldest/idle mobile session
        const iosSession = await this.findSessionToEvict(userId, config.enforcementMode, DevicePlatform.IOS);
        const androidSession = await this.findSessionToEvict(userId, config.enforcementMode, DevicePlatform.ANDROID);

        // Pick the one that matches the eviction criteria
        if (iosSession && androidSession) {
          // Fetch both sessions to compare
          const sessions = await this.prisma.userSession.findMany({
            where: { id: { in: [iosSession, androidSession] } },
            select: { id: true, createdAt: true, lastActivityAt: true },
          });

          const field = config.enforcementMode === 'evict_idle' ? 'lastActivityAt' : 'createdAt';
          const sorted = sessions.sort((a, b) => a[field].getTime() - b[field].getTime());
          sessionIdToEvict = sorted[0].id;
        } else {
          sessionIdToEvict = iosSession || androidSession;
        }
      } else {
        sessionIdToEvict = await this.findSessionToEvict(userId, config.enforcementMode, DevicePlatform.WEB);
      }
    }

    // If no device-specific session found, evict any session
    if (!sessionIdToEvict && exceedsTotal) {
      sessionIdToEvict = await this.findSessionToEvict(userId, config.enforcementMode);
    }

    if (sessionIdToEvict) {
      await this.terminateSession(sessionIdToEvict, 'session_limit_exceeded');

      this.logger.log(
        `Session ${sessionIdToEvict} evicted for user ${userId} due to ${config.enforcementMode} policy`,
      );

      // Emit eviction event for notifications
      if (config.notifyOnEviction) {
        this.eventEmitter.emit('session.evicted', {
          userId,
          sessionId: sessionIdToEvict,
          reason: 'session_limit_exceeded',
          enforcementMode: config.enforcementMode,
          newSessionInfo,
        });
      }
    }

    return { allowed: true, evictedSessionId: sessionIdToEvict };
  }

  /**
   * Terminate a specific session
   * @param sessionId - The session ID to terminate
   * @param reason - The reason for termination
   * @returns The termination result
   */
  async terminateSession(sessionId: string, reason: string = 'user_logout'): Promise<SessionTerminationResult> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, isActive: true, isRevoked: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.isRevoked || !session.isActive) {
      throw new BadRequestException('Session is already terminated');
    }

    const terminatedAt = new Date();

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        isRevoked: true,
        revokedReason: reason,
        revokedAt: terminatedAt,
      },
    });

    // Log the termination
    await this.prisma.auditLog.create({
      data: {
        userId: session.userId,
        activityType: ActivityType.LOGOUT,
        action: `Session terminated: ${reason}`,
        resource: `session:${sessionId}`,
        metadata: { sessionId, reason, terminatedAt },
      },
    });

    this.logger.log(`Session ${sessionId} terminated: ${reason}`);

    return {
      sessionId,
      reason,
      terminatedAt,
    };
  }

  /**
   * Terminate a session owned by a specific user (with ownership verification)
   * @param userId - The user ID who owns the session
   * @param sessionId - The session ID to terminate
   * @param reason - The reason for termination
   * @returns The termination result
   */
  async terminateUserSession(
    userId: string,
    sessionId: string,
    reason: string = 'user_remote_logout',
  ): Promise<SessionTerminationResult> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true,
        isRevoked: false,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already terminated');
    }

    return this.terminateSession(sessionId, reason);
  }

  /**
   * Terminate all sessions for a user except optionally the current one
   * @param userId - The user ID
   * @param exceptSessionId - Optional session ID to keep active
   * @param reason - The reason for termination
   * @returns Number of sessions terminated
   */
  async terminateAllSessions(
    userId: string,
    exceptSessionId?: string,
    reason: string = 'user_logout_all',
  ): Promise<{ count: number }> {
    const terminatedAt = new Date();

    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: {
        isActive: false,
        isRevoked: true,
        revokedReason: reason,
        revokedAt: terminatedAt,
      },
    });

    // Log the bulk termination
    await this.prisma.auditLog.create({
      data: {
        userId,
        activityType: ActivityType.LOGOUT,
        action: exceptSessionId ? 'All other sessions terminated' : 'All sessions terminated',
        metadata: {
          reason,
          terminatedAt,
          count: result.count,
          exceptSessionId,
        },
      },
    });

    this.logger.log(
      `${result.count} sessions terminated for user ${userId}: ${reason}`,
    );

    return { count: result.count };
  }

  /**
   * Create a new session with session limit enforcement
   * @param userId - The user ID
   * @param sessionInfo - Information about the new session
   * @param sessionToken - The raw session token (will be hashed)
   * @returns The created session and any evicted session info
   */
  async createSession(
    userId: string,
    sessionInfo: NewSessionInfo,
    sessionToken?: string,
  ): Promise<{
    session: { id: string; expiresAt: Date };
    plainToken: string;
    evictedSessionId: string | null;
  }> {
    // Enforce session limits
    const enforcementResult = await this.enforceSessionLimit(userId, sessionInfo);

    if (!enforcementResult.allowed) {
      throw new ConflictException({
        message: enforcementResult.reason,
        code: 'SESSION_LIMIT_REACHED',
        maxSessions: (await this.getSessionLimitConfig()).maxConcurrentSessions,
      });
    }

    // Generate session token if not provided
    const plainToken = sessionToken || crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(plainToken, 10);

    // Create the session
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        token: hashedToken,
        ipAddress: sessionInfo.ipAddress,
        userAgent: sessionInfo.userAgent,
        deviceType: sessionInfo.deviceType || DevicePlatform.WEB,
        deviceId: sessionInfo.deviceId,
        deviceName: sessionInfo.deviceName,
        location: sessionInfo.location,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    // Log session creation
    await this.prisma.auditLog.create({
      data: {
        userId,
        activityType: ActivityType.LOGIN,
        action: 'Session created',
        resource: `session:${session.id}`,
        ipAddress: sessionInfo.ipAddress,
        userAgent: sessionInfo.userAgent,
        metadata: {
          deviceType: sessionInfo.deviceType || DevicePlatform.WEB,
          evictedSession: enforcementResult.evictedSessionId,
        },
      },
    });

    // Emit new session event for notifications
    const config = await this.getSessionLimitConfig();
    if (config.notifyOnNewSession) {
      this.eventEmitter.emit('session.created', {
        userId,
        sessionId: session.id,
        sessionInfo,
        evictedSessionId: enforcementResult.evictedSessionId,
      });
    }

    return {
      session,
      plainToken,
      evictedSessionId: enforcementResult.evictedSessionId,
    };
  }

  /**
   * Update session settings (admin only)
   */
  async updateSessionSettings(
    settings: Partial<SessionLimitConfig>,
    organizationId?: string,
  ): Promise<SessionLimitConfig> {
    const existingSettings = await this.prisma.sessionSettings.findFirst({
      where: organizationId ? { organizationId } : { organizationId: null },
    });

    let updatedSettings;

    if (existingSettings) {
      updatedSettings = await this.prisma.sessionSettings.update({
        where: { id: existingSettings.id },
        data: {
          ...(settings.maxConcurrentSessions !== undefined && {
            maxConcurrentSessions: settings.maxConcurrentSessions,
          }),
          ...(settings.maxMobileSessions !== undefined && {
            maxMobileSessions: settings.maxMobileSessions,
          }),
          ...(settings.maxWebSessions !== undefined && {
            maxWebSessions: settings.maxWebSessions,
          }),
          ...(settings.enforcementMode !== undefined && {
            enforcementMode: settings.enforcementMode,
          }),
          ...(settings.idleTimeoutMinutes !== undefined && {
            idleTimeoutMinutes: settings.idleTimeoutMinutes,
          }),
          ...(settings.notifyOnNewSession !== undefined && {
            notifyOnNewSession: settings.notifyOnNewSession,
          }),
          ...(settings.notifyOnEviction !== undefined && {
            notifyOnEviction: settings.notifyOnEviction,
          }),
        },
      });
    } else {
      updatedSettings = await this.prisma.sessionSettings.create({
        data: {
          organizationId,
          maxConcurrentSessions: settings.maxConcurrentSessions ?? DEFAULT_SESSION_LIMITS.maxConcurrentSessions,
          maxMobileSessions: settings.maxMobileSessions ?? DEFAULT_SESSION_LIMITS.maxMobileSessions,
          maxWebSessions: settings.maxWebSessions ?? DEFAULT_SESSION_LIMITS.maxWebSessions,
          enforcementMode: settings.enforcementMode ?? DEFAULT_SESSION_LIMITS.enforcementMode,
          idleTimeoutMinutes: settings.idleTimeoutMinutes ?? DEFAULT_SESSION_LIMITS.idleTimeoutMinutes,
          notifyOnNewSession: settings.notifyOnNewSession ?? DEFAULT_SESSION_LIMITS.notifyOnNewSession,
          notifyOnEviction: settings.notifyOnEviction ?? DEFAULT_SESSION_LIMITS.notifyOnEviction,
        },
      });
    }

    return {
      maxConcurrentSessions: updatedSettings.maxConcurrentSessions,
      maxMobileSessions: updatedSettings.maxMobileSessions,
      maxWebSessions: updatedSettings.maxWebSessions,
      enforcementMode: updatedSettings.enforcementMode as EvictionMode,
      idleTimeoutMinutes: updatedSettings.idleTimeoutMinutes,
      notifyOnNewSession: updatedSettings.notifyOnNewSession,
      notifyOnEviction: updatedSettings.notifyOnEviction,
    };
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    total: number;
    mobile: number;
    web: number;
    limits: SessionLimitConfig;
  }> {
    const [total, mobile, web, limits] = await Promise.all([
      this.getActiveSessionCount(userId),
      this.getMobileSessionCount(userId),
      this.getActiveSessionCount(userId, DevicePlatform.WEB),
      this.getSessionLimitConfig(),
    ]);

    return { total, mobile, web, limits };
  }
}
