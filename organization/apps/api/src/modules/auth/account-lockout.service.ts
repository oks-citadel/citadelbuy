import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../common/prisma/prisma.service';

interface LockoutInfo {
  attempts: number;
  lockedUntil?: number;
  lockCount: number; // Number of times account has been locked
  lastAttemptAt: number;
  ipAddress?: string;
}

interface SecurityAuditLog {
  email: string;
  ipAddress: string;
  userAgent?: string;
  event: 'failed_login' | 'account_locked' | 'account_unlocked' | 'successful_login_after_failures';
  metadata?: Record<string, any>;
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);

  // Configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly ATTEMPT_WINDOW_MINUTES = 30;
  private readonly LOCKOUT_MULTIPLIER = 2; // Each subsequent lockout doubles the duration
  private readonly MAX_LOCKOUT_DURATION_HOURS = 24;

  // Redis key prefixes
  private readonly EMAIL_LOCKOUT_PREFIX = 'auth:lockout:email:';
  private readonly IP_LOCKOUT_PREFIX = 'auth:lockout:ip:';
  private readonly ATTEMPT_LOG_PREFIX = 'auth:attempts:';

  constructor(
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if account is locked before allowing login attempt
   * Checks both email-based and IP-based lockouts
   */
  async checkLockout(email: string, ipAddress: string): Promise<void> {
    const [emailLockout, ipLockout] = await Promise.all([
      this.getLockoutInfo(this.EMAIL_LOCKOUT_PREFIX + email),
      this.getLockoutInfo(this.IP_LOCKOUT_PREFIX + ipAddress),
    ]);

    // Check email lockout
    if (emailLockout && emailLockout.lockedUntil) {
      const remainingTime = emailLockout.lockedUntil - Date.now();
      if (remainingTime > 0) {
        const minutesRemaining = Math.ceil(remainingTime / 60000);
        this.logger.warn(`Account locked for email: ${email}, ${minutesRemaining} minutes remaining`);

        throw new UnauthorizedException(
          `Account is temporarily locked due to multiple failed login attempts. ` +
          `Please try again in ${minutesRemaining} minute(s).`
        );
      } else {
        // Lockout expired, clear it
        await this.clearLockout(email, ipAddress);
      }
    }

    // Check IP lockout (more aggressive)
    if (ipLockout && ipLockout.lockedUntil) {
      const remainingTime = ipLockout.lockedUntil - Date.now();
      if (remainingTime > 0) {
        const minutesRemaining = Math.ceil(remainingTime / 60000);
        this.logger.warn(`IP locked: ${ipAddress}, ${minutesRemaining} minutes remaining`);

        throw new UnauthorizedException(
          `Too many failed login attempts from this location. ` +
          `Please try again in ${minutesRemaining} minute(s).`
        );
      }
    }
  }

  /**
   * Record a failed login attempt
   * Increments failure counter and locks account if threshold exceeded
   */
  async recordFailedAttempt(
    email: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    const emailKey = this.EMAIL_LOCKOUT_PREFIX + email;
    const ipKey = this.IP_LOCKOUT_PREFIX + ipAddress;

    // Get current lockout info
    let emailLockout = await this.getLockoutInfo(emailKey);
    let ipLockout = await this.getLockoutInfo(ipKey);

    // Initialize if doesn't exist
    if (!emailLockout) {
      emailLockout = {
        attempts: 0,
        lockCount: 0,
        lastAttemptAt: Date.now(),
        ipAddress,
      };
    }

    if (!ipLockout) {
      ipLockout = {
        attempts: 0,
        lockCount: 0,
        lastAttemptAt: Date.now(),
      };
    }

    // Check if attempts are within the time window
    const timeSinceLastAttempt = Date.now() - emailLockout.lastAttemptAt;
    const windowExpired = timeSinceLastAttempt > this.ATTEMPT_WINDOW_MINUTES * 60 * 1000;

    if (windowExpired) {
      // Reset attempts if window expired
      emailLockout.attempts = 1;
      ipLockout.attempts = 1;
    } else {
      // Increment attempts
      emailLockout.attempts++;
      ipLockout.attempts++;
    }

    emailLockout.lastAttemptAt = Date.now();
    ipLockout.lastAttemptAt = Date.now();

    // Check if we should lock the account
    if (emailLockout.attempts >= this.MAX_ATTEMPTS) {
      await this.lockAccount(email, ipAddress, emailLockout.lockCount, userAgent);
      emailLockout.lockCount++;
      emailLockout.attempts = 0; // Reset attempts after locking
    } else {
      // Save updated info
      await this.saveLockoutInfo(emailKey, emailLockout);
    }

    // Lock IP if too many attempts
    if (ipLockout.attempts >= this.MAX_ATTEMPTS * 2) {
      await this.lockIp(ipAddress, ipLockout.lockCount);
      ipLockout.lockCount++;
      ipLockout.attempts = 0;
    } else {
      await this.saveLockoutInfo(ipKey, ipLockout);
    }

    // Log the failed attempt
    await this.logSecurityEvent({
      email,
      ipAddress,
      userAgent,
      event: 'failed_login',
      metadata: {
        attempts: emailLockout.attempts,
        willLockOnNextAttempt: emailLockout.attempts >= this.MAX_ATTEMPTS - 1,
      },
    });

    this.logger.warn(
      `Failed login attempt for ${email} from ${ipAddress}. ` +
      `Attempt ${emailLockout.attempts}/${this.MAX_ATTEMPTS}`
    );
  }

  /**
   * Lock an account for a calculated duration
   */
  private async lockAccount(
    email: string,
    ipAddress: string,
    previousLockCount: number,
    userAgent?: string,
  ): Promise<void> {
    const emailKey = this.EMAIL_LOCKOUT_PREFIX + email;

    // Calculate lockout duration (exponential backoff)
    let lockoutMinutes = this.LOCKOUT_DURATION_MINUTES * Math.pow(this.LOCKOUT_MULTIPLIER, previousLockCount);

    // Cap at max duration
    const maxLockoutMinutes = this.MAX_LOCKOUT_DURATION_HOURS * 60;
    lockoutMinutes = Math.min(lockoutMinutes, maxLockoutMinutes);

    const lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;

    const lockoutInfo: LockoutInfo = {
      attempts: 0,
      lockedUntil,
      lockCount: previousLockCount + 1,
      lastAttemptAt: Date.now(),
      ipAddress,
    };

    // Save to Redis with TTL
    await this.saveLockoutInfo(emailKey, lockoutInfo, lockoutMinutes * 60);

    // Log security event
    await this.logSecurityEvent({
      email,
      ipAddress,
      userAgent,
      event: 'account_locked',
      metadata: {
        lockoutDurationMinutes: lockoutMinutes,
        lockCount: lockoutInfo.lockCount,
        lockedUntil: new Date(lockedUntil).toISOString(),
      },
    });

    // Send email notification
    await this.sendLockoutEmail(email, lockoutMinutes, ipAddress);

    this.logger.warn(
      `Account locked: ${email} from IP ${ipAddress}. ` +
      `Duration: ${lockoutMinutes} minutes. Lock count: ${lockoutInfo.lockCount}`
    );
  }

  /**
   * Lock an IP address
   */
  private async lockIp(ipAddress: string, previousLockCount: number): Promise<void> {
    const ipKey = this.IP_LOCKOUT_PREFIX + ipAddress;

    // Calculate lockout duration (exponential backoff)
    let lockoutMinutes = this.LOCKOUT_DURATION_MINUTES * Math.pow(this.LOCKOUT_MULTIPLIER, previousLockCount);
    const maxLockoutMinutes = this.MAX_LOCKOUT_DURATION_HOURS * 60;
    lockoutMinutes = Math.min(lockoutMinutes, maxLockoutMinutes);

    const lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;

    const lockoutInfo: LockoutInfo = {
      attempts: 0,
      lockedUntil,
      lockCount: previousLockCount + 1,
      lastAttemptAt: Date.now(),
    };

    await this.saveLockoutInfo(ipKey, lockoutInfo, lockoutMinutes * 60);

    this.logger.warn(
      `IP locked: ${ipAddress}. Duration: ${lockoutMinutes} minutes. Lock count: ${lockoutInfo.lockCount}`
    );
  }

  /**
   * Clear lockout on successful login
   */
  async clearLockout(email: string, ipAddress: string): Promise<void> {
    const emailKey = this.EMAIL_LOCKOUT_PREFIX + email;
    const ipKey = this.IP_LOCKOUT_PREFIX + ipAddress;

    const [emailLockout] = await Promise.all([
      this.getLockoutInfo(emailKey),
      this.redisService.del(emailKey),
      this.redisService.del(ipKey),
    ]);

    // Log if there were previous failed attempts
    if (emailLockout && emailLockout.attempts > 0) {
      await this.logSecurityEvent({
        email,
        ipAddress,
        event: 'successful_login_after_failures',
        metadata: {
          previousAttempts: emailLockout.attempts,
        },
      });

      this.logger.log(`Cleared failed attempts for ${email} after successful login`);
    }
  }

  /**
   * Admin function to manually unlock an account
   */
  async adminUnlock(email: string, adminUserId: string): Promise<void> {
    const emailKey = this.EMAIL_LOCKOUT_PREFIX + email;
    const lockoutInfo = await this.getLockoutInfo(emailKey);

    if (!lockoutInfo) {
      return; // Nothing to unlock
    }

    await this.redisService.del(emailKey);

    // Log the admin unlock
    await this.logSecurityEvent({
      email,
      ipAddress: 'admin',
      event: 'account_unlocked',
      metadata: {
        unlockedBy: adminUserId,
        previousLockoutInfo: lockoutInfo,
      },
    });

    // Send notification to user
    await this.sendUnlockEmail(email);

    this.logger.log(`Admin ${adminUserId} unlocked account: ${email}`);
  }

  /**
   * Get lockout information for an email
   */
  async getLockoutStatus(email: string): Promise<{
    isLocked: boolean;
    attempts: number;
    lockedUntil?: Date;
    lockCount: number;
  }> {
    const emailKey = this.EMAIL_LOCKOUT_PREFIX + email;
    const lockoutInfo = await this.getLockoutInfo(emailKey);

    if (!lockoutInfo) {
      return {
        isLocked: false,
        attempts: 0,
        lockCount: 0,
      };
    }

    const isLocked = lockoutInfo.lockedUntil ? lockoutInfo.lockedUntil > Date.now() : false;

    return {
      isLocked,
      attempts: lockoutInfo.attempts,
      lockedUntil: lockoutInfo.lockedUntil ? new Date(lockoutInfo.lockedUntil) : undefined,
      lockCount: lockoutInfo.lockCount,
    };
  }

  /**
   * Get security audit logs for an email
   */
  async getSecurityLogs(email: string, limit: number = 50): Promise<any[]> {
    const logsKey = this.ATTEMPT_LOG_PREFIX + email;
    const logs = await this.redisService.lrange(logsKey, 0, limit - 1);

    return logs.map(log => {
      try {
        return JSON.parse(log);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get lockout info from Redis
   */
  private async getLockoutInfo(key: string): Promise<LockoutInfo | null> {
    return await this.redisService.get<LockoutInfo>(key);
  }

  /**
   * Save lockout info to Redis
   */
  private async saveLockoutInfo(
    key: string,
    info: LockoutInfo,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ATTEMPT_WINDOW_MINUTES * 60;
    await this.redisService.set(key, info, ttl);
  }

  /**
   * Log security event to Redis and optionally to database
   */
  private async logSecurityEvent(log: SecurityAuditLog): Promise<void> {
    const logsKey = this.ATTEMPT_LOG_PREFIX + log.email;

    const logEntry = {
      ...log,
      timestamp: new Date().toISOString(),
    };

    // Add to Redis list (limited to last 100 entries)
    await this.redisService.lpush(logsKey, JSON.stringify(logEntry));

    // Keep only last 100 entries
    const logs = await this.redisService.lrange(logsKey, 0, -1);
    if (logs.length > 100) {
      await this.redisService.del(logsKey);
      const trimmed = logs.slice(0, 100);
      for (const entry of trimmed.reverse()) {
        await this.redisService.lpush(logsKey, entry);
      }
    }

    // Set TTL on logs
    await this.redisService.expire(logsKey, 30 * 24 * 60 * 60); // 30 days

    // Optionally log to database for long-term storage
    if (log.event === 'account_locked' || log.event === 'account_unlocked') {
      try {
        // This would require a SecurityLog model in Prisma
        // For now, we'll just log to console
        this.logger.warn(`Security Event: ${log.event} for ${log.email}`, log.metadata);
      } catch (error) {
        this.logger.error('Failed to log security event to database', error);
      }
    }
  }

  /**
   * Send account lockout email notification
   */
  private async sendLockoutEmail(
    email: string,
    lockoutMinutes: number,
    ipAddress: string,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });

      if (!user) {
        return; // Don't send email if user doesn't exist
      }

      const unlockTime = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      const supportUrl = `${this.configService.get('FRONTEND_URL')}/support`;

      await this.emailService.sendEmail({
        to: email,
        subject: 'Security Alert: Account Temporarily Locked',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Security Alert: Account Locked</h2>

            <p>Hello ${user.name},</p>

            <p>Your account has been temporarily locked due to multiple failed login attempts.</p>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Lockout Duration:</strong> ${lockoutMinutes} minutes</p>
              <p style="margin: 5px 0;"><strong>Unlock Time:</strong> ${unlockTime.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
            </div>

            <h3>What happened?</h3>
            <p>We detected ${this.MAX_ATTEMPTS} failed login attempts to your account. To protect your security, we've temporarily locked your account.</p>

            <h3>What should you do?</h3>
            <ul>
              <li>Wait ${lockoutMinutes} minutes and try logging in again</li>
              <li>Make sure you're using the correct password</li>
              <li>If you forgot your password, use the "Forgot Password" link</li>
              <li>If you didn't attempt to log in, contact our support team immediately</li>
            </ul>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Security Tip:</strong> If you didn't attempt to log in, your password may be compromised. We recommend changing it immediately after the lockout period expires.</p>
            </div>

            <p>If you need immediate assistance, please contact our support team:</p>
            <p><a href="${supportUrl}" style="color: #1976d2;">Contact Support</a></p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated security notification. Please do not reply to this email.
            </p>
          </div>
        `,
      });

      this.logger.log(`Lockout notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send lockout email to ${email}`, error);
      // Don't throw - email failure shouldn't block the lockout
    }
  }

  /**
   * Send account unlock email notification
   */
  private async sendUnlockEmail(email: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });

      if (!user) {
        return;
      }

      const loginUrl = `${this.configService.get('FRONTEND_URL')}/auth/login`;

      await this.emailService.sendEmail({
        to: email,
        subject: 'Account Unlocked',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2e7d32;">Account Unlocked</h2>

            <p>Hello ${user.name},</p>

            <p>Your account has been unlocked by an administrator. You can now log in to your account.</p>

            <p style="margin: 30px 0;">
              <a href="${loginUrl}" style="background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Log In Now
              </a>
            </p>

            <p>If you're still having trouble accessing your account, please use the "Forgot Password" feature or contact our support team.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        `,
      });

      this.logger.log(`Unlock notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send unlock email to ${email}`, error);
    }
  }
}
