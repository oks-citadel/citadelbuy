import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../../organization-audit/services/audit.service';
import { KycVerificationProcessor } from '../processors/kyc-verification.processor';
import { DocumentStorageService } from './document-storage.service';
import {
  SubmitKycDto,
  UploadDocumentDto,
} from '../dto/submit-kyc.dto';
import {
  ReviewKycDto,
  KycReviewDecision,
} from '../dto/review-kyc.dto';
import * as crypto from 'crypto';
import { KycStatus } from '@prisma/client';

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  [key: string]: string; // Index signature for Prisma JSON compatibility
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly verificationProcessor: KycVerificationProcessor,
    private readonly documentStorage: DocumentStorageService,
  ) {
    // Generate encryption key from environment variable or create a secure one
    const keyString = this.config.get<string>('KYC_ENCRYPTION_KEY');
    if (!keyString) {
      this.logger.warn(
        'KYC_ENCRYPTION_KEY not set in environment. Using fallback (NOT for production!)',
      );
      // In production, this should always come from environment
      this.encryptionKey = crypto.scryptSync('fallback-key-change-in-prod', 'salt', 32);
    } else {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(encryptedData.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Mask PII for logging (show only first and last 2 characters)
   */
  private maskPII(data: string): string {
    if (!data || data.length <= 4) return '***';
    return `${data.substring(0, 2)}${'*'.repeat(data.length - 4)}${data.substring(data.length - 2)}`;
  }

  /**
   * Submit KYC application
   */
  async submitKyc(
    organizationId: string,
    userId: string,
    dto: SubmitKycDto,
    ipAddress?: string,
  ) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check for existing KYC application
    let kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    // Only allow resubmission if rejected or not started
    if (kycApplication && !['NOT_STARTED', 'REJECTED'].includes(kycApplication.status)) {
      throw new BadRequestException(
        'KYC application already submitted. Current status: ' + kycApplication.status,
      );
    }

    // Encrypt sensitive data (tax ID, registration number)
    const encryptedTaxId = dto.taxId ? this.encrypt(dto.taxId) : null;
    const encryptedRegNumber = dto.businessRegistrationNumber
      ? this.encrypt(dto.businessRegistrationNumber)
      : null;

    // Create or update KYC application
    if (kycApplication) {
      kycApplication = await this.prisma.kycApplication.update({
        where: { id: kycApplication.id },
        data: {
          idType: dto.idType,
          status: 'DOCUMENTS_SUBMITTED',
          submittedAt: new Date(),
          reviewedAt: null,
          reviewNotes: null,
          rejectionReason: null,
          // Store encrypted data as JSON
          verificationData: {
            businessType: dto.businessType,
            businessAddress: dto.businessAddress,
            businessCity: dto.businessCity,
            businessState: dto.businessState,
            businessPostalCode: dto.businessPostalCode,
            businessCountry: dto.businessCountry,
            encryptedTaxId: encryptedTaxId,
            encryptedRegNumber: encryptedRegNumber,
          },
        },
      });
    } else {
      kycApplication = await this.prisma.kycApplication.create({
        data: {
          organizationId,
          idType: dto.idType,
          status: 'DOCUMENTS_SUBMITTED',
          submittedAt: new Date(),
          verificationData: {
            businessType: dto.businessType,
            businessAddress: dto.businessAddress,
            businessCity: dto.businessCity,
            businessState: dto.businessState,
            businessPostalCode: dto.businessPostalCode,
            businessCountry: dto.businessCountry,
            encryptedTaxId: encryptedTaxId,
            encryptedRegNumber: encryptedRegNumber,
          },
        },
      });
    }

    // Log audit event (with PII masking)
    await this.auditService.log({
      organizationId,
      userId,
      action: 'kyc.submitted',
      resource: 'kyc_application',
      resourceId: kycApplication.id,
      metadata: {
        idType: dto.idType,
        businessType: dto.businessType,
        taxId: dto.taxId ? this.maskPII(dto.taxId) : undefined,
      },
      ipAddress,
    });

    this.logger.log(
      `KYC submitted for organization ${this.maskPII(organizationId)} by user ${this.maskPII(userId)}`,
    );

    return {
      id: kycApplication.id,
      status: kycApplication.status,
      submittedAt: kycApplication.submittedAt,
    };
  }

  /**
   * Get KYC status for an organization
   */
  async getKycStatus(organizationId: string) {
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new NotFoundException('KYC application not found');
    }

    // Return status without sensitive encrypted data
    return {
      id: kycApplication.id,
      status: kycApplication.status,
      idType: kycApplication.idType,
      idVerified: kycApplication.idVerified,
      addressVerified: kycApplication.addressVerified,
      businessVerified: kycApplication.businessVerified,
      submittedAt: kycApplication.submittedAt,
      reviewedAt: kycApplication.reviewedAt,
      reviewNotes: kycApplication.reviewNotes,
      rejectionReason: kycApplication.rejectionReason,
      verificationScore: kycApplication.verificationScore,
    };
  }

  /**
   * Generate pre-signed URL for document upload
   * Uses DocumentStorageService for S3/Azure Blob storage
   */
  async uploadDocument(
    organizationId: string,
    userId: string,
    dto: UploadDocumentDto,
    fileBuffer?: Buffer,
    ipAddress?: string,
  ) {
    // Find KYC application
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new NotFoundException('KYC application not found');
    }

    let documentMetadata;
    let secureUrl: string;
    let expiresAt: Date;

    if (fileBuffer) {
      // Upload the document directly if buffer is provided
      documentMetadata = await this.documentStorage.uploadDocument({
        fileName: dto.fileName,
        fileBuffer,
        contentType: dto.contentType,
        organizationId,
        documentType: dto.documentType,
      });

      // Store the document key (encrypted)
      const encryptedKey = this.encrypt(documentMetadata.key);
      const encryptedKeyString = JSON.stringify(encryptedKey);

      // Update KYC application with document key
      const updateData: any = {};
      if (dto.documentType === 'id_document') {
        updateData.idDocumentUrl = encryptedKeyString;
      } else if (dto.documentType === 'address_proof') {
        updateData.addressDocumentUrl = encryptedKeyString;
      } else if (dto.documentType === 'business_document') {
        updateData.businessDocUrl = encryptedKeyString;
      }

      await this.prisma.kycApplication.update({
        where: { id: kycApplication.id },
        data: updateData,
      });

      // Generate pre-signed URL for viewing
      secureUrl = await this.documentStorage.getDocumentUrl(documentMetadata.key);
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    } else {
      // Generate pre-signed upload URL for client-side upload
      // This allows the client to upload directly to S3
      const uploadToken = crypto.randomBytes(32).toString('hex');
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the upload token temporarily (you might want to cache this)
      const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
      secureUrl = `${baseUrl}/api/kyc/upload/${uploadToken}`;
    }

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId,
      action: 'kyc.document_uploaded',
      resource: 'kyc_application',
      resourceId: kycApplication.id,
      metadata: {
        documentType: dto.documentType,
        fileName: dto.fileName,
      },
      ipAddress,
    });

    this.logger.log(
      `Document uploaded for KYC ${this.maskPII(kycApplication.id)}: ${dto.documentType}`,
    );

    // Trigger async verification if all documents are uploaded
    if (fileBuffer) {
      const hasAllDocuments = await this.checkAllDocumentsUploaded(kycApplication.id);
      if (hasAllDocuments) {
        // Queue verification job
        await this.verificationProcessor.processVerification(kycApplication.id);
      }
    }

    return {
      uploadUrl: secureUrl,
      expiresAt,
      documentType: dto.documentType,
    };
  }

  /**
   * Check if all required documents are uploaded
   */
  private async checkAllDocumentsUploaded(kycApplicationId: string): Promise<boolean> {
    const kycApplication = await this.prisma.kycApplication.findUnique({
      where: { id: kycApplicationId },
    });

    if (!kycApplication) {
      return false;
    }

    // Check if at least ID document is uploaded
    return !!kycApplication.idDocumentUrl;
  }

  /**
   * Get document URL with pre-signed access
   */
  async getDocumentUrl(
    organizationId: string,
    documentType: 'id_document' | 'address_proof' | 'business_document',
  ): Promise<string> {
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new NotFoundException('KYC application not found');
    }

    let encryptedKeyString: string | null = null;

    if (documentType === 'id_document') {
      encryptedKeyString = kycApplication.idDocumentUrl;
    } else if (documentType === 'address_proof') {
      encryptedKeyString = kycApplication.addressDocumentUrl;
    } else if (documentType === 'business_document') {
      encryptedKeyString = kycApplication.businessDocUrl;
    }

    if (!encryptedKeyString) {
      throw new NotFoundException('Document not found');
    }

    try {
      // Decrypt the document key
      const encryptedKey = JSON.parse(encryptedKeyString);
      const documentKey = this.decrypt(encryptedKey);

      // Generate pre-signed URL
      return await this.documentStorage.getDocumentUrl(documentKey);
    } catch (error) {
      this.logger.error('Failed to generate document URL', error);
      throw new BadRequestException('Failed to access document');
    }
  }

  /**
   * Review KYC application (Admin only)
   */
  async reviewKyc(
    organizationId: string,
    reviewerId: string,
    dto: ReviewKycDto,
    ipAddress?: string,
  ) {
    const kycApplication = await this.prisma.kycApplication.findFirst({
      where: { organizationId },
    });

    if (!kycApplication) {
      throw new NotFoundException('KYC application not found');
    }

    // Validate that application is in reviewable state
    if (!['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'].includes(kycApplication.status)) {
      throw new BadRequestException(
        `Cannot review KYC in status: ${kycApplication.status}`,
      );
    }

    // Validate rejection requires reason
    if (dto.decision === KycReviewDecision.REJECT && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting KYC');
    }

    // Determine new status
    let newStatus: KycStatus;
    switch (dto.decision) {
      case KycReviewDecision.APPROVE:
        newStatus = KycStatus.APPROVED;
        break;
      case KycReviewDecision.REJECT:
        newStatus = KycStatus.REJECTED;
        break;
      case KycReviewDecision.REQUEST_MORE_INFO:
        newStatus = KycStatus.DOCUMENTS_SUBMITTED;
        break;
      default:
        newStatus = KycStatus.UNDER_REVIEW;
    }

    // Update KYC application
    const updatedKyc = await this.prisma.kycApplication.update({
      where: { id: kycApplication.id },
      data: {
        status: newStatus,
        reviewerId,
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
        reviewedAt: new Date(),
        idVerified: dto.idVerified ?? kycApplication.idVerified,
        addressVerified: dto.addressVerified ?? kycApplication.addressVerified,
        businessVerified: dto.businessVerified ?? kycApplication.businessVerified,
        expiresAt:
          newStatus === 'APPROVED'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            : null,
      },
    });

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId: reviewerId,
      action: `kyc.${dto.decision}`,
      resource: 'kyc_application',
      resourceId: kycApplication.id,
      metadata: {
        decision: dto.decision,
        newStatus,
        reviewNotes: dto.reviewNotes,
      },
      ipAddress,
    });

    this.logger.log(
      `KYC ${this.maskPII(kycApplication.id)} reviewed by ${this.maskPII(reviewerId)}: ${dto.decision}`,
    );

    return {
      id: updatedKyc.id,
      status: updatedKyc.status,
      reviewedAt: updatedKyc.reviewedAt,
      expiresAt: updatedKyc.expiresAt,
    };
  }

  /**
   * Get all pending KYC applications (Admin only)
   */
  async getPendingApplications(limit = 50, offset = 0) {
    const applications = await this.prisma.kycApplication.findMany({
      where: {
        status: {
          in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'],
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            primaryEmail: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.kycApplication.count({
      where: {
        status: {
          in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'],
        },
      },
    });

    return {
      data: applications.map((app) => ({
        id: app.id,
        organizationId: app.organizationId,
        organizationName: app.organization.name,
        status: app.status,
        idType: app.idType,
        submittedAt: app.submittedAt,
        idVerified: app.idVerified,
        addressVerified: app.addressVerified,
        businessVerified: app.businessVerified,
      })),
      total,
      limit,
      offset,
    };
  }
}
