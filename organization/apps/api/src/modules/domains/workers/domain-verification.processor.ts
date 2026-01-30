import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as dns from 'dns';
import { promisify } from 'util';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DistributedLockService } from '@/common/redis/lock.service';
import { REDIS_KEYS } from '@/common/redis/keys';
import { QUEUES, DOMAIN_STATUS } from '@/common/queue/queue.constants';
import {
  DomainVerificationJobData,
  DomainVerificationJobResult,
  BatchDomainVerificationJobData,
  BatchDomainVerificationResult,
  VerificationMethod,
  VerificationDetails,
  DnsRecord,
  DnsRecordType,
  DomainNotificationType,
  DOMAIN_VERIFICATION_JOB_NAMES,
  DOMAIN_VERIFICATION_CONFIG,
  formatVerificationToken,
} from './domain-verification.job';

// Promisify DNS methods
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

/**
 * Domain Verification Processor
 *
 * Background worker that verifies custom domain DNS configuration.
 *
 * Features:
 * - Check TXT records for verification token
 * - Check CNAME records for proper setup
 * - Update tenant_domains.status
 * - Retry verification for pending domains
 * - Send notification on verification success/failure
 */
@Injectable()
@Processor(QUEUES.DOMAIN_VERIFICATION)
export class DomainVerificationProcessor {
  private readonly logger = new Logger(DomainVerificationProcessor.name);

  constructor(
    @InjectQueue(QUEUES.DOMAIN_VERIFICATION)
    private readonly verificationQueue: Queue<DomainVerificationJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lockService: DistributedLockService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule verification checks for pending domains every 5 minutes
   */
  @Cron(DOMAIN_VERIFICATION_CONFIG.CHECK_INTERVAL)
  async schedulePendingDomainChecks() {
    this.logger.log('Scheduling verification checks for pending domains');

    // Get all pending domains
    const pendingDomains = await this.prisma.tenantDomain.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        id: true,
        tenantId: true,
        host: true,
        verificationToken: true,
        cnameTarget: true,
      },
    });

    for (const domain of pendingDomains) {
      // Check if already in queue or recently checked
      const cacheKey = REDIS_KEYS.DOMAIN_STATUS(domain.id);
      const recentCheck = await this.redis.get<string>(cacheKey);

      if (recentCheck) {
        this.logger.debug(`Skipping ${domain.host} - recently checked`);
        continue;
      }

      await this.verificationQueue.add(
        DOMAIN_VERIFICATION_JOB_NAMES.VERIFY_SINGLE,
        {
          jobId: `verify:${domain.id}:${Date.now()}`,
          domainId: domain.id,
          tenantId: domain.tenantId,
          domain: domain.host,
          method: VerificationMethod.DNS_TXT,
          verificationToken: domain.verificationToken,
          cnameTarget: domain.cnameTarget,
          triggeredBy: 'scheduler',
        },
        {
          priority: 5,
          delay: Math.random() * 10000, // Random delay up to 10 seconds
        },
      );
    }
  }

  /**
   * Process single domain verification
   */
  @Process(DOMAIN_VERIFICATION_JOB_NAMES.VERIFY_SINGLE)
  async handleVerifySingle(job: Job<DomainVerificationJobData>): Promise<DomainVerificationJobResult> {
    const { jobId, domainId, tenantId, domain, method, verificationToken, cnameTarget } = job.data;
    const startTime = Date.now();

    this.logger.log(`Verifying domain: ${domain} using ${method}`);

    // Acquire lock to prevent concurrent verification
    const lockKey = `domain:verify:${domainId}`;
    const lockResult = await this.lockService.acquireLock(lockKey, {
      ttlSeconds: 60,
      waitTimeMs: 0,
    });

    if (!lockResult.acquired) {
      return {
        success: true,
        jobId,
        domainId,
        domain,
        status: DOMAIN_STATUS.VERIFYING,
        verified: false,
        details: {
          method,
          verifiedAt: new Date().toISOString(),
        },
        durationMs: Date.now() - startTime,
        error: 'Verification already in progress',
      };
    }

    try {
      // Update status to VERIFYING
      await this.updateDomainStatus(domainId, DOMAIN_STATUS.VERIFYING);

      // Cache that we're checking this domain
      await this.redis.set(
        REDIS_KEYS.DOMAIN_STATUS(domainId),
        'checking',
        300, // 5 minutes
      );

      let details: VerificationDetails;
      let verified = false;

      switch (method) {
        case VerificationMethod.DNS_TXT:
          details = await this.verifyTxtRecord(domain, verificationToken);
          verified = details.txtVerification?.found || false;
          break;

        case VerificationMethod.DNS_CNAME:
          details = await this.verifyCnameRecord(
            domain,
            cnameTarget || DOMAIN_VERIFICATION_CONFIG.DEFAULT_CNAME_TARGET,
          );
          verified = details.cnameVerification?.found || false;
          break;

        case VerificationMethod.HTTP_FILE:
          details = await this.verifyHttpFile(domain, verificationToken);
          verified = details.txtVerification?.found || false;
          break;

        case VerificationMethod.META_TAG:
          details = await this.verifyMetaTag(domain, verificationToken);
          verified = details.txtVerification?.found || false;
          break;

        default:
          details = {
            method,
            verifiedAt: new Date().toISOString(),
          };
      }

      // Update domain status
      const newStatus = verified ? DOMAIN_STATUS.VERIFIED : DOMAIN_STATUS.PENDING;
      await this.updateDomainStatus(domainId, newStatus, verified ? new Date() : undefined);

      // Send notification
      let notificationSent = false;
      if (verified) {
        notificationSent = await this.sendNotification(
          domainId,
          tenantId,
          domain,
          DomainNotificationType.VERIFICATION_SUCCESS,
        );
      } else if ((job.data.retryCount || 0) >= DOMAIN_VERIFICATION_CONFIG.MAX_RETRIES) {
        notificationSent = await this.sendNotification(
          domainId,
          tenantId,
          domain,
          DomainNotificationType.VERIFICATION_FAILED,
        );
      }

      // Calculate next retry time
      const retryCount = job.data.retryCount || 0;
      const nextRetryDelay = Math.min(
        DOMAIN_VERIFICATION_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount),
        DOMAIN_VERIFICATION_CONFIG.MAX_RETRY_DELAY,
      );

      return {
        success: true,
        jobId,
        domainId,
        domain,
        status: newStatus,
        verified,
        details,
        durationMs: Date.now() - startTime,
        nextRetryAt: verified
          ? undefined
          : new Date(Date.now() + nextRetryDelay).toISOString(),
        notificationSent,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Domain verification failed for ${domain}: ${errorMessage}`);

      return {
        success: false,
        jobId,
        domainId,
        domain,
        status: DOMAIN_STATUS.PENDING,
        verified: false,
        details: {
          method,
          verifiedAt: new Date().toISOString(),
        },
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    } finally {
      if (lockResult.lockId) {
        await this.lockService.releaseLock(lockKey, lockResult.lockId);
      }
    }
  }

  /**
   * Process batch domain verification
   */
  @Process(DOMAIN_VERIFICATION_JOB_NAMES.VERIFY_BATCH)
  async handleVerifyBatch(job: Job<BatchDomainVerificationJobData>): Promise<BatchDomainVerificationResult> {
    const { batchId, domains } = job.data;
    const startTime = Date.now();
    const results: DomainVerificationJobResult[] = [];

    this.logger.log(`Processing batch verification: ${batchId} with ${domains.length} domains`);

    for (let i = 0; i < domains.length; i++) {
      const result = await this.handleVerifySingle({
        ...job,
        data: domains[i],
      } as unknown as Job<DomainVerificationJobData>);

      results.push(result);
      await job.progress(((i + 1) / domains.length) * 100);
    }

    const verified = results.filter((r) => r.verified).length;
    const failed = results.filter((r) => !r.success).length;
    const pending = results.filter((r) => r.success && !r.verified).length;

    return {
      batchId,
      total: domains.length,
      verified,
      failed,
      pending,
      results,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Process pending domains verification
   */
  @Process(DOMAIN_VERIFICATION_JOB_NAMES.VERIFY_PENDING)
  async handleVerifyPending(job: Job<{ tenantId?: string }>): Promise<{ checked: number; verified: number }> {
    const where: any = {
      status: 'PENDING',
    };

    if (job.data.tenantId) {
      where.tenantId = job.data.tenantId;
    }

    const pendingDomains = await this.prisma.tenantDomain.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        host: true,
        verificationToken: true,
        cnameTarget: true,
      },
    });

    let verified = 0;
    for (const domain of pendingDomains) {
      const result = await this.handleVerifySingle({
        ...job,
        data: {
          jobId: `verify:${domain.id}:${Date.now()}`,
          domainId: domain.id,
          tenantId: domain.tenantId,
          domain: domain.host,
          method: VerificationMethod.DNS_TXT,
          verificationToken: domain.verificationToken,
          cnameTarget: domain.cnameTarget,
          triggeredBy: 'batch',
        },
      } as unknown as Job<DomainVerificationJobData>);

      if (result.verified) {
        verified++;
      }
    }

    return { checked: pendingDomains.length, verified };
  }

  // ==================== Verification Methods ====================

  /**
   * Verify TXT record
   */
  private async verifyTxtRecord(
    domain: string,
    token: string,
  ): Promise<VerificationDetails> {
    const txtHost = `_broxiva-verification.${domain}`;
    const expectedValue = formatVerificationToken(token);

    try {
      const records = await resolveTxt(txtHost);
      const flatRecords = records.flat();

      const found = flatRecords.some(
        (record) => record === expectedValue || record.includes(token),
      );

      return {
        method: VerificationMethod.DNS_TXT,
        dnsRecords: flatRecords.map((value) => ({
          type: DnsRecordType.TXT,
          name: txtHost,
          value,
        })),
        txtVerification: {
          found,
          expectedValue,
          actualValue: flatRecords.find((r) => r.includes(token)),
        },
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`TXT lookup failed for ${txtHost}: ${error}`);
      return {
        method: VerificationMethod.DNS_TXT,
        txtVerification: {
          found: false,
          expectedValue,
        },
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify CNAME record
   */
  private async verifyCnameRecord(
    domain: string,
    expectedTarget: string,
  ): Promise<VerificationDetails> {
    try {
      const records = await resolveCname(domain);

      const found = records.some((record) =>
        record.toLowerCase() === expectedTarget.toLowerCase() ||
        record.toLowerCase().endsWith(`.${expectedTarget.toLowerCase()}`)
      );

      return {
        method: VerificationMethod.DNS_CNAME,
        dnsRecords: records.map((value) => ({
          type: DnsRecordType.CNAME,
          name: domain,
          value,
        })),
        cnameVerification: {
          found,
          expectedTarget,
          actualTarget: records[0],
        },
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`CNAME lookup failed for ${domain}: ${error}`);
      return {
        method: VerificationMethod.DNS_CNAME,
        cnameVerification: {
          found: false,
          expectedTarget,
        },
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify HTTP file
   */
  private async verifyHttpFile(
    domain: string,
    token: string,
  ): Promise<VerificationDetails> {
    const url = `https://${domain}/.well-known/broxiva-verification.txt`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Broxiva-Domain-Verifier/1.0' },
      });

      if (!response.ok) {
        return {
          method: VerificationMethod.HTTP_FILE,
          txtVerification: {
            found: false,
            expectedValue: token,
          },
          verifiedAt: new Date().toISOString(),
        };
      }

      const content = await response.text();
      const found = content.trim() === token || content.includes(token);

      return {
        method: VerificationMethod.HTTP_FILE,
        txtVerification: {
          found,
          expectedValue: token,
          actualValue: content.trim().substring(0, 100),
        },
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`HTTP file verification failed for ${domain}: ${error}`);
      return {
        method: VerificationMethod.HTTP_FILE,
        txtVerification: {
          found: false,
          expectedValue: token,
        },
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify meta tag
   */
  private async verifyMetaTag(
    domain: string,
    token: string,
  ): Promise<VerificationDetails> {
    const url = `https://${domain}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Broxiva-Domain-Verifier/1.0' },
      });

      if (!response.ok) {
        return {
          method: VerificationMethod.META_TAG,
          txtVerification: {
            found: false,
            expectedValue: token,
          },
          verifiedAt: new Date().toISOString(),
        };
      }

      const html = await response.text();

      // Simple regex to find the meta tag
      const metaTagRegex = /<meta[^>]+name=["']broxiva-verification["'][^>]+content=["']([^"']+)["'][^>]*>/i;
      const match = html.match(metaTagRegex);

      const actualValue = match ? match[1] : undefined;
      const found = actualValue === token;

      return {
        method: VerificationMethod.META_TAG,
        txtVerification: {
          found,
          expectedValue: token,
          actualValue,
        },
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`Meta tag verification failed for ${domain}: ${error}`);
      return {
        method: VerificationMethod.META_TAG,
        txtVerification: {
          found: false,
          expectedValue: token,
        },
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Update domain status in database
   */
  private async updateDomainStatus(
    domainId: string,
    status: string,
    verifiedAt?: Date,
  ): Promise<void> {
    await this.prisma.tenantDomain.update({
      where: { id: domainId },
      data: {
        status: status as any,
        verifiedAt,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Send notification about domain verification
   */
  private async sendNotification(
    domainId: string,
    tenantId: string,
    domain: string,
    type: DomainNotificationType,
  ): Promise<boolean> {
    try {
      // Get tenant admin email
      const tenant = await (this.prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: {
          adminEmail: true,
          name: true,
        },
      });

      if (!tenant?.adminEmail) {
        return false;
      }

      // In production, this would send an actual email
      this.logger.log(
        `Would send ${type} notification for ${domain} to ${tenant.adminEmail}`,
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
      return false;
    }
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job<DomainVerificationJobData>) {
    this.logger.debug(`Processing domain verification job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<DomainVerificationJobData>, result: DomainVerificationJobResult) {
    this.logger.log(
      `Domain verification ${job.id} completed: ${result.domain} - ${result.verified ? 'VERIFIED' : 'PENDING'}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<DomainVerificationJobData>, error: Error) {
    this.logger.error(`Domain verification ${job.id} failed: ${error.message}`);
  }
}
