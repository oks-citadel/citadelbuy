import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  deviceInfo: any;
  isCurrent: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Hash the current token to compare
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : null;

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      isCurrent: currentTokenHash ? session.token === currentTokenHash : false,
      lastActiveAt: session.lastActivityAt,
      createdAt: session.createdAt,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    currentToken?: string
  ): Promise<{ message: string }> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if trying to revoke current session
    if (currentToken) {
      const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
      if (session.token === currentTokenHash) {
        throw new BadRequestException('Cannot revoke current session. Use logout instead.');
      }
    }

    // Mark session as inactive
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        isRevoked: true,
      },
    });

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllOtherSessions(
    userId: string,
    currentToken?: string
  ): Promise<{ message: string; revokedCount: number }> {
    let excludeTokenHash: string | null = null;

    if (currentToken) {
      excludeTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
    }

    // Get count of sessions to revoke
    const sessionsToRevoke = await this.prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        ...(excludeTokenHash && { token: { not: excludeTokenHash } }),
      },
    });

    // Revoke all other sessions
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
        ...(excludeTokenHash && { token: { not: excludeTokenHash } }),
      },
      data: {
        isActive: false,
        isRevoked: true,
      },
    });

    this.logger.log(`Revoked ${sessionsToRevoke} sessions for user ${userId}`);
    return {
      message: 'All other sessions revoked',
      revokedCount: sessionsToRevoke,
    };
  }

  /**
   * Create a new session for tracking
   */
  async createSession(
    userId: string,
    token: string,
    metadata: {
      ipAddress: string;
      userAgent?: string;
      deviceInfo?: any;
    }
  ): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.userSession.create({
      data: {
        userId,
        token: tokenHash,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceInfo: metadata.deviceInfo,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt,
      },
    });
  }
}
