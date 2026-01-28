import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';
import {
  StartImpersonationDto,
  StopImpersonationDto,
  ImpersonationMode,
} from './dto/start-impersonation.dto';
import {
  ImpersonationHistoryQueryDto,
  ImpersonationSessionDto,
  ImpersonationHistoryResponseDto,
  ActiveImpersonationDto,
} from './dto/impersonation-history.dto';

/**
 * Impersonation session stored in memory/cache
 * In production, this should be stored in Redis for distributed systems
 */
interface ImpersonationSession {
  sessionId: string;
  impersonatorId: string;
  impersonatorEmail: string;
  impersonatorName: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  reason: string;
  ticketReference?: string;
  mode: ImpersonationMode;
  startedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Action log entry for impersonation audit
 */
interface ImpersonationAction {
  id: string;
  sessionId: string;
  action: string;
  method: string;
  path: string;
  requestBody?: Record<string, any>;
  statusCode: number;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
}

/**
 * JWT payload for impersonation tokens
 */
interface ImpersonationTokenPayload {
  sub: string; // Target user ID (who is being impersonated)
  email: string; // Target user email
  role: string; // Target user role
  isImpersonation: true;
  impersonatorId: string;
  impersonatorEmail: string;
  sessionId: string;
  mode: ImpersonationMode;
  iat?: number;
  exp?: number;
  jti: string;
}

// Maximum impersonation session duration (1 hour)
const MAX_SESSION_DURATION_MS = 60 * 60 * 1000;

// Protected roles that cannot be impersonated
const PROTECTED_ROLES = ['ADMIN'];

// Roles allowed to impersonate
const ALLOWED_IMPERSONATOR_ROLES = ['ADMIN', 'SUPPORT'];

@Injectable()
export class ImpersonationService {
  private readonly logger = new Logger(ImpersonationService.name);

  // In-memory session store (use Redis in production for distributed systems)
  private activeSessions: Map<string, ImpersonationSession> = new Map();
  private sessionsByImpersonator: Map<string, string> = new Map(); // impersonatorId -> sessionId
  private actionLogs: Map<string, ImpersonationAction[]> = new Map(); // sessionId -> actions

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {
    // Start cleanup interval for expired sessions
    this.startSessionCleanup();
  }

  /**
   * Start an impersonation session
   * Requires MFA verification and logs all details for audit
   */
  async startImpersonation(
    impersonatorId: string,
    targetUserId: string,
    dto: StartImpersonationDto,
    request: { ip?: string; headers?: Record<string, any> },
  ): Promise<{
    impersonationToken: string;
    session: ActiveImpersonationDto;
  }> {
    // 1. Validate impersonator has MFA enabled and verify the code
    await this.verifyMfaForImpersonation(impersonatorId, dto.mfaCode);

    // 2. Get impersonator details
    const impersonator = await this.usersService.findById(impersonatorId);
    if (!impersonator) {
      throw new NotFoundException('Impersonator user not found');
    }

    // 3. Verify impersonator has permission to impersonate
    if (!ALLOWED_IMPERSONATOR_ROLES.includes(impersonator.role)) {
      this.logger.warn(
        `Unauthorized impersonation attempt by user ${impersonatorId} with role ${impersonator.role}`,
      );
      throw new ForbiddenException('You do not have permission to impersonate users');
    }

    // 4. Check if impersonator already has an active session
    const existingSessionId = this.sessionsByImpersonator.get(impersonatorId);
    if (existingSessionId && this.activeSessions.has(existingSessionId)) {
      throw new BadRequestException(
        'You already have an active impersonation session. Please end it before starting a new one.',
      );
    }

    // 5. Get target user details
    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // 6. Prevent impersonation of admin users
    if (PROTECTED_ROLES.includes(targetUser.role)) {
      this.logger.warn(
        `Attempted impersonation of protected user ${targetUserId} (role: ${targetUser.role}) by ${impersonatorId}`,
      );
      throw new ForbiddenException(
        'Cannot impersonate users with administrative privileges for security reasons',
      );
    }

    // 7. Prevent self-impersonation
    if (impersonatorId === targetUserId) {
      throw new BadRequestException('Cannot impersonate yourself');
    }

    // 8. Create session
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MAX_SESSION_DURATION_MS);

    const session: ImpersonationSession = {
      sessionId,
      impersonatorId,
      impersonatorEmail: impersonator.email,
      impersonatorName: impersonator.name,
      targetUserId,
      targetUserEmail: targetUser.email,
      targetUserName: targetUser.name,
      reason: dto.reason,
      ticketReference: dto.ticketReference,
      mode: dto.mode || ImpersonationMode.VIEW_ONLY,
      startedAt: now,
      expiresAt,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers?.['user-agent'],
    };

    // 9. Store session
    this.activeSessions.set(sessionId, session);
    this.sessionsByImpersonator.set(impersonatorId, sessionId);
    this.actionLogs.set(sessionId, []);

    // 10. Log to database for permanent audit trail
    await this.logImpersonationStart(session);

    // 11. Generate special impersonation JWT
    const impersonationToken = this.generateImpersonationToken(session, targetUser);

    // 12. Send notification email to the impersonated user
    await this.notifyUserOfImpersonation(session);

    this.logger.log(
      `Impersonation started: ${impersonator.email} -> ${targetUser.email} (Session: ${sessionId}, Mode: ${session.mode})`,
    );

    return {
      impersonationToken,
      session: {
        sessionId,
        targetUserId,
        targetUserName: targetUser.name,
        mode: session.mode,
        startedAt: now,
        expiresAt,
        timeRemainingSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      },
    };
  }

  /**
   * End an impersonation session
   */
  async stopImpersonation(
    impersonatorId: string,
    dto?: StopImpersonationDto,
  ): Promise<{ message: string; sessionSummary: ImpersonationSessionDto }> {
    const sessionId = this.sessionsByImpersonator.get(impersonatorId);

    if (!sessionId) {
      throw new BadRequestException('No active impersonation session found');
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.sessionsByImpersonator.delete(impersonatorId);
      throw new BadRequestException('Impersonation session not found or already ended');
    }

    const endedAt = new Date();
    const actions = this.actionLogs.get(sessionId) || [];

    // Log session end to database
    await this.logImpersonationEnd(sessionId, endedAt, dto?.notes, dto?.resolution, actions.length);

    // Get session summary before cleanup
    const sessionSummary: ImpersonationSessionDto = {
      id: sessionId,
      impersonatorId: session.impersonatorId,
      impersonatorName: session.impersonatorName,
      impersonatorEmail: session.impersonatorEmail,
      targetUserId: session.targetUserId,
      targetUserName: session.targetUserName,
      targetUserEmail: session.targetUserEmail,
      reason: session.reason,
      ticketReference: session.ticketReference,
      mode: session.mode,
      startedAt: session.startedAt,
      endedAt,
      expiresAt: session.expiresAt,
      isActive: false,
      notes: dto?.notes,
      resolution: dto?.resolution,
      actionCount: actions.length,
      actions: actions.map((a) => ({
        id: a.id,
        action: a.action,
        method: a.method,
        path: a.path,
        requestBody: a.requestBody,
        statusCode: a.statusCode,
        timestamp: a.timestamp,
        ipAddress: a.ipAddress,
        userAgent: a.userAgent,
      })),
    };

    // Clean up session
    this.activeSessions.delete(sessionId);
    this.sessionsByImpersonator.delete(impersonatorId);
    this.actionLogs.delete(sessionId);

    this.logger.log(
      `Impersonation ended: ${session.impersonatorEmail} -> ${session.targetUserEmail} (Session: ${sessionId}, Actions: ${actions.length})`,
    );

    return {
      message: 'Impersonation session ended successfully',
      sessionSummary,
    };
  }

  /**
   * Log an action performed during impersonation
   * Called by the ImpersonationAuditGuard
   */
  async logAction(
    sessionId: string,
    action: {
      method: string;
      path: string;
      requestBody?: Record<string, any>;
      statusCode: number;
      ipAddress: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to log action for non-existent session: ${sessionId}`);
      return;
    }

    const actionLog: ImpersonationAction = {
      id: crypto.randomUUID(),
      sessionId,
      action: `${action.method} ${action.path}`,
      method: action.method,
      path: action.path,
      requestBody: this.sanitizeRequestBody(action.requestBody),
      statusCode: action.statusCode,
      timestamp: new Date(),
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
    };

    const actions = this.actionLogs.get(sessionId) || [];
    actions.push(actionLog);
    this.actionLogs.set(sessionId, actions);

    // Also log to database for permanent record
    await this.logActionToDatabase(sessionId, actionLog);
  }

  /**
   * Get impersonation history for audit purposes
   */
  async getImpersonationHistory(
    query: ImpersonationHistoryQueryDto,
  ): Promise<ImpersonationHistoryResponseDto> {
    const { page = 1, limit = 20, impersonatorId, targetUserId, startDate, endDate, mode, activeOnly } = query;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {};

    if (impersonatorId) {
      where.impersonatorId = impersonatorId;
    }

    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    if (startDate) {
      where.startedAt = { ...where.startedAt, gte: new Date(startDate) };
    }

    if (endDate) {
      where.startedAt = { ...where.startedAt, lte: new Date(endDate) };
    }

    if (mode) {
      where.mode = mode;
    }

    if (activeOnly) {
      where.endedAt = null;
    }

    // Query database
    const [sessions, total] = await Promise.all([
      this.prisma.impersonationSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          actions: {
            orderBy: { timestamp: 'asc' },
          },
        },
      }),
      this.prisma.impersonationSession.count({ where }),
    ]);

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        impersonatorId: s.impersonatorId,
        impersonatorName: s.impersonatorName,
        impersonatorEmail: s.impersonatorEmail,
        targetUserId: s.targetUserId,
        targetUserName: s.targetUserName,
        targetUserEmail: s.targetUserEmail,
        reason: s.reason,
        ticketReference: s.ticketReference || undefined,
        mode: s.mode as ImpersonationMode,
        startedAt: s.startedAt,
        endedAt: s.endedAt || undefined,
        expiresAt: s.expiresAt,
        isActive: !s.endedAt && s.expiresAt > new Date(),
        notes: s.notes || undefined,
        resolution: s.resolution || undefined,
        actionCount: s.actions.length,
        actions: s.actions.map((a) => ({
          id: a.id,
          action: `${a.method} ${a.path}`,
          method: a.method,
          path: a.path,
          requestBody: a.requestBody as Record<string, any> | undefined,
          statusCode: a.statusCode,
          timestamp: a.timestamp,
          ipAddress: a.ipAddress,
          userAgent: a.userAgent || undefined,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get details of an active impersonation session by impersonator ID
   */
  getActiveSession(impersonatorId: string): ActiveImpersonationDto | null {
    const sessionId = this.sessionsByImpersonator.get(impersonatorId);
    if (!sessionId) {
      return null;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      this.cleanupExpiredSession(sessionId);
      return null;
    }

    return {
      sessionId: session.sessionId,
      targetUserId: session.targetUserId,
      targetUserName: session.targetUserName,
      mode: session.mode,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      timeRemainingSeconds: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    };
  }

  /**
   * Validate if a session is active and not expired
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      this.cleanupExpiredSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get session details by session ID
   */
  getSessionById(sessionId: string): ImpersonationSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.cleanupExpiredSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Check if the current request is in view-only mode
   */
  isViewOnlyMode(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return session?.mode === ImpersonationMode.VIEW_ONLY;
  }

  // ==================== Private Helper Methods ====================

  /**
   * Verify MFA code for impersonation authorization
   */
  private async verifyMfaForImpersonation(userId: string, code: string): Promise<void> {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      throw new ForbiddenException(
        'MFA must be enabled on your account to use impersonation. Please enable MFA first.',
      );
    }

    // Verify TOTP code
    const isValid = this.verifyTotpCode(mfa.secret!, code);

    if (!isValid) {
      this.logger.warn(`Invalid MFA code during impersonation attempt by user ${userId}`);
      throw new UnauthorizedException('Invalid MFA code. Impersonation requires valid MFA verification.');
    }
  }

  /**
   * Verify TOTP code against secret
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    const window = 1;
    const period = 30;

    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((Date.now() / 1000 + i * period) / period);
      const expectedCode = this.generateTotpCode(secret, counter);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code for validation
   */
  private generateTotpCode(secret: string, counter: number): string {
    const secretBuffer = this.decodeBase32(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const truncatedHash =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = truncatedHash % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Decode base32 string to buffer
   */
  private decodeBase32(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of cleanStr) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  /**
   * Generate impersonation JWT token
   */
  private generateImpersonationToken(
    session: ImpersonationSession,
    targetUser: { email: string; role: string },
  ): string {
    const payload: ImpersonationTokenPayload = {
      sub: session.targetUserId,
      email: targetUser.email,
      role: targetUser.role,
      isImpersonation: true,
      impersonatorId: session.impersonatorId,
      impersonatorEmail: session.impersonatorEmail,
      sessionId: session.sessionId,
      mode: session.mode,
      jti: crypto.randomUUID(),
    };

    // Token expires when session expires
    const expiresInSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    return this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds,
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Send notification email to the impersonated user
   */
  private async notifyUserOfImpersonation(session: ImpersonationSession): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: session.targetUserEmail,
        subject: 'Account Access Notification - Support Agent Access',
        template: 'impersonation-notification',
        context: {
          userName: session.targetUserName,
          agentName: session.impersonatorName,
          reason: session.reason,
          ticketReference: session.ticketReference,
          accessMode: session.mode === ImpersonationMode.VIEW_ONLY ? 'View Only' : 'Full Access',
          startTime: session.startedAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        },
      });

      this.logger.log(`Impersonation notification sent to ${session.targetUserEmail}`);
    } catch (error) {
      // Don't fail impersonation if email fails, but log the error
      this.logger.error(`Failed to send impersonation notification to ${session.targetUserEmail}`, error);
    }
  }

  /**
   * Log impersonation start to database
   */
  private async logImpersonationStart(session: ImpersonationSession): Promise<void> {
    try {
      await this.prisma.impersonationSession.create({
        data: {
          id: session.sessionId,
          impersonatorId: session.impersonatorId,
          impersonatorEmail: session.impersonatorEmail,
          impersonatorName: session.impersonatorName,
          targetUserId: session.targetUserId,
          targetUserEmail: session.targetUserEmail,
          targetUserName: session.targetUserName,
          reason: session.reason,
          ticketReference: session.ticketReference,
          mode: session.mode,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log impersonation start to database: ${error.message}`);
      // Don't throw - we don't want to fail the impersonation if logging fails
      // The in-memory session is still valid
    }
  }

  /**
   * Log impersonation end to database
   */
  private async logImpersonationEnd(
    sessionId: string,
    endedAt: Date,
    notes?: string,
    resolution?: string,
    actionCount?: number,
  ): Promise<void> {
    try {
      await this.prisma.impersonationSession.update({
        where: { id: sessionId },
        data: {
          endedAt,
          notes,
          resolution,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log impersonation end to database: ${error.message}`);
    }
  }

  /**
   * Log action to database
   */
  private async logActionToDatabase(sessionId: string, action: ImpersonationAction): Promise<void> {
    try {
      await this.prisma.impersonationAction.create({
        data: {
          id: action.id,
          sessionId,
          method: action.method,
          path: action.path,
          requestBody: action.requestBody || undefined,
          statusCode: action.statusCode,
          timestamp: action.timestamp,
          ipAddress: action.ipAddress,
          userAgent: action.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log impersonation action to database: ${error.message}`);
    }
  }

  /**
   * Sanitize request body to remove sensitive data before logging
   */
  private sanitizeRequestBody(body?: Record<string, any>): Record<string, any> | undefined {
    if (!body) return undefined;

    const sensitiveFields = [
      'password',
      'newPassword',
      'currentPassword',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'creditCard',
      'cardNumber',
      'cvv',
      'cvc',
      'ssn',
      'socialSecurityNumber',
      'mfaCode',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: { ip?: string; headers?: Record<string, any> }): string {
    if (!request) return 'unknown';

    const headers = request.headers || {};
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
      'x-cluster-client-ip',
    ];

    for (const header of ipHeaders) {
      const value = headers[header];
      if (value) {
        return value.split(',')[0].trim();
      }
    }

    return request.ip || 'unknown';
  }

  /**
   * Clean up an expired session
   */
  private async cleanupExpiredSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const actions = this.actionLogs.get(sessionId) || [];

    // Log session end as expired
    await this.logImpersonationEnd(
      sessionId,
      session.expiresAt,
      'Session expired automatically',
      'expired',
      actions.length,
    );

    // Clean up in-memory data
    this.activeSessions.delete(sessionId);
    this.sessionsByImpersonator.delete(session.impersonatorId);
    this.actionLogs.delete(sessionId);

    this.logger.log(`Expired impersonation session cleaned up: ${sessionId}`);
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startSessionCleanup(): void {
    // Run every minute
    setInterval(() => {
      const now = new Date();

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.expiresAt < now) {
          this.cleanupExpiredSession(sessionId);
        }
      }
    }, 60 * 1000);
  }
}
