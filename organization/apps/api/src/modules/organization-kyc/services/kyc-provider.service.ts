import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../../organization-audit/services/audit.service';
import { EmailService } from '../../email/email.service';
import { OnfidoProvider } from '../providers/onfido.provider';
import { JumioProvider } from '../providers/jumio.provider';
import { SumsubProvider } from '../providers/sumsub.provider';
import {
  IKycProvider,
  KycProviderType,
  KycApplicantData,
  KycDocumentUpload,
  KycCheckType,
  KycCheckStatus,
  KycCheckResult,
} from '../providers/kyc-provider.interface';

/**
 * KYC Provider Service
 *
 * Orchestrates external KYC provider integrations
 * Handles provider selection, applicant creation, document verification, and webhook processing
 */
@Injectable()
export class KycProviderService {
  private readonly logger = new Logger(KycProviderService.name);
  private readonly provider: IKycProvider;
  private readonly providerType: KycProviderType;
  private readonly providers: Map<KycProviderType, IKycProvider>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly onfidoProvider: OnfidoProvider,
    private readonly jumioProvider: JumioProvider,
    private readonly sumsubProvider: SumsubProvider,
  ) {
    // Initialize provider map
    this.providers = new Map<KycProviderType, IKycProvider>();
    this.providers.set(KycProviderType.ONFIDO, this.onfidoProvider);
    this.providers.set(KycProviderType.JUMIO, this.jumioProvider);
    this.providers.set(KycProviderType.SUMSUB, this.sumsubProvider);

    // Select primary provider based on configuration
    this.providerType = this.configService.get<KycProviderType>(
      'KYC_PROVIDER',
      KycProviderType.MOCK,
    );

    // Initialize the appropriate provider
    switch (this.providerType) {
      case KycProviderType.ONFIDO:
        this.provider = this.onfidoProvider;
        break;
      case KycProviderType.JUMIO:
        this.provider = this.jumioProvider;
        break;
      case KycProviderType.SUMSUB:
        this.provider = this.sumsubProvider;
        break;
      case KycProviderType.MOCK:
      default:
        this.provider = this.onfidoProvider; // Uses mock mode by default
        break;
    }

    this.logger.log(`KYC Provider initialized: ${this.provider.getProviderName()}`);
  }

  /**
   * Initiate KYC verification for an organization
   */
  async initiateVerification(
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{
    applicantId: string;
    checkId?: string;
  }> {
    // Get organization and KYC application
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new BadRequestException('KYC application not found');
    }

    // Check if already initiated with provider
    const existingData = kycApplication.verificationData as any;
    if (existingData?.providerApplicantId) {
      this.logger.log(
        `KYC already initiated for org ${organizationId}: ${existingData.providerApplicantId}`,
      );
      return {
        applicantId: existingData.providerApplicantId,
        checkId: existingData.providerCheckId,
      };
    }

    try {
      // Extract business data from verification data
      const businessData = existingData || {};

      // Create applicant in provider system
      const applicantData: KycApplicantData = {
        firstName: organization.name.split(' ')[0] || 'Business',
        lastName: organization.name.split(' ').slice(1).join(' ') || 'Entity',
        email: organization.primaryEmail || '',
        organizationId,
        address: businessData.businessAddress
          ? {
              street: businessData.businessAddress,
              city: businessData.businessCity,
              state: businessData.businessState,
              postalCode: businessData.businessPostalCode,
              country: businessData.businessCountry || 'US',
            }
          : undefined,
      };

      const applicant = await this.provider.createApplicant(applicantData);

      // Update KYC application with provider data
      await this.prisma.kycApplication.update({
        where: { id: kycApplication.id },
        data: {
          status: 'UNDER_REVIEW',
          verificationData: {
            ...businessData,
            provider: this.providerType,
            providerApplicantId: applicant.id,
            providerApplicantHref: applicant.href,
            providerInitiatedAt: new Date().toISOString(),
          },
        },
      });

      // Log audit event
      await this.auditService.log({
        organizationId,
        userId,
        action: 'kyc.provider_initiated',
        resource: 'kyc_application',
        resourceId: kycApplication.id,
        metadata: {
          provider: this.providerType,
          applicantId: applicant.id,
        },
        ipAddress,
      });

      this.logger.log(
        `KYC verification initiated for org ${organizationId} with ${this.providerType}`,
      );

      return {
        applicantId: applicant.id,
      };
    } catch (error) {
      this.logger.error('Failed to initiate KYC verification', error);
      throw new BadRequestException('Failed to initiate verification with provider');
    }
  }

  /**
   * Submit document to provider
   */
  async submitDocument(
    organizationId: string,
    userId: string,
    documentType: 'id_document' | 'address_proof' | 'business_document',
    file: Buffer,
    fileName: string,
    contentType: string,
    ipAddress?: string,
  ): Promise<{ documentId: string }> {
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new BadRequestException('KYC application not found');
    }

    const verificationData = kycApplication.verificationData as any;
    const applicantId = verificationData?.providerApplicantId;

    if (!applicantId) {
      throw new BadRequestException('Verification not initiated. Call initiateVerification first.');
    }

    try {
      // Map document type to provider format
      const providerDocType = this.mapDocumentType(documentType);

      const document: KycDocumentUpload = {
        type: providerDocType as any,
        file,
        fileName,
        contentType,
      };

      // Upload to provider
      const uploadedDoc = await this.provider.uploadDocument(applicantId, document);

      // Update KYC application with document reference
      const updateData: any = {};
      if (documentType === 'id_document') {
        updateData.idDocumentUrl = JSON.stringify({
          provider: this.providerType,
          documentId: uploadedDoc.id,
          href: uploadedDoc.href,
        });
      } else if (documentType === 'address_proof') {
        updateData.addressDocumentUrl = JSON.stringify({
          provider: this.providerType,
          documentId: uploadedDoc.id,
          href: uploadedDoc.href,
        });
      } else if (documentType === 'business_document') {
        updateData.businessDocUrl = JSON.stringify({
          provider: this.providerType,
          documentId: uploadedDoc.id,
          href: uploadedDoc.href,
        });
      }

      await this.prisma.kycApplication.update({
        where: { id: kycApplication.id },
        data: updateData,
      });

      // Log audit event
      await this.auditService.log({
        organizationId,
        userId,
        action: 'kyc.document_submitted_to_provider',
        resource: 'kyc_application',
        resourceId: kycApplication.id,
        metadata: {
          provider: this.providerType,
          documentType,
          documentId: uploadedDoc.id,
        },
        ipAddress,
      });

      this.logger.log(
        `Document ${documentType} submitted to ${this.providerType} for org ${organizationId}`,
      );

      return { documentId: uploadedDoc.id };
    } catch (error) {
      this.logger.error('Failed to submit document to provider', error);
      throw new BadRequestException('Failed to upload document to verification provider');
    }
  }

  /**
   * Create verification check
   */
  async createVerificationCheck(
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ checkId: string; status: KycCheckStatus }> {
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new BadRequestException('KYC application not found');
    }

    const verificationData = kycApplication.verificationData as any;
    const applicantId = verificationData?.providerApplicantId;

    if (!applicantId) {
      throw new BadRequestException('Verification not initiated');
    }

    try {
      // Define check types based on what documents are uploaded
      const checkTypes: KycCheckType[] = [KycCheckType.DOCUMENT];

      if (kycApplication.addressDocumentUrl) {
        checkTypes.push(KycCheckType.PROOF_OF_ADDRESS);
      }

      // Create check with provider
      const check = await this.provider.createCheck(applicantId, checkTypes);

      // Update KYC application
      await this.prisma.kycApplication.update({
        where: { id: kycApplication.id },
        data: {
          status: 'UNDER_REVIEW',
          verificationData: {
            ...verificationData,
            providerCheckId: check.id,
            providerCheckHref: check.href,
            providerCheckStatus: check.status,
            checkCreatedAt: new Date().toISOString(),
          },
        },
      });

      // Log audit event
      await this.auditService.log({
        organizationId,
        userId,
        action: 'kyc.check_created',
        resource: 'kyc_application',
        resourceId: kycApplication.id,
        metadata: {
          provider: this.providerType,
          checkId: check.id,
          checkTypes,
        },
        ipAddress,
      });

      this.logger.log(
        `Verification check created: ${check.id} for org ${organizationId}`,
      );

      return {
        checkId: check.id,
        status: check.status,
      };
    } catch (error) {
      this.logger.error('Failed to create verification check', error);
      throw new BadRequestException('Failed to create verification check');
    }
  }

  /**
   * Get check status and update KYC application
   */
  async getCheckStatus(checkId: string): Promise<any> {
    try {
      const report = await this.provider.getCheck(checkId);

      // Find KYC application with this check ID
      const kycApplication = await this.prisma.kycApplication.findFirst({
        where: {
          verificationData: {
            path: ['providerCheckId'],
            equals: checkId,
          },
        },
      });

      if (kycApplication) {
        // Update verification data
        const verificationData = kycApplication.verificationData as any;
        await this.prisma.kycApplication.update({
          where: { id: kycApplication.id },
          data: {
            verificationData: {
              ...verificationData,
              providerCheckStatus: report.status,
              providerCheckResult: report.result,
              providerBreakdown: report.breakdown,
              lastCheckedAt: new Date().toISOString(),
            },
            verificationScore: this.calculateScore(report),
          },
        });
      }

      return report;
    } catch (error) {
      this.logger.error('Failed to get check status', error);
      throw new BadRequestException('Failed to retrieve verification status');
    }
  }

  /**
   * Process webhook callback from provider
   */
  async processWebhook(
    payload: any,
    signature: string,
    organizationId?: string,
    providerName?: string,
  ): Promise<void> {
    // Determine which provider to use
    let targetProvider: IKycProvider = this.provider;

    if (providerName) {
      const providerType = providerName.toLowerCase() as KycProviderType;
      const specificProvider = this.providers.get(providerType);

      if (specificProvider) {
        targetProvider = specificProvider;
        this.logger.log(`Using specific provider for webhook: ${providerType}`);
      } else {
        this.logger.warn(`Unknown provider specified: ${providerName}, using default`);
      }
    }

    // Verify webhook signature
    const isValid = targetProvider.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse webhook
    const webhookData = targetProvider.parseWebhook(payload);

    this.logger.log(
      `Processing webhook for check ${webhookData.checkId}: ${webhookData.status}`,
    );

    // Find KYC application
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: {
        verificationData: {
          path: ['providerCheckId'],
          equals: webhookData.checkId,
        },
      },
    });

    if (!kycApplication) {
      this.logger.warn(`No KYC application found for check ${webhookData.checkId}`);
      return;
    }

    // Update based on webhook status
    const verificationData = kycApplication.verificationData as any;
    let newStatus = kycApplication.status;
    let idVerified = kycApplication.idVerified;
    let addressVerified = kycApplication.addressVerified;
    let businessVerified = kycApplication.businessVerified;

    if (webhookData.status === KycCheckStatus.COMPLETE) {
      if (webhookData.output?.result === KycCheckResult.CLEAR) {
        newStatus = 'APPROVED';
        idVerified = true;
        addressVerified = true;
        businessVerified = true;
      } else if (webhookData.output?.result === KycCheckResult.CONSIDER) {
        newStatus = 'DOCUMENTS_SUBMITTED'; // Needs manual review
      } else {
        newStatus = 'REJECTED';
      }
    }

    // Update KYC application
    await this.prisma.kycApplication.update({
      where: { id: kycApplication.id },
      data: {
        status: newStatus,
        idVerified,
        addressVerified,
        businessVerified,
        verificationData: {
          ...verificationData,
          webhookReceived: true,
          webhookStatus: webhookData.status,
          webhookResult: webhookData.output?.result,
          webhookOutput: webhookData.output,
          webhookReceivedAt: new Date().toISOString(),
        },
        reviewedAt: webhookData.status === KycCheckStatus.COMPLETE ? new Date() : null,
      },
    });

    // Log audit event
    await this.auditService.log({
      organizationId: kycApplication.organizationId,
      userId: 'system',
      action: 'kyc.webhook_processed',
      resource: 'kyc_application',
      resourceId: kycApplication.id,
      metadata: {
        provider: this.providerType,
        checkId: webhookData.checkId,
        status: webhookData.status,
        result: webhookData.output?.result,
      },
    });

    this.logger.log(
      `Webhook processed for KYC ${kycApplication.id}: ${newStatus}`,
    );

    // Send notification email to organization
    await this.sendKycNotificationEmail(
      kycApplication,
      newStatus,
      idVerified,
      addressVerified,
      businessVerified,
    );
  }

  /**
   * Calculate verification score from provider report
   */
  private calculateScore(report: any): number {
    if (!report.result) return 0;

    let score = 0;

    if (report.result === KycCheckResult.CLEAR) {
      score = 0.9;
    } else if (report.result === KycCheckResult.CONSIDER) {
      score = 0.6;
    } else {
      score = 0.3;
    }

    // Adjust based on breakdown
    if (report.breakdown) {
      const breakdownResults = Object.values(report.breakdown);
      const clearCount = breakdownResults.filter(
        (b: any) => b?.result === KycCheckResult.CLEAR,
      ).length;
      const totalCount = breakdownResults.length;

      if (totalCount > 0) {
        const breakdownScore = clearCount / totalCount;
        score = (score + breakdownScore) / 2;
      }
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Map internal document type to provider format
   */
  private mapDocumentType(
    type: 'id_document' | 'address_proof' | 'business_document',
  ): string {
    const mapping: Record<string, string> = {
      id_document: 'passport',
      address_proof: 'proof_of_address',
      business_document: 'national_identity_card',
    };
    return mapping[type] || 'passport';
  }

  /**
   * Get current provider
   */
  getProvider(): IKycProvider {
    return this.provider;
  }

  /**
   * Get provider type
   */
  getProviderType(): KycProviderType {
    return this.providerType;
  }

  /**
   * Get a specific provider by type
   */
  getProviderByType(providerType: KycProviderType): IKycProvider | undefined {
    return this.providers.get(providerType);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): KycProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Send KYC notification email based on status
   */
  private async sendKycNotificationEmail(
    kycApplication: any,
    status: string,
    idVerified: boolean,
    addressVerified: boolean,
    businessVerified: boolean,
  ): Promise<void> {
    try {
      // Get organization details
      const organization = await this.prisma.organization.findUnique({
        where: { id: kycApplication.organizationId },
      });

      if (!organization || !organization.primaryEmail) {
        this.logger.warn(
          `Cannot send KYC email: Organization ${kycApplication.organizationId} not found or has no email`,
        );
        return;
      }

      const emailData = {
        email: organization.primaryEmail,
        organizationName: organization.name,
        applicationId: kycApplication.id,
        submittedDate: kycApplication.createdAt?.toLocaleDateString() || 'N/A',
        reviewedDate: kycApplication.reviewedAt?.toLocaleDateString() || new Date().toLocaleDateString(),
        approvedDate: kycApplication.reviewedAt?.toLocaleDateString() || new Date().toLocaleDateString(),
        verificationScore: kycApplication.verificationScore,
        idVerified,
        addressVerified,
        businessVerified,
      };

      // Send appropriate email based on status
      switch (status) {
        case 'APPROVED':
          await this.emailService.sendKycApproved(emailData);
          this.logger.log(
            `KYC approved email sent to ${organization.primaryEmail} for organization ${organization.name}`,
          );
          break;

        case 'REJECTED':
          // Extract rejection reasons from verification data if available
          const verificationData = kycApplication.verificationData as any;
          const rejectionReasons: string[] = [];

          if (verificationData?.webhookOutput?.breakdown) {
            const breakdown = verificationData.webhookOutput.breakdown;
            Object.entries(breakdown).forEach(([key, value]: [string, any]) => {
              if (value?.result && value.result !== 'clear') {
                const reason = value?.properties?.reason || `${key} verification failed`;
                rejectionReasons.push(reason);
              }
            });
          }

          await this.emailService.sendKycRejected({
            ...emailData,
            rejectionReasons:
              rejectionReasons.length > 0
                ? rejectionReasons
                : undefined,
          });
          this.logger.log(
            `KYC rejected email sent to ${organization.primaryEmail} for organization ${organization.name}`,
          );
          break;

        case 'DOCUMENTS_SUBMITTED':
        case 'UNDER_REVIEW':
          await this.emailService.sendKycPendingReview({
            email: emailData.email,
            organizationName: emailData.organizationName,
            applicationId: emailData.applicationId,
            submittedDate: emailData.submittedDate,
            estimatedReviewTime: '1-3 business days',
          });
          this.logger.log(
            `KYC pending review email sent to ${organization.primaryEmail} for organization ${organization.name}`,
          );
          break;

        default:
          this.logger.debug(
            `No email notification configured for KYC status: ${status}`,
          );
      }
    } catch (error) {
      // Log error but don't throw - email failures shouldn't break the KYC process
      this.logger.error(
        `Failed to send KYC notification email for application ${kycApplication.id}`,
        error.stack,
      );
    }
  }
}
