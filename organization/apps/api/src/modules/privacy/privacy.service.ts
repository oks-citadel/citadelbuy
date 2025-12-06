import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DataExportService } from '../users/data-export.service';
import { DataDeletionService, DeletionStrategy } from '../users/data-deletion.service';
import { ConsentDto, DataDeletionRequestDto } from './dto/consent.dto';

@Injectable()
export class PrivacyService {
  constructor(
    private prisma: PrismaService,
    private dataExportService: DataExportService,
    private dataDeletionService: DataDeletionService,
  ) {}

  /**
   * Get overview of all stored data
   */
  async getStoredDataOverview(userId: string) {
    const report = await this.dataExportService.generateExportReport(userId);
    const consent = await this.getConsent(userId);

    return {
      ...report,
      consentStatus: consent.consent,
    };
  }

  /**
   * Initiate data export process
   */
  async initiateDataExport(userId: string, format: 'json' | 'csv') {
    const exportId = `export_${userId}_${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // In production, you would store this in a queue/job system
    // and send an email when ready

    return {
      message: 'Data export has been initiated',
      exportId,
      format,
      estimatedCompletionTime: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), // 5 minutes
      downloadUrl: `/privacy/export/download?format=${format}`,
      expiresAt: expiresAt.toISOString(),
      note: 'You will receive an email when your export is ready. The download link will expire after 7 days.',
    };
  }

  /**
   * Generate and return data export
   */
  async generateDataExport(userId: string, format: 'json' | 'csv') {
    return this.dataExportService.exportUserData(userId, format);
  }

  /**
   * Request account deletion
   */
  async requestDeletion(userId: string, request: DataDeletionRequestDto) {
    // Get retention info first
    const retentionInfo = await this.dataDeletionService.getDataRetentionInfo(userId);

    // Check if hard delete is available
    if (request.strategy === 'HARD_DELETE' && !retentionInfo.deletionOptions.hardDelete) {
      return {
        success: false,
        message: 'Hard delete is not available due to active payment plans or other obligations',
        retentionInfo,
        suggestedStrategy: 'ANONYMIZE',
      };
    }

    // Schedule deletion with grace period
    const schedule = await this.dataDeletionService.scheduleDeletion({
      userId,
      strategy: request.strategy as DeletionStrategy,
      reason: request.reason,
      scheduledDate: request.scheduledDate,
    });

    return {
      message: 'Account deletion request has been received',
      userId,
      strategy: request.strategy,
      scheduledDate: schedule.scheduledDate.toISOString(),
      cancellationDeadline: schedule.cancellationDeadline.toISOString(),
      dataRetentionInfo: {
        ordersRetained: true,
        retentionPeriod: '7 years',
        reason: 'Legal and tax compliance',
      },
      note:
        'You can cancel this request at any time before the cancellation deadline. After the deadline, deletion will proceed automatically.',
    };
  }

  /**
   * Get data retention information
   */
  async getRetentionInfo(userId: string) {
    return this.dataDeletionService.getDataRetentionInfo(userId);
  }

  /**
   * Update user consent preferences - GDPR Article 7 & CCPA Section 1798.120
   */
  async updateConsent(userId: string, consentDto: ConsentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Store consent in ConsentLog table for GDPR compliance
    // This creates an immutable audit trail of all consent changes
    const consentLog = await this.prisma.consentLog.create({
      data: {
        userId,
        dataProcessing: consentDto.dataProcessing,
        marketing: consentDto.marketing ?? false,
        analytics: consentDto.analytics ?? false,
        thirdPartySharing: consentDto.thirdPartySharing ?? false,
        ipAddress: consentDto.ipAddress || 'unknown',
        userAgent: consentDto.userAgent || 'unknown',
        version: '1.0', // Privacy policy version
      },
    });

    return {
      userId,
      consent: {
        dataProcessing: consentLog.dataProcessing,
        marketing: consentLog.marketing,
        analytics: consentLog.analytics,
        thirdPartySharing: consentLog.thirdPartySharing,
      },
      updatedAt: consentLog.createdAt.toISOString(),
      ipAddress: consentLog.ipAddress,
      userAgent: consentLog.userAgent,
      version: consentLog.version,
    };
  }

  /**
   * Get current consent status - GDPR Article 7(1)
   */
  async getConsent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Retrieve the most recent consent from ConsentLog table
    const latestConsent = await this.prisma.consentLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // If no consent record exists, return default consent structure
    if (!latestConsent) {
      return {
        userId,
        consent: {
          dataProcessing: true, // Required for account functionality
          marketing: false,
          analytics: false,
          thirdPartySharing: false,
        },
        grantedAt: user.createdAt.toISOString(),
        lastUpdatedAt: user.createdAt.toISOString(),
        ipAddress: null,
        note: 'No consent preferences have been set. Default values are shown.',
      };
    }

    return {
      userId,
      consent: {
        dataProcessing: latestConsent.dataProcessing,
        marketing: latestConsent.marketing,
        analytics: latestConsent.analytics,
        thirdPartySharing: latestConsent.thirdPartySharing,
      },
      grantedAt: latestConsent.createdAt.toISOString(),
      lastUpdatedAt: latestConsent.createdAt.toISOString(),
      ipAddress: latestConsent.ipAddress,
      userAgent: latestConsent.userAgent,
      version: latestConsent.version,
    };
  }

  /**
   * Get consent history for audit purposes - GDPR Article 30
   */
  async getConsentHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Retrieve all consent logs for the user
    const consentHistory = await this.prisma.consentLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      userId,
      totalRecords: consentHistory.length,
      history: consentHistory.map((log) => ({
        consent: {
          dataProcessing: log.dataProcessing,
          marketing: log.marketing,
          analytics: log.analytics,
          thirdPartySharing: log.thirdPartySharing,
        },
        timestamp: log.createdAt.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        version: log.version,
      })),
    };
  }

  /**
   * Verify data accuracy
   */
  async verifyDataAccuracy(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      lastVerified: new Date().toISOString(),
      dataFields: {
        email: {
          value: user.email,
          verified: true,
          lastUpdated: user.updatedAt.toISOString(),
        },
        name: {
          value: user.name,
          verified: false,
          lastUpdated: user.updatedAt.toISOString(),
        },
      },
      message: 'You can update your personal information through the profile settings page at /users/profile.',
      updateEndpoint: 'PATCH /users/profile',
    };
  }

  /**
   * Restrict data processing - GDPR Article 18
   */
  async restrictProcessing(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update consent to restrict all non-essential processing
    await this.updateConsent(userId, {
      dataProcessing: true, // Required for account
      marketing: false,
      analytics: false,
      thirdPartySharing: false,
      ipAddress: 'system',
      userAgent: 'system',
    });

    return {
      userId,
      processingRestricted: true,
      restrictedActivities: ['marketing', 'analytics', 'recommendations', 'third-party sharing'],
      allowedActivities: ['account management', 'order processing', 'customer support'],
      appliedAt: new Date().toISOString(),
      message:
        'Your data will only be stored and processed for essential account functions and legal compliance. Marketing, analytics, and recommendations have been disabled.',
    };
  }

  /**
   * Get terms and privacy policy version user agreed to - GDPR Article 7(1)
   */
  async getAgreedTerms(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Retrieve the most recent agreed terms from AgreedTerms table
    const latestAgreedTerms = await this.prisma.agreedTerms.findFirst({
      where: { userId },
      orderBy: { agreedAt: 'desc' },
    });

    // If no terms record exists, return default structure
    if (!latestAgreedTerms) {
      return {
        userId,
        agreedAt: user.createdAt.toISOString(),
        versions: {
          privacyPolicy: 'Not recorded',
          termsOfService: 'Not recorded',
          cookiePolicy: 'Not recorded',
        },
        documents: {
          privacyPolicy: '/legal/privacy-policy',
          termsOfService: '/legal/terms-of-service',
          cookiePolicy: '/legal/cookie-policy',
        },
        note: 'No terms acceptance record found. Please review and accept the latest terms.',
      };
    }

    return {
      userId,
      agreedAt: latestAgreedTerms.agreedAt.toISOString(),
      versions: {
        privacyPolicy: latestAgreedTerms.privacyPolicyVersion,
        termsOfService: latestAgreedTerms.termsVersion,
        cookiePolicy: latestAgreedTerms.cookiePolicyVersion || 'Not specified',
      },
      ipAddress: latestAgreedTerms.ipAddress,
      userAgent: latestAgreedTerms.userAgent,
      documents: {
        privacyPolicy: '/legal/privacy-policy',
        termsOfService: '/legal/terms-of-service',
        cookiePolicy: '/legal/cookie-policy',
      },
    };
  }

  /**
   * Record user's acceptance of terms and policies
   */
  async recordTermsAcceptance(
    userId: string,
    termsVersion: string,
    privacyPolicyVersion: string,
    cookiePolicyVersion?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Store terms acceptance in AgreedTerms table for GDPR compliance
    const agreedTerms = await this.prisma.agreedTerms.create({
      data: {
        userId,
        termsVersion,
        privacyPolicyVersion,
        cookiePolicyVersion,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
      },
    });

    return {
      userId,
      agreedAt: agreedTerms.agreedAt.toISOString(),
      versions: {
        privacyPolicy: agreedTerms.privacyPolicyVersion,
        termsOfService: agreedTerms.termsVersion,
        cookiePolicy: agreedTerms.cookiePolicyVersion || 'Not specified',
      },
      ipAddress: agreedTerms.ipAddress,
      userAgent: agreedTerms.userAgent,
    };
  }
}
