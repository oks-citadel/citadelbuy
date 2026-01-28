import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MFA_ENFORCEMENT } from '../../common/constants';

/**
 * MFA Enforcement Status
 * Describes the current MFA status for a user with a role that requires MFA
 */
export interface MfaEnforcementStatus {
  /** Whether MFA is required for this user's role */
  mfaRequired: boolean;
  /** Whether MFA is currently enabled for this user */
  mfaEnabled: boolean;
  /** Whether the user is still within the grace period */
  withinGracePeriod: boolean;
  /** Number of days remaining in grace period (0 if expired or MFA enabled) */
  gracePeriodDaysRemaining: number;
  /** Whether the user can proceed without MFA (MFA enabled OR within grace period) */
  canProceed: boolean;
  /** Action required by the user */
  actionRequired: 'none' | 'setup_mfa' | 'setup_mfa_urgent' | 'mfa_blocked';
  /** Human-readable message */
  message: string;
}

/**
 * MFA Login Check Result
 * Used during login to determine if additional MFA steps are needed
 */
export interface MfaLoginCheckResult {
  /** Whether user can proceed with login */
  canLogin: boolean;
  /** Whether MFA verification is required before granting full access */
  requiresMfaVerification: boolean;
  /** Whether user needs to set up MFA */
  requiresMfaSetup: boolean;
  /** Whether grace period has expired (blocking login if MFA not set up) */
  gracePeriodExpired: boolean;
  /** Error code if login is blocked */
  errorCode?: string;
  /** Human-readable message */
  message: string;
}

@Injectable()
export class MfaEnforcementService {
  private readonly logger = new Logger(MfaEnforcementService.name);
  private readonly requiredRoles: readonly string[];
  private readonly gracePeriodMs: number;
  private readonly gracePeriodDays: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Allow configuration override via environment variables
    const envRequiredRoles = this.configService.get<string>('MFA_REQUIRED_ROLES');
    this.requiredRoles = envRequiredRoles
      ? envRequiredRoles.split(',').map(r => r.trim().toUpperCase())
      : MFA_ENFORCEMENT.REQUIRED_ROLES;

    const envGracePeriodDays = this.configService.get<number>('MFA_GRACE_PERIOD_DAYS');
    this.gracePeriodDays = envGracePeriodDays ?? MFA_ENFORCEMENT.GRACE_PERIOD_DAYS;
    this.gracePeriodMs = this.gracePeriodDays * 24 * 60 * 60 * 1000;

    this.logger.log(`MFA enforcement initialized - Required roles: ${this.requiredRoles.join(', ')}, Grace period: ${this.gracePeriodDays} days`);
  }

  /**
   * Check if a role requires MFA
   */
  roleRequiresMfa(role: string): boolean {
    return this.requiredRoles.includes(role.toUpperCase());
  }

  /**
   * Get the list of roles that require MFA
   */
  getRequiredRoles(): readonly string[] {
    return this.requiredRoles;
  }

  /**
   * Get grace period in days
   */
  getGracePeriodDays(): number {
    return this.gracePeriodDays;
  }

  /**
   * Calculate grace period remaining for a user based on their creation date
   */
  calculateGracePeriodRemaining(userCreatedAt: Date): {
    withinGracePeriod: boolean;
    daysRemaining: number;
    msRemaining: number;
  } {
    const now = Date.now();
    const createdAtMs = userCreatedAt.getTime();
    const gracePeriodEndMs = createdAtMs + this.gracePeriodMs;
    const msRemaining = Math.max(0, gracePeriodEndMs - now);
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    return {
      withinGracePeriod: msRemaining > 0,
      daysRemaining,
      msRemaining,
    };
  }

  /**
   * Check MFA status for a user
   * This is the main method to determine a user's MFA enforcement status
   */
  async checkMfaStatus(userId: string): Promise<MfaEnforcementStatus> {
    // Get user with MFA info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userMfa: true },
    });

    if (!user) {
      return {
        mfaRequired: false,
        mfaEnabled: false,
        withinGracePeriod: false,
        gracePeriodDaysRemaining: 0,
        canProceed: false,
        actionRequired: 'mfa_blocked',
        message: 'User not found',
      };
    }

    const mfaRequired = this.roleRequiresMfa(user.role);
    const mfaEnabled = user.userMfa?.enabled ?? false;

    // If MFA is not required for this role, user can proceed
    if (!mfaRequired) {
      return {
        mfaRequired: false,
        mfaEnabled,
        withinGracePeriod: true,
        gracePeriodDaysRemaining: 0,
        canProceed: true,
        actionRequired: 'none',
        message: 'MFA is optional for your role',
      };
    }

    // MFA is required - check if enabled
    if (mfaEnabled) {
      return {
        mfaRequired: true,
        mfaEnabled: true,
        withinGracePeriod: true,
        gracePeriodDaysRemaining: 0,
        canProceed: true,
        actionRequired: 'none',
        message: 'MFA is enabled',
      };
    }

    // MFA is required but not enabled - check grace period
    const gracePeriod = this.calculateGracePeriodRemaining(user.createdAt);

    if (gracePeriod.withinGracePeriod) {
      // User is within grace period
      const urgentThreshold = 2; // Last 2 days = urgent
      const actionRequired = gracePeriod.daysRemaining <= urgentThreshold
        ? 'setup_mfa_urgent'
        : 'setup_mfa';

      return {
        mfaRequired: true,
        mfaEnabled: false,
        withinGracePeriod: true,
        gracePeriodDaysRemaining: gracePeriod.daysRemaining,
        canProceed: true,
        actionRequired,
        message: gracePeriod.daysRemaining <= urgentThreshold
          ? `URGENT: You have ${gracePeriod.daysRemaining} day(s) left to set up MFA. Your account will be restricted after the grace period expires.`
          : `Please set up MFA within ${gracePeriod.daysRemaining} days. MFA is required for ${user.role} accounts.`,
      };
    }

    // Grace period expired - block access until MFA is set up
    return {
      mfaRequired: true,
      mfaEnabled: false,
      withinGracePeriod: false,
      gracePeriodDaysRemaining: 0,
      canProceed: false,
      actionRequired: 'mfa_blocked',
      message: 'Your grace period has expired. You must set up MFA to continue using your account.',
    };
  }

  /**
   * Check MFA requirements during login
   * Returns whether user can login and what additional steps are required
   */
  async checkLoginMfaRequirements(
    userId: string,
    userRole: string,
    userCreatedAt: Date,
  ): Promise<MfaLoginCheckResult> {
    // Check if role requires MFA
    if (!this.roleRequiresMfa(userRole)) {
      return {
        canLogin: true,
        requiresMfaVerification: false,
        requiresMfaSetup: false,
        gracePeriodExpired: false,
        message: 'Login successful',
      };
    }

    // Get MFA status
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    const mfaEnabled = mfa?.enabled ?? false;

    // If MFA is enabled, require verification
    if (mfaEnabled) {
      return {
        canLogin: true,
        requiresMfaVerification: true,
        requiresMfaSetup: false,
        gracePeriodExpired: false,
        message: 'MFA verification required',
      };
    }

    // MFA not enabled - check grace period
    const gracePeriod = this.calculateGracePeriodRemaining(userCreatedAt);

    if (gracePeriod.withinGracePeriod) {
      // Allow login but notify about MFA requirement
      return {
        canLogin: true,
        requiresMfaVerification: false,
        requiresMfaSetup: true,
        gracePeriodExpired: false,
        message: `Please set up MFA within ${gracePeriod.daysRemaining} days. MFA is required for ${userRole} accounts.`,
      };
    }

    // Grace period expired - block login
    this.logger.warn(`Login blocked for user ${userId} - MFA grace period expired`);
    return {
      canLogin: false,
      requiresMfaVerification: false,
      requiresMfaSetup: true,
      gracePeriodExpired: true,
      errorCode: MFA_ENFORCEMENT.ERROR_CODES.MFA_GRACE_PERIOD_EXPIRED,
      message: 'Your MFA grace period has expired. Please contact support or use the MFA setup flow to regain access.',
    };
  }

  /**
   * Check if user can access protected resources (for use in guards)
   * This is a quick check that can be used in route guards
   */
  async canAccessProtectedResource(userId: string, userRole: string): Promise<{
    allowed: boolean;
    reason?: string;
    errorCode?: string;
  }> {
    // If role doesn't require MFA, allow access
    if (!this.roleRequiresMfa(userRole)) {
      return { allowed: true };
    }

    // Get user with MFA status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userMfa: true },
    });

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      };
    }

    // If MFA is enabled, allow access
    if (user.userMfa?.enabled) {
      return { allowed: true };
    }

    // Check grace period
    const gracePeriod = this.calculateGracePeriodRemaining(user.createdAt);

    if (gracePeriod.withinGracePeriod) {
      // Within grace period - allow but could add header warning
      return { allowed: true };
    }

    // Grace period expired and MFA not enabled - block
    return {
      allowed: false,
      reason: 'MFA setup required. Grace period has expired.',
      errorCode: MFA_ENFORCEMENT.ERROR_CODES.MFA_GRACE_PERIOD_EXPIRED,
    };
  }

  /**
   * Get all users with expired grace periods who haven't set up MFA
   * Useful for admin dashboards and automated reminders
   */
  async getUsersWithExpiredGracePeriod(): Promise<Array<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    daysOverdue: number;
  }>> {
    const gracePeriodCutoff = new Date(Date.now() - this.gracePeriodMs);

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: this.requiredRoles as any[] },
        createdAt: { lt: gracePeriodCutoff },
        OR: [
          { userMfa: null },
          { userMfa: { enabled: false } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return users.map(user => ({
      ...user,
      daysOverdue: Math.floor((Date.now() - user.createdAt.getTime() - this.gracePeriodMs) / (24 * 60 * 60 * 1000)),
    }));
  }

  /**
   * Get all users approaching grace period expiration
   * Useful for sending reminder emails
   */
  async getUsersApproachingGracePeriodExpiration(withinDays: number = 2): Promise<Array<{
    id: string;
    email: string;
    role: string;
    createdAt: Date;
    daysRemaining: number;
  }>> {
    const now = Date.now();
    const gracePeriodCutoff = new Date(now - this.gracePeriodMs);
    const approachingCutoff = new Date(now - this.gracePeriodMs + (withinDays * 24 * 60 * 60 * 1000));

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: this.requiredRoles as any[] },
        createdAt: {
          gt: gracePeriodCutoff,
          lt: approachingCutoff,
        },
        OR: [
          { userMfa: null },
          { userMfa: { enabled: false } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return users.map(user => {
      const gracePeriod = this.calculateGracePeriodRemaining(user.createdAt);
      return {
        ...user,
        daysRemaining: gracePeriod.daysRemaining,
      };
    });
  }

  // ==================== Trusted Device Management ====================

  /**
   * Check if trusted devices are enabled via configuration
   */
  isTrustedDevicesEnabled(): boolean {
    return this.configService.get<string>('MFA_ENABLE_TRUSTED_DEVICES') !== 'false';
  }

  /**
   * Get the configured trusted device duration in days
   */
  getTrustedDeviceDays(): number {
    return this.configService.get<number>('MFA_TRUSTED_DEVICE_DAYS') || 30;
  }

  /**
   * Clean up expired trusted devices for all users
   * Useful for scheduled cleanup jobs
   */
  async cleanupExpiredTrustedDevices(): Promise<{ deletedCount: number }> {
    const result = await this.prisma.trustedDevice.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired/inactive trusted devices`);
    }

    return { deletedCount: result.count };
  }

  /**
   * Get trusted device count for a user
   */
  async getTrustedDeviceCount(userId: string): Promise<number> {
    return this.prisma.trustedDevice.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Check if user has too many trusted devices (security concern)
   * Default limit is 10 devices
   */
  async hasTooManyTrustedDevices(userId: string, limit: number = 10): Promise<boolean> {
    const count = await this.getTrustedDeviceCount(userId);
    return count >= limit;
  }

  /**
   * Revoke oldest trusted device for a user (when limit is reached)
   */
  async revokeOldestTrustedDevice(userId: string): Promise<void> {
    const oldestDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastUsedAt: 'asc' },
    });

    if (oldestDevice) {
      await this.prisma.trustedDevice.update({
        where: { id: oldestDevice.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokeReason: 'Replaced by new trusted device (limit reached)',
        },
      });

      this.logger.log(`Revoked oldest trusted device for user ${userId}: ${oldestDevice.deviceId}`);
    }
  }

  /**
   * Get MFA enforcement settings (from database or defaults)
   */
  async getMfaEnforcementSettings(organizationId?: string): Promise<{
    enforceForAllUsers: boolean;
    enforceForRoles: string[];
    enforceForLogin: boolean;
    enforceForPayment: boolean;
    paymentThreshold: number;
    gracePeriodEnabled: boolean;
    gracePeriodDays: number;
  }> {
    // Try to get settings from database
    const dbSettings = await this.prisma.mfaEnforcementSettings.findFirst({
      where: {
        OR: [
          { organizationId },
          { organizationId: null }, // Global settings
        ],
      },
      orderBy: { organizationId: 'desc' }, // Prefer organization-specific settings
    });

    if (dbSettings) {
      return {
        enforceForAllUsers: dbSettings.enforceForAllUsers,
        enforceForRoles: dbSettings.enforceForRoles,
        enforceForLogin: dbSettings.enforceForLogin,
        enforceForPayment: dbSettings.enforceForPayment,
        paymentThreshold: dbSettings.paymentThreshold,
        gracePeriodEnabled: dbSettings.gracePeriodEnabled,
        gracePeriodDays: dbSettings.gracePeriodDays,
      };
    }

    // Return defaults from constants/environment
    return {
      enforceForAllUsers: false,
      enforceForRoles: [...this.requiredRoles],
      enforceForLogin: true,
      enforceForPayment: true,
      paymentThreshold: 100.00,
      gracePeriodEnabled: true,
      gracePeriodDays: this.gracePeriodDays,
    };
  }

  /**
   * Check if MFA is required for a payment of a given amount
   */
  async isMfaRequiredForPayment(userId: string, amount: number): Promise<boolean> {
    const settings = await this.getMfaEnforcementSettings();

    if (!settings.enforceForPayment) {
      return false;
    }

    if (amount < settings.paymentThreshold) {
      return false;
    }

    // Get user role and check if MFA is required
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userMfa: true },
    });

    if (!user) {
      return true; // Require MFA if user not found (security)
    }

    // If user already has MFA enabled and verified, no need to re-verify
    // unless this is a high-risk transaction
    if (user.userMfa?.enabled) {
      // For very high amounts, always require step-up MFA
      const highRiskThreshold = settings.paymentThreshold * 10; // 10x the threshold
      return amount >= highRiskThreshold;
    }

    return true; // User without MFA should be required to set it up
  }
}
