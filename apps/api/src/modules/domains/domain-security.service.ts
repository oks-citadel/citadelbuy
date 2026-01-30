import {
  Injectable,
  Logger,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import * as dns from 'dns';
import { promisify } from 'util';
import * as crypto from 'crypto';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

/**
 * Domain Security Service
 *
 * Provides comprehensive security for custom domain management:
 * - Prevents domain hijacking through verification
 * - Enforces rate limits on domain operations
 * - Maintains audit trail of all domain changes
 * - Handles domain transfers between tenants securely
 *
 * SECURITY: Critical for preventing impersonation attacks
 */
@Injectable()
export class DomainSecurityService {
  private readonly logger = new Logger(DomainSecurityService.name);
  private readonly verificationPrefix = '_broxiva-verify.';
  private readonly rateLimitKeyPrefix = 'domain:ratelimit:';
  private readonly domainCooldownPrefix = 'domain:cooldown:';
  private readonly maxDomainsPerDay = 5;
  private readonly cooldownPeriodHours = 24;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Generate a unique verification token for domain ownership
   */
  generateVerificationToken(organizationId: string, domain: string): string {
    const secret = this.configService.get<string>('DOMAIN_VERIFICATION_SECRET', 'broxiva-secret');
    const timestamp = Math.floor(Date.now() / 1000);

    // Create a deterministic but time-bound token
    const payload = `${organizationId}:${domain}:${Math.floor(timestamp / 3600)}`; // Valid for ~1 hour
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .substring(0, 32);

    return `broxiva-verification=${hash}`;
  }

  /**
   * Check if domain is already active for another tenant
   */
  async checkDomainAvailability(
    domain: string,
    requestingOrganizationId: string,
  ): Promise<{
    available: boolean;
    reason?: string;
    existingOrganizationId?: string;
  }> {
    // Normalize domain
    const normalizedDomain = this.normalizeDomain(domain);

    // Check if domain is already registered
    const existingDomain = await (this.prisma as any).customDomain.findFirst({
      where: {
        domain: normalizedDomain,
        status: { in: ['ACTIVE', 'PENDING', 'VERIFYING'] },
      },
      select: {
        organizationId: true,
        status: true,
      },
    });

    if (existingDomain) {
      if (existingDomain.organizationId === requestingOrganizationId) {
        return {
          available: true,
          reason: 'Domain already belongs to your organization',
        };
      }

      this.logger.warn(
        `Domain hijacking attempt detected: ${normalizedDomain} ` +
        `requested by ${requestingOrganizationId}, owned by ${existingDomain.organizationId}`,
      );

      // Log security event
      await this.logDomainSecurityEvent({
        type: 'DOMAIN_HIJACK_ATTEMPT',
        domain: normalizedDomain,
        organizationId: requestingOrganizationId,
        requestingOrganizationId,
        existingOrganizationId: existingDomain.organizationId,
      });

      return {
        available: false,
        reason: 'Domain is already registered to another organization',
        existingOrganizationId: existingDomain.organizationId,
      };
    }

    return { available: true };
  }

  /**
   * Verify domain ownership via TXT record
   */
  async verifyTxtRecord(
    domain: string,
    organizationId: string,
    expectedToken?: string,
  ): Promise<{
    verified: boolean;
    error?: string;
  }> {
    const normalizedDomain = this.normalizeDomain(domain);
    const verificationDomain = `${this.verificationPrefix}${normalizedDomain}`;
    const token = expectedToken || this.generateVerificationToken(organizationId, normalizedDomain);

    try {
      const records = await resolveTxt(verificationDomain);
      const flatRecords = records.flat();

      const found = flatRecords.some((record) =>
        record.includes('broxiva-verification=') && record.includes(token.split('=')[1]),
      );

      if (found) {
        this.logger.log(`TXT verification successful for ${normalizedDomain}`);
        return { verified: true };
      }

      return {
        verified: false,
        error: `TXT record not found. Expected: ${token} at ${verificationDomain}`,
      };
    } catch (error) {
      const dnsError = error as NodeJS.ErrnoException;
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return {
          verified: false,
          error: `No TXT record found at ${verificationDomain}`,
        };
      }

      this.logger.error(`DNS lookup error for ${verificationDomain}`, error);
      return {
        verified: false,
        error: 'DNS lookup failed. Please try again later.',
      };
    }
  }

  /**
   * Verify domain ownership via CNAME record
   */
  async verifyCnameRecord(
    domain: string,
    _organizationId: string,
  ): Promise<{
    verified: boolean;
    error?: string;
  }> {
    const normalizedDomain = this.normalizeDomain(domain);
    const expectedTarget = this.configService.get<string>('CNAME_TARGET', 'domains.broxiva.com');

    try {
      const records = await resolveCname(normalizedDomain);

      const found = records.some((record) =>
        record.toLowerCase() === expectedTarget.toLowerCase(),
      );

      if (found) {
        this.logger.log(`CNAME verification successful for ${normalizedDomain}`);
        return { verified: true };
      }

      return {
        verified: false,
        error: `CNAME record should point to ${expectedTarget}`,
      };
    } catch (error) {
      const dnsError = error as NodeJS.ErrnoException;
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return {
          verified: false,
          error: `No CNAME record found for ${normalizedDomain}`,
        };
      }

      this.logger.error(`DNS lookup error for ${normalizedDomain}`, error);
      return {
        verified: false,
        error: 'DNS lookup failed. Please try again later.',
      };
    }
  }

  /**
   * Full domain verification (TXT + CNAME)
   */
  async verifyDomain(
    domain: string,
    organizationId: string,
  ): Promise<{
    verified: boolean;
    txtVerified: boolean;
    cnameVerified: boolean;
    errors: string[];
  }> {
    // Check rate limit
    const rateLimitOk = await this.checkRateLimit(organizationId, 'verify');
    if (!rateLimitOk) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.maxDomainsPerDay} verification attempts per day.`,
      );
    }

    const [txtResult, cnameResult] = await Promise.all([
      this.verifyTxtRecord(domain, organizationId),
      this.verifyCnameRecord(domain, organizationId),
    ]);

    const errors: string[] = [];
    if (!txtResult.verified && txtResult.error) errors.push(txtResult.error);
    if (!cnameResult.verified && cnameResult.error) errors.push(cnameResult.error);

    // Both verifications must pass
    const verified = txtResult.verified && cnameResult.verified;

    // Log the verification attempt
    await this.logDomainSecurityEvent({
      type: verified ? 'DOMAIN_VERIFIED' : 'DOMAIN_VERIFICATION_FAILED',
      domain,
      organizationId,
      details: { txtVerified: txtResult.verified, cnameVerified: cnameResult.verified, errors },
    });

    return {
      verified,
      txtVerified: txtResult.verified,
      cnameVerified: cnameResult.verified,
      errors,
    };
  }

  /**
   * Initiate domain transfer between organizations
   */
  async initiateDomainTransfer(
    domain: string,
    fromOrganizationId: string,
    toOrganizationId: string,
    initiatedBy: string,
  ): Promise<{
    transferId: string;
    expiresAt: Date;
  }> {
    const normalizedDomain = this.normalizeDomain(domain);

    // Verify the domain belongs to the source organization
    const existingDomain = await (this.prisma as any).customDomain.findFirst({
      where: {
        domain: normalizedDomain,
        organizationId: fromOrganizationId,
        status: 'ACTIVE',
      },
    });

    if (!existingDomain) {
      throw new ForbiddenException('Domain not found or not owned by your organization');
    }

    // Check for existing pending transfers
    const pendingTransfer = await (this.prisma as any).domainTransfer.findFirst({
      where: {
        domainId: existingDomain.id,
        status: 'PENDING',
      },
    });

    if (pendingTransfer) {
      throw new ConflictException('A transfer is already pending for this domain');
    }

    // Create transfer record
    const transferId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await (this.prisma as any).domainTransfer.create({
      data: {
        id: transferId,
        domainId: existingDomain.id,
        fromOrganizationId,
        toOrganizationId,
        initiatedBy,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Log security event
    await this.logDomainSecurityEvent({
      type: 'DOMAIN_TRANSFER_INITIATED',
      domain: normalizedDomain,
      organizationId: fromOrganizationId,
      details: {
        toOrganizationId,
        transferId,
        initiatedBy,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return { transferId, expiresAt };
  }

  /**
   * Complete domain transfer (requires re-verification)
   */
  async completeDomainTransfer(
    transferId: string,
    toOrganizationId: string,
    confirmedBy: string,
  ): Promise<void> {
    const transfer = await (this.prisma as any).domainTransfer.findUnique({
      where: { id: transferId },
      include: { domain: true },
    });

    if (!transfer) {
      throw new BadRequestException('Transfer not found');
    }

    if (transfer.toOrganizationId !== toOrganizationId) {
      throw new ForbiddenException('You are not authorized to complete this transfer');
    }

    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Transfer is ${transfer.status.toLowerCase()}`);
    }

    if (transfer.expiresAt < new Date()) {
      await (this.prisma as any).domainTransfer.update({
        where: { id: transferId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Transfer has expired');
    }

    // Require re-verification from new owner
    const verification = await this.verifyDomain(transfer.domain.domain, toOrganizationId);

    if (!verification.verified) {
      throw new BadRequestException(
        'Domain verification failed. Please configure DNS records before accepting transfer.',
      );
    }

    // Apply cooldown period
    await this.applyCooldown(transfer.domain.domain);

    // Complete the transfer
    await this.prisma.$transaction([
      (this.prisma as any).customDomain.update({
        where: { id: transfer.domainId },
        data: {
          organizationId: toOrganizationId,
          verifiedAt: new Date(),
        },
      }),
      (this.prisma as any).domainTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: confirmedBy,
        },
      }),
    ]);

    // Log security event
    await this.logDomainSecurityEvent({
      type: 'DOMAIN_TRANSFER_COMPLETED',
      domain: transfer.domain.domain,
      organizationId: toOrganizationId,
      details: {
        fromOrganizationId: transfer.fromOrganizationId,
        transferId,
        confirmedBy,
      },
    });
  }

  /**
   * Check and enforce rate limits for domain operations
   */
  async checkRateLimit(
    organizationId: string,
    operation: 'add' | 'verify' | 'transfer',
  ): Promise<boolean> {
    const key = `${this.rateLimitKeyPrefix}${organizationId}:${operation}`;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${key}:${today}`;

    try {
      const count = await this.redisService.incr(dailyKey);

      if (count === 1) {
        // Set expiry for the key (24 hours)
        await this.redisService.expire(dailyKey, 86400);
      }

      if (count > this.maxDomainsPerDay) {
        this.logger.warn(
          `Rate limit exceeded for ${organizationId} on ${operation}: ${count}/${this.maxDomainsPerDay}`,
        );

        await this.logDomainSecurityEvent({
          type: 'DOMAIN_RATE_LIMIT_EXCEEDED',
          domain: '',
          organizationId,
          details: { operation, count, limit: this.maxDomainsPerDay },
        });

        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking rate limit', error);
      // Fail open to not block legitimate operations
      return true;
    }
  }

  /**
   * Apply cooldown period after domain changes
   */
  private async applyCooldown(domain: string): Promise<void> {
    const key = `${this.domainCooldownPrefix}${this.normalizeDomain(domain)}`;
    const ttlSeconds = this.cooldownPeriodHours * 60 * 60;

    try {
      await this.redisService.set(key, new Date().toISOString(), ttlSeconds);
    } catch (error) {
      this.logger.error('Error applying cooldown', error);
    }
  }

  /**
   * Check if domain is in cooldown period
   */
  async isInCooldown(domain: string): Promise<{
    inCooldown: boolean;
    remainingSeconds?: number;
  }> {
    const key = `${this.domainCooldownPrefix}${this.normalizeDomain(domain)}`;

    try {
      const value = await this.redisService.get(key);

      if (!value) {
        return { inCooldown: false };
      }

      const ttl = await this.redisService.ttl(key);
      return { inCooldown: true, remainingSeconds: ttl };
    } catch (error) {
      this.logger.error('Error checking cooldown', error);
      return { inCooldown: false };
    }
  }

  /**
   * Log domain security event to audit trail
   */
  private async logDomainSecurityEvent(event: {
    type: string;
    domain: string;
    organizationId: string;
    requestingOrganizationId?: string;
    existingOrganizationId?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const traceId = crypto.randomUUID();

    try {
      await this.prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          action: event.type,
          resource: `DOMAIN:${event.domain}`,
          activityType: 'SECURITY' as any,
          metadata: {
            traceId,
            organizationId: event.organizationId,
            ...event.details,
            requestingOrganizationId: event.requestingOrganizationId,
            existingOrganizationId: event.existingOrganizationId,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date(),
        },
      });

      // Also log to structured logger for real-time monitoring
      this.logger.log({
        message: `Domain security event: ${event.type}`,
        traceId,
        eventType: event.type,
        domain: event.domain,
        organizationId: event.organizationId,
        ...event.details,
      });
    } catch (error) {
      this.logger.error('Failed to log domain security event', error);
    }
  }

  /**
   * Normalize domain name for consistent comparison
   */
  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
  }

  /**
   * Get domain security status
   */
  async getDomainSecurityStatus(
    domain: string,
    organizationId: string,
  ): Promise<{
    isVerified: boolean;
    isInCooldown: boolean;
    cooldownRemainingSeconds?: number;
    recentSecurityEvents: Array<{
      type: string;
      timestamp: Date;
    }>;
  }> {
    const normalizedDomain = this.normalizeDomain(domain);

    const [domainRecord, cooldownStatus, recentEvents] = await Promise.all([
      (this.prisma as any).customDomain.findFirst({
        where: {
          domain: normalizedDomain,
          organizationId,
        },
        select: {
          status: true,
          verifiedAt: true,
        },
      }),
      this.isInCooldown(normalizedDomain),
      this.prisma.auditLog.findMany({
        where: {
          resource: `DOMAIN:${normalizedDomain}`,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          action: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      isVerified: domainRecord?.status === 'ACTIVE' && !!domainRecord.verifiedAt,
      isInCooldown: cooldownStatus.inCooldown,
      cooldownRemainingSeconds: cooldownStatus.remainingSeconds,
      recentSecurityEvents: recentEvents.map((e) => ({
        type: e.action,
        timestamp: e.createdAt,
      })),
    };
  }
}
