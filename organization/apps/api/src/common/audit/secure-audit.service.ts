import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Audit Event Types for security-relevant operations
 */
export enum AuditEventType {
  // Authentication Events
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',
  AUTH_MFA_ENABLED = 'AUTH_MFA_ENABLED',
  AUTH_MFA_DISABLED = 'AUTH_MFA_DISABLED',
  AUTH_MFA_VERIFIED = 'AUTH_MFA_VERIFIED',
  AUTH_MFA_FAILED = 'AUTH_MFA_FAILED',
  AUTH_PASSWORD_CHANGED = 'AUTH_PASSWORD_CHANGED',
  AUTH_PASSWORD_RESET = 'AUTH_PASSWORD_RESET',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_UNLOCKED = 'AUTH_ACCOUNT_UNLOCKED',

  // Authorization Events
  AUTHZ_ACCESS_DENIED = 'AUTHZ_ACCESS_DENIED',
  AUTHZ_ROLE_CHANGED = 'AUTHZ_ROLE_CHANGED',
  AUTHZ_PERMISSION_CHANGED = 'AUTHZ_PERMISSION_CHANGED',
  AUTHZ_IMPERSONATION_START = 'AUTHZ_IMPERSONATION_START',
  AUTHZ_IMPERSONATION_END = 'AUTHZ_IMPERSONATION_END',

  // Tenant Events
  TENANT_CREATED = 'TENANT_CREATED',
  TENANT_UPDATED = 'TENANT_UPDATED',
  TENANT_DELETED = 'TENANT_DELETED',
  TENANT_CROSS_ACCESS_ATTEMPT = 'TENANT_CROSS_ACCESS_ATTEMPT',

  // Domain Events
  DOMAIN_ADDED = 'DOMAIN_ADDED',
  DOMAIN_VERIFIED = 'DOMAIN_VERIFIED',
  DOMAIN_REMOVED = 'DOMAIN_REMOVED',
  DOMAIN_TRANSFER_INITIATED = 'DOMAIN_TRANSFER_INITIATED',
  DOMAIN_TRANSFER_COMPLETED = 'DOMAIN_TRANSFER_COMPLETED',
  DOMAIN_HIJACK_ATTEMPT = 'DOMAIN_HIJACK_ATTEMPT',

  // Data Access Events
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_COMPLETED = 'DATA_EXPORT_COMPLETED',
  DATA_DELETION_REQUESTED = 'DATA_DELETION_REQUESTED',
  DATA_DELETION_COMPLETED = 'DATA_DELETION_COMPLETED',
  PII_ACCESSED = 'PII_ACCESSED',
  SENSITIVE_DATA_MODIFIED = 'SENSITIVE_DATA_MODIFIED',

  // API Security Events
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  API_SUSPICIOUS_ACTIVITY = 'API_SUSPICIOUS_ACTIVITY',
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_REPLAY_DETECTED = 'WEBHOOK_REPLAY_DETECTED',

  // Admin Events
  ADMIN_ACTION = 'ADMIN_ACTION',
  ADMIN_SETTINGS_CHANGED = 'ADMIN_SETTINGS_CHANGED',
  ADMIN_USER_CREATED = 'ADMIN_USER_CREATED',
  ADMIN_USER_DELETED = 'ADMIN_USER_DELETED',

  // Financial Events
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  SUBSCRIPTION_CHANGED = 'SUBSCRIPTION_CHANGED',
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Secure Audit Service
 *
 * Provides tamper-evident audit logging for all security-relevant operations.
 *
 * SECURITY REQUIREMENTS:
 * - All sensitive operations MUST be logged
 * - NO secrets or credentials in log output
 * - Trace ID for correlation across services
 * - Structured JSON format for SIEM integration
 * - Tamper-evident storage with hash chain
 */
@Injectable()
export class SecureAuditService implements OnModuleInit {
  private readonly logger = new Logger(SecureAuditService.name);
  private readonly secretPatterns: RegExp[];
  private lastAuditHash: string = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Patterns to detect and redact secrets
    this.secretPatterns = [
      // API keys
      /sk_live_[a-zA-Z0-9]{24,}/g,
      /sk_test_[a-zA-Z0-9]{24,}/g,
      /pk_live_[a-zA-Z0-9]{24,}/g,
      /pk_test_[a-zA-Z0-9]{24,}/g,
      // AWS credentials
      /AKIA[A-Z0-9]{16}/g,
      /[a-zA-Z0-9/+=]{40}/g, // AWS secret key pattern
      // JWT tokens
      /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      // Generic secrets
      /password['":\s]*['"]\s*[^'"]{8,}/gi,
      /secret['":\s]*['"]\s*[^'"]{8,}/gi,
      /api[_-]?key['":\s]*['"]\s*[^'"]{8,}/gi,
      // Credit card numbers (basic pattern)
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      // Social security numbers
      /\b\d{3}-\d{2}-\d{4}\b/g,
    ];
  }

  async onModuleInit() {
    // Initialize hash chain from last audit entry
    const lastEntry = await this.prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { integrityHash: true },
    });

    this.lastAuditHash = lastEntry?.integrityHash || this.generateInitialHash();
  }

  /**
   * Log an audit event
   *
   * This is the main entry point for audit logging.
   * All security-relevant operations should call this method.
   */
  async logEvent(event: AuditEvent): Promise<string> {
    const traceId = event.traceId || this.generateTraceId();
    const timestamp = new Date();

    // Sanitize metadata to remove any secrets
    const sanitizedMetadata = this.sanitizeData(event.metadata || {});

    // Create hash for tamper evidence
    const contentHash = this.createContentHash({
      ...event,
      metadata: sanitizedMetadata,
      timestamp: timestamp.toISOString(),
      previousHash: this.lastAuditHash,
    });

    // Calculate integrity hash (chain link)
    const integrityHash = this.createIntegrityHash(this.lastAuditHash, contentHash);

    // Store audit entry
    const auditEntry = await this.prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        organizationId: event.organizationId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: event.action,
        outcome: event.outcome,
        ipAddress: event.ipAddress ? this.hashIpAddress(event.ipAddress) : undefined,
        userAgent: event.userAgent?.substring(0, 500), // Truncate long user agents
        metadata: sanitizedMetadata as any,
        traceId,
        contentHash,
        integrityHash,
        previousHash: this.lastAuditHash,
        createdAt: timestamp,
      },
    });

    // Update chain
    this.lastAuditHash = integrityHash;

    // Log to structured logger for real-time monitoring
    this.logToStructuredLogger(event, traceId, timestamp);

    // Alert on high-severity events
    if (event.severity === AuditSeverity.CRITICAL || event.severity === AuditSeverity.ERROR) {
      this.triggerSecurityAlert(event, traceId);
    }

    return auditEntry.id;
  }

  /**
   * Log authentication success
   */
  async logAuthSuccess(
    userId: string,
    organizationId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      userId,
      organizationId,
      action: 'User logged in successfully',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        loginMethod: metadata?.loginMethod || 'password',
      },
    });
  }

  /**
   * Log authentication failure
   */
  async logAuthFailure(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
    attemptCount?: number,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTH_LOGIN_FAILED,
      severity: attemptCount && attemptCount >= 5 ? AuditSeverity.WARNING : AuditSeverity.INFO,
      action: 'Authentication failed',
      outcome: 'FAILURE',
      ipAddress,
      userAgent,
      metadata: {
        email: this.hashEmail(email), // Hash PII
        reason,
        attemptCount,
      },
    });
  }

  /**
   * Log cross-tenant access attempt
   */
  async logCrossTenantAccessAttempt(
    userId: string,
    sourceOrganizationId: string,
    targetOrganizationId: string,
    resourceType: string,
    resourceId: string,
    ipAddress: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.TENANT_CROSS_ACCESS_ATTEMPT,
      severity: AuditSeverity.CRITICAL,
      userId,
      organizationId: sourceOrganizationId,
      resourceType,
      resourceId,
      action: 'Attempted to access resource in another tenant',
      outcome: 'DENIED',
      ipAddress,
      metadata: {
        targetOrganizationId,
      },
    });
  }

  /**
   * Log role change
   */
  async logRoleChange(
    adminUserId: string,
    targetUserId: string,
    organizationId: string,
    oldRole: string,
    newRole: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTHZ_ROLE_CHANGED,
      severity: AuditSeverity.WARNING,
      userId: adminUserId,
      organizationId,
      resourceType: 'USER',
      resourceId: targetUserId,
      action: `Changed user role from ${oldRole} to ${newRole}`,
      outcome: 'SUCCESS',
      metadata: {
        targetUserId,
        oldRole,
        newRole,
      },
    });
  }

  /**
   * Log admin impersonation
   */
  async logImpersonationStart(
    adminUserId: string,
    targetUserId: string,
    organizationId: string,
    reason: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTHZ_IMPERSONATION_START,
      severity: AuditSeverity.CRITICAL,
      userId: adminUserId,
      organizationId,
      resourceType: 'USER',
      resourceId: targetUserId,
      action: 'Started impersonating user',
      outcome: 'SUCCESS',
      metadata: {
        targetUserId,
        reason,
        impersonationStart: new Date().toISOString(),
      },
    });
  }

  /**
   * Log domain security event
   */
  async logDomainEvent(
    eventType: AuditEventType,
    organizationId: string,
    domain: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const severity =
      eventType === AuditEventType.DOMAIN_HIJACK_ATTEMPT
        ? AuditSeverity.CRITICAL
        : AuditSeverity.INFO;

    await this.logEvent({
      eventType,
      severity,
      userId,
      organizationId,
      resourceType: 'DOMAIN',
      resourceId: domain,
      action: eventType.replace(/_/g, ' ').toLowerCase(),
      outcome: eventType.includes('ATTEMPT') ? 'DENIED' : 'SUCCESS',
      metadata,
    });
  }

  /**
   * Query audit log with filters
   */
  async queryAuditLog(filters: {
    organizationId?: string;
    userId?: string;
    eventTypes?: AuditEventType[];
    severities?: AuditSeverity[];
    startDate?: Date;
    endDate?: Date;
    traceId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    entries: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.eventTypes?.length) where.eventType = { in: filters.eventTypes };
    if (filters.severities?.length) where.severity = { in: filters.severities };
    if (filters.traceId) where.traceId = filters.traceId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      entries,
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    verified: boolean;
    entriesChecked: number;
    errors: Array<{ entryId: string; error: string }>;
  }> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        contentHash: true,
        integrityHash: true,
        previousHash: true,
      },
    });

    const errors: Array<{ entryId: string; error: string }> = [];
    let previousHash = this.generateInitialHash();

    for (const entry of entries) {
      // Verify chain link
      if (entry.previousHash && entry.previousHash !== previousHash) {
        errors.push({
          entryId: entry.id,
          error: 'Chain link broken: previous hash mismatch',
        });
      }

      // Verify integrity hash
      const expectedIntegrityHash = this.createIntegrityHash(
        entry.previousHash || previousHash,
        entry.contentHash,
      );

      if (entry.integrityHash !== expectedIntegrityHash) {
        errors.push({
          entryId: entry.id,
          error: 'Integrity hash mismatch: possible tampering',
        });
      }

      previousHash = entry.integrityHash;
    }

    return {
      verified: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }

  /**
   * Sanitize data to remove secrets
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        for (const pattern of this.secretPatterns) {
          sanitizedValue = sanitizedValue.replace(pattern, '***REDACTED***');
        }
        sanitized[key] = sanitizedValue;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `trace_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Generate initial hash for chain
   */
  private generateInitialHash(): string {
    const seed = this.configService.get<string>('AUDIT_CHAIN_SEED', 'broxiva-audit-genesis');
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Create content hash
   */
  private createContentHash(content: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
  }

  /**
   * Create integrity hash (chain link)
   */
  private createIntegrityHash(previousHash: string, contentHash: string): string {
    return crypto
      .createHash('sha256')
      .update(`${previousHash}:${contentHash}`)
      .digest('hex');
  }

  /**
   * Hash IP address for privacy
   */
  private hashIpAddress(ip: string): string {
    const salt = this.configService.get<string>('AUDIT_IP_SALT', 'ip-salt');
    return crypto
      .createHash('sha256')
      .update(`${salt}:${ip}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Hash email for privacy
   */
  private hashEmail(email: string): string {
    const salt = this.configService.get<string>('AUDIT_EMAIL_SALT', 'email-salt');
    return crypto
      .createHash('sha256')
      .update(`${salt}:${email.toLowerCase()}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Log to structured logger for SIEM integration
   */
  private logToStructuredLogger(event: AuditEvent, traceId: string, timestamp: Date): void {
    const logEntry = {
      '@timestamp': timestamp.toISOString(),
      traceId,
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      organizationId: event.organizationId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action,
      outcome: event.outcome,
      source: 'broxiva-api',
      category: 'security',
    };

    // Use appropriate log level based on severity
    switch (event.severity) {
      case AuditSeverity.CRITICAL:
        this.logger.error(logEntry);
        break;
      case AuditSeverity.ERROR:
        this.logger.error(logEntry);
        break;
      case AuditSeverity.WARNING:
        this.logger.warn(logEntry);
        break;
      default:
        this.logger.log(logEntry);
    }
  }

  /**
   * Trigger security alert for critical events
   */
  private triggerSecurityAlert(event: AuditEvent, traceId: string): void {
    // In production, this would send to alerting system (PagerDuty, Slack, etc.)
    this.logger.error({
      message: 'SECURITY ALERT',
      traceId,
      eventType: event.eventType,
      severity: event.severity,
      action: event.action,
      organizationId: event.organizationId,
      userId: event.userId,
      alertType: 'immediate_action_required',
    });
  }
}
