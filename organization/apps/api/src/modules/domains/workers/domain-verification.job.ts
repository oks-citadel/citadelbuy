/**
 * Domain Verification Job Definitions
 * Defines the job data structures and types for domain verification workers
 */

import { DOMAIN_STATUS, DomainStatus } from '@/common/queue/queue.constants';

/**
 * DNS record types to verify
 */
export enum DnsRecordType {
  TXT = 'TXT',
  CNAME = 'CNAME',
  A = 'A',
  AAAA = 'AAAA',
  MX = 'MX',
}

/**
 * Verification method
 */
export enum VerificationMethod {
  /** TXT record verification */
  DNS_TXT = 'dns_txt',
  /** CNAME record verification */
  DNS_CNAME = 'dns_cname',
  /** HTTP file verification */
  HTTP_FILE = 'http_file',
  /** Meta tag verification */
  META_TAG = 'meta_tag',
}

/**
 * Domain verification job data
 */
export interface DomainVerificationJobData {
  /** Job ID */
  jobId: string;
  /** Domain ID */
  domainId: string;
  /** Tenant ID */
  tenantId: string;
  /** Domain name */
  domain: string;
  /** Verification method */
  method: VerificationMethod;
  /** Verification token */
  verificationToken: string;
  /** Expected CNAME target (for CNAME verification) */
  cnameTarget?: string;
  /** Force verification even if recently checked */
  forceVerification?: boolean;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
  /** Correlation ID */
  correlationId?: string;
  /** Triggered by */
  triggeredBy?: string;
  /** Retry count */
  retryCount?: number;
}

/**
 * Domain verification result
 */
export interface DomainVerificationJobResult {
  /** Success status */
  success: boolean;
  /** Job ID */
  jobId: string;
  /** Domain ID */
  domainId: string;
  /** Domain name */
  domain: string;
  /** Verification status */
  status: DomainStatus;
  /** Whether the domain passed verification */
  verified: boolean;
  /** Verification details */
  details: VerificationDetails;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message */
  error?: string;
  /** Next retry time (if applicable) */
  nextRetryAt?: string;
  /** Notification sent */
  notificationSent?: boolean;
}

/**
 * Verification details
 */
export interface VerificationDetails {
  /** Method used */
  method: VerificationMethod;
  /** DNS records found */
  dnsRecords?: DnsRecord[];
  /** TXT verification result */
  txtVerification?: {
    found: boolean;
    expectedValue: string;
    actualValue?: string;
  };
  /** CNAME verification result */
  cnameVerification?: {
    found: boolean;
    expectedTarget: string;
    actualTarget?: string;
  };
  /** SSL verification */
  sslVerification?: {
    valid: boolean;
    issuer?: string;
    expiresAt?: string;
  };
  /** Verification timestamp */
  verifiedAt: string;
}

/**
 * DNS record
 */
export interface DnsRecord {
  /** Record type */
  type: DnsRecordType;
  /** Record name */
  name: string;
  /** Record value */
  value: string;
  /** TTL */
  ttl?: number;
}

/**
 * Batch verification job data
 */
export interface BatchDomainVerificationJobData {
  /** Batch ID */
  batchId: string;
  /** Domain verification jobs */
  domains: DomainVerificationJobData[];
  /** Triggered by */
  triggeredBy?: string;
}

/**
 * Batch verification result
 */
export interface BatchDomainVerificationResult {
  /** Batch ID */
  batchId: string;
  /** Total domains */
  total: number;
  /** Verified domains */
  verified: number;
  /** Failed domains */
  failed: number;
  /** Pending domains */
  pending: number;
  /** Individual results */
  results: DomainVerificationJobResult[];
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Domain verification job names
 */
export const DOMAIN_VERIFICATION_JOB_NAMES = {
  VERIFY_SINGLE: 'verify-single',
  VERIFY_BATCH: 'verify-batch',
  VERIFY_PENDING: 'verify-pending',
  CHECK_SSL: 'check-ssl',
  CLEANUP_EXPIRED: 'cleanup-expired',
  SEND_NOTIFICATION: 'send-notification',
} as const;

/**
 * Domain verification configuration
 */
export const DOMAIN_VERIFICATION_CONFIG = {
  /** DNS lookup timeout in milliseconds */
  DNS_TIMEOUT: 10000,
  /** Maximum retry attempts */
  MAX_RETRIES: 10,
  /** Retry delay base in milliseconds */
  RETRY_DELAY_BASE: 60000, // 1 minute
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY: 3600000, // 1 hour
  /** Verification token prefix */
  TOKEN_PREFIX: 'broxiva-verify',
  /** Default CNAME target */
  DEFAULT_CNAME_TARGET: 'domains.broxiva.com',
  /** Verification check interval for pending domains */
  CHECK_INTERVAL: '*/5 * * * *', // Every 5 minutes
  /** Domain expiry time (days without verification) */
  EXPIRY_DAYS: 7,
  /** SSL check interval */
  SSL_CHECK_INTERVAL: '0 0 * * *', // Daily at midnight
} as const;

/**
 * DNS verification token format
 * Format: broxiva-verify={token}
 */
export function formatVerificationToken(token: string): string {
  return `${DOMAIN_VERIFICATION_CONFIG.TOKEN_PREFIX}=${token}`;
}

/**
 * Generate DNS instructions for domain verification
 */
export function generateDnsInstructions(
  domain: string,
  token: string,
  method: VerificationMethod,
): DomainDnsInstructions {
  switch (method) {
    case VerificationMethod.DNS_TXT:
      return {
        method,
        recordType: DnsRecordType.TXT,
        recordName: `_broxiva-verification.${domain}`,
        recordValue: formatVerificationToken(token),
        instructions: [
          `1. Log in to your DNS provider`,
          `2. Add a new TXT record`,
          `3. Set the name/host to: _broxiva-verification`,
          `4. Set the value to: ${formatVerificationToken(token)}`,
          `5. Save the record and wait for DNS propagation (up to 48 hours)`,
        ],
      };

    case VerificationMethod.DNS_CNAME:
      return {
        method,
        recordType: DnsRecordType.CNAME,
        recordName: domain,
        recordValue: DOMAIN_VERIFICATION_CONFIG.DEFAULT_CNAME_TARGET,
        instructions: [
          `1. Log in to your DNS provider`,
          `2. Add a new CNAME record`,
          `3. Set the name/host to: ${domain}`,
          `4. Set the target to: ${DOMAIN_VERIFICATION_CONFIG.DEFAULT_CNAME_TARGET}`,
          `5. Save the record and wait for DNS propagation (up to 48 hours)`,
        ],
      };

    case VerificationMethod.HTTP_FILE:
      return {
        method,
        recordType: DnsRecordType.TXT,
        recordName: domain,
        recordValue: token,
        instructions: [
          `1. Create a file at: https://${domain}/.well-known/broxiva-verification.txt`,
          `2. Add the following content to the file: ${token}`,
          `3. Ensure the file is publicly accessible`,
        ],
      };

    case VerificationMethod.META_TAG:
      return {
        method,
        recordType: DnsRecordType.TXT,
        recordName: domain,
        recordValue: token,
        instructions: [
          `1. Add the following meta tag to your website's <head> section:`,
          `   <meta name="broxiva-verification" content="${token}">`,
          `2. Ensure the meta tag is present on the homepage`,
        ],
      };
  }
}

/**
 * DNS instructions for domain verification
 */
export interface DomainDnsInstructions {
  method: VerificationMethod;
  recordType: DnsRecordType;
  recordName: string;
  recordValue: string;
  instructions: string[];
}

/**
 * Notification types
 */
export enum DomainNotificationType {
  VERIFICATION_SUCCESS = 'verification_success',
  VERIFICATION_FAILED = 'verification_failed',
  VERIFICATION_PENDING = 'verification_pending',
  SSL_EXPIRING = 'ssl_expiring',
  DOMAIN_EXPIRED = 'domain_expired',
}

/**
 * Domain notification data
 */
export interface DomainNotificationData {
  /** Notification type */
  type: DomainNotificationType;
  /** Domain ID */
  domainId: string;
  /** Tenant ID */
  tenantId: string;
  /** Domain name */
  domain: string;
  /** Recipient email */
  recipientEmail: string;
  /** Additional data */
  data?: Record<string, any>;
}
