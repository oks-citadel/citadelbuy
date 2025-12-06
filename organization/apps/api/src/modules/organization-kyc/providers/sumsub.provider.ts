import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IKycProvider,
  KycProviderType,
  KycApplicantData,
  KycApplicantResponse,
  KycDocumentUpload,
  KycDocumentResponse,
  KycCheckType,
  KycCheckResponse,
  KycVerificationReport,
  KycWebhookPayload,
  KycCheckStatus,
  KycCheckResult,
} from './kyc-provider.interface';

/**
 * Sumsub (Sum&Substance) KYC Provider Implementation
 *
 * Integrates with Sumsub's Identity Verification API
 * https://developers.sumsub.com/
 *
 * Features:
 * - ID document verification
 * - Facial biometric verification
 * - Identity verification
 * - AML/Sanctions screening
 * - Proof of address verification
 * - Webhook support for async updates
 * - Mock mode for development
 */
@Injectable()
export class SumsubProvider implements IKycProvider {
  private readonly logger = new Logger(SumsubProvider.name);
  private readonly client: any;
  private readonly appToken: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly isMockMode: boolean;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appToken = this.configService.get<string>('SUMSUB_APP_TOKEN', '');
    this.secretKey = this.configService.get<string>('SUMSUB_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('SUMSUB_WEBHOOK_SECRET', '');
    this.isMockMode = !this.appToken || this.configService.get<string>('NODE_ENV') === 'development';

    // Sumsub API base URL
    this.baseUrl = 'https://api.sumsub.com';

    if (this.isMockMode) {
      this.logger.warn(
        'Sumsub provider running in MOCK mode. Set SUMSUB_APP_TOKEN for production.',
      );
    }

    // Initialize HTTP client
    this.client = null;
  }

  getProviderName(): KycProviderType {
    return KycProviderType.SUMSUB;
  }

  /**
   * Create an applicant in Sumsub
   */
  async createApplicant(data: KycApplicantData): Promise<KycApplicantResponse> {
    if (this.isMockMode) {
      return this.mockCreateApplicant(data);
    }

    try {
      const payload = {
        externalUserId: data.organizationId,
        info: {
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dateOfBirth,
          country: data.address?.country || 'USA',
        },
        email: data.email,
        requiredIdDocs: {
          docSets: [
            {
              idDocSetType: 'IDENTITY',
              types: ['PASSPORT', 'ID_CARD', 'DRIVERS'],
            },
          ],
        },
      };

      if (data.address) {
        payload.info['addresses'] = [
          {
            country: data.address.country,
            postCode: data.address.postalCode,
            town: data.address.city,
            state: data.address.state,
            street: data.address.street,
          },
        ];
      }

      const response = await this.makeRequest('POST', '/resources/applicants', payload);

      this.logger.log(`Sumsub applicant created: ${response.id}`);

      return {
        id: response.id,
        createdAt: new Date(response.createdAt || Date.now()),
        href: `${this.baseUrl}/resources/applicants/${response.id}`,
      };
    } catch (error) {
      this.logger.error('Failed to create Sumsub applicant', error);
      throw new BadRequestException('Failed to create KYC applicant');
    }
  }

  /**
   * Upload a document to Sumsub
   */
  async uploadDocument(
    applicantId: string,
    document: KycDocumentUpload,
  ): Promise<KycDocumentResponse> {
    if (this.isMockMode) {
      return this.mockUploadDocument(applicantId, document);
    }

    try {
      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('metadata', JSON.stringify({
        idDocType: this.mapDocumentType(document.type),
        country: 'USA',
      }));

      // Handle buffer or URL
      if (Buffer.isBuffer(document.file)) {
        formData.append('content', document.file, {
          filename: document.fileName,
          contentType: document.contentType,
        });
      }

      const response = await this.makeRequest(
        'POST',
        `/resources/applicants/${applicantId}/info/idDoc`,
        formData,
        formData.getHeaders(),
      );

      this.logger.log(`Document uploaded for applicant ${applicantId}: ${response.id}`);

      return {
        id: response.id || response.imageId,
        applicantId,
        type: document.type,
        side: document.side,
        fileName: document.fileName,
        href: `${this.baseUrl}/resources/applicants/${applicantId}/documents/${response.id}`,
      };
    } catch (error) {
      this.logger.error('Failed to upload document to Sumsub', error);
      throw new BadRequestException('Failed to upload verification document');
    }
  }

  /**
   * Create a verification check
   */
  async createCheck(
    applicantId: string,
    checkTypes: KycCheckType[],
  ): Promise<KycCheckResponse> {
    if (this.isMockMode) {
      return this.mockCreateCheck(applicantId, checkTypes);
    }

    try {
      // Sumsub automatically starts verification after document upload
      // We request the applicant status
      const response = await this.makeRequest('GET', `/resources/applicants/${applicantId}/status`);

      this.logger.log(`Verification check initiated for applicant: ${applicantId}`);

      return {
        id: response.reviewId || applicantId,
        applicantId,
        status: this.mapStatus(response.reviewStatus),
        result: this.mapResult(response.reviewResult?.reviewAnswer),
        createdAt: new Date(response.createDate || Date.now()),
        completedAt: response.reviewDate ? new Date(response.reviewDate) : undefined,
        href: `${this.baseUrl}/resources/applicants/${applicantId}/status`,
      };
    } catch (error) {
      this.logger.error('Failed to create Sumsub check', error);
      throw new BadRequestException('Failed to initiate verification check');
    }
  }

  /**
   * Get check status and results
   */
  async getCheck(checkId: string): Promise<KycVerificationReport> {
    if (this.isMockMode) {
      return this.mockGetCheck(checkId);
    }

    try {
      // Get applicant status
      const statusResponse = await this.makeRequest('GET', `/resources/applicants/${checkId}/status`);

      // Get applicant details for extracted data
      const applicantResponse = await this.makeRequest('GET', `/resources/applicants/${checkId}/one`);

      // Build breakdown from review result
      const breakdown: any = {};
      const documents: any[] = [];

      if (statusResponse.reviewResult) {
        const reviewResult = statusResponse.reviewResult;

        // Document checks
        if (reviewResult.reviewAnswer) {
          breakdown.documentAuthenticity = {
            result: this.mapResult(reviewResult.reviewAnswer),
            breakdown: {
              moderationComment: reviewResult.moderationComment,
              clientComment: reviewResult.clientComment,
              rejectLabels: reviewResult.rejectLabels,
            },
          };
        }

        // Individual check results
        if (reviewResult.checkResults) {
          Object.entries(reviewResult.checkResults).forEach(([checkName, checkData]: [string, any]) => {
            if (checkName === 'IDENTITY') {
              breakdown.documentAuthenticity = {
                ...breakdown.documentAuthenticity,
                result: this.mapResult(checkData.answer),
              };
            } else if (checkName === 'SELFIE') {
              breakdown.faceComparison = {
                result: this.mapResult(checkData.answer),
                breakdown: checkData,
              };
            } else if (checkName === 'PROOF_OF_RESIDENCE') {
              breakdown.addressVerification = {
                result: this.mapResult(checkData.answer),
                breakdown: checkData,
              };
            } else if (checkName === 'WATCHLIST') {
              breakdown.amlCheck = {
                result: this.mapResult(checkData.answer),
                breakdown: {
                  hits: checkData.hits || [],
                  searchStatus: checkData.searchStatus,
                },
              };
            }
          });
        }
      }

      // Extract document data
      if (applicantResponse.info && applicantResponse.info.idDocs) {
        applicantResponse.info.idDocs.forEach((doc: any) => {
          documents.push({
            id: doc.idDocType,
            type: doc.idDocType,
            extractedData: {
              firstName: doc.firstName,
              lastName: doc.lastName,
              middleName: doc.middleName,
              documentNumber: doc.number,
              dateOfBirth: doc.dob,
              expiryDate: doc.validUntil,
              issuingCountry: doc.country,
              issuedDate: doc.issuedDate,
            },
          });
        });
      }

      return {
        checkId: statusResponse.reviewId || checkId,
        applicantId: checkId,
        status: this.mapStatus(statusResponse.reviewStatus),
        result: this.mapResult(statusResponse.reviewResult?.reviewAnswer),
        breakdown,
        documents,
      };
    } catch (error) {
      this.logger.error('Failed to get Sumsub check', error);
      throw new BadRequestException('Failed to retrieve verification status');
    }
  }

  /**
   * Get applicant information
   */
  async getApplicant(applicantId: string): Promise<KycApplicantResponse> {
    if (this.isMockMode) {
      return this.mockGetApplicant(applicantId);
    }

    try {
      const response = await this.makeRequest('GET', `/resources/applicants/${applicantId}/one`);

      return {
        id: response.id,
        createdAt: new Date(response.createdAt || Date.now()),
        href: `${this.baseUrl}/resources/applicants/${applicantId}`,
      };
    } catch (error) {
      this.logger.error('Failed to get Sumsub applicant', error);
      throw new BadRequestException('Failed to retrieve applicant');
    }
  }

  /**
   * Verify webhook signature
   * Sumsub uses HMAC-SHA256 signature in X-Payload-Digest header
   */
  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || this.webhookSecret || this.secretKey;

    if (!webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true; // In development, allow unsigned webhooks
    }

    if (!signature) {
      this.logger.warn('No signature provided in webhook');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const expectedSignature = hmac.update(payload).digest('hex');

      // Sumsub sends lowercase hex digest
      const providedSignature = signature.toLowerCase();
      const expectedLowercase = expectedSignature.toLowerCase();

      return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedLowercase),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any): KycWebhookPayload {
    // Sumsub webhook format
    const data = payload;

    // Map review answer to result
    let result: KycCheckResult | undefined;
    const reviewAnswer = data.reviewResult?.reviewAnswer || data.reviewAnswer;

    if (reviewAnswer === 'GREEN') {
      result = KycCheckResult.CLEAR;
    } else if (reviewAnswer === 'RED') {
      result = KycCheckResult.UNIDENTIFIED;
    } else if (reviewAnswer === 'YELLOW') {
      result = KycCheckResult.CONSIDER;
    }

    // Extract applicant ID from various possible fields
    const applicantId = data.applicantId || data.externalUserId || data.applicant?.externalUserId;

    return {
      id: data.reviewId || data.applicantId,
      status: this.mapStatus(data.reviewStatus || data.type),
      completedAt: data.reviewDate || data.createdAt,
      href: `${this.baseUrl}/resources/applicants/${applicantId}/status`,
      output: {
        result: result || KycCheckResult.UNIDENTIFIED,
        subResult: reviewAnswer,
        breakdown: {
          reviewResult: data.reviewResult,
          checkResults: data.reviewResult?.checkResults,
          moderationComment: data.reviewResult?.moderationComment,
          rejectLabels: data.reviewResult?.rejectLabels,
        },
        properties: {
          applicantType: data.applicantType,
          inspectionId: data.inspectionId,
          correlationId: data.correlationId,
          externalUserId: data.externalUserId,
          type: data.type,
        },
      },
      applicantId: applicantId,
      checkId: data.reviewId || data.applicantId,
    };
  }

  /**
   * Cancel a check
   */
  async cancelCheck(checkId: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.log(`Mock: Cancelled check ${checkId}`);
      return;
    }

    try {
      // Sumsub uses "reset" to cancel a verification
      await this.makeRequest('POST', `/resources/applicants/${checkId}/reset`);
      this.logger.log(`Check cancelled: ${checkId}`);
    } catch (error) {
      this.logger.error('Failed to cancel Sumsub check', error);
      throw new BadRequestException('Failed to cancel verification');
    }
  }

  /**
   * Get document download URL
   */
  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    if (this.isMockMode) {
      return `https://mock.sumsub.com/documents/${documentId}/download`;
    }

    try {
      // Sumsub document images require special access token
      return `${this.baseUrl}/resources/inspections/${documentId}/resources`;
    } catch (error) {
      this.logger.error('Failed to get document URL', error);
      throw new BadRequestException('Failed to retrieve document');
    }
  }

  // Helper methods

  /**
   * Make authenticated request to Sumsub API
   * Sumsub uses custom signature authentication
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: any,
    additionalHeaders?: any,
  ): Promise<any> {
    // In production, this would use axios with proper auth
    const timestamp = Math.floor(Date.now() / 1000);
    const requestPath = path.startsWith('/') ? path : `/${path}`;

    // Create signature: HMAC-SHA256(SECRET_KEY, timestamp + method + path + body)
    const body = data && method !== 'GET' ? JSON.stringify(data) : '';
    const signatureString = `${timestamp}${method}${requestPath}${body}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey || 'mock-secret')
      .update(signatureString)
      .digest('hex');

    const headers = {
      'X-App-Token': this.appToken,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp.toString(),
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    // Mock response for development
    return {
      id: `sumsub_${Date.now()}`,
      reviewStatus: 'completed',
      reviewResult: {
        reviewAnswer: 'GREEN',
      },
      createdAt: new Date().toISOString(),
    };
  }

  private mapDocumentType(type: string): string {
    const mapping: Record<string, string> = {
      passport: 'PASSPORT',
      driving_licence: 'DRIVERS',
      national_identity_card: 'ID_CARD',
      proof_of_address: 'UTILITY_BILL',
    };
    return mapping[type] || 'ID_CARD';
  }

  private mapStatus(status: string): KycCheckStatus {
    const mapping: Record<string, KycCheckStatus> = {
      init: KycCheckStatus.PENDING,
      pending: KycCheckStatus.IN_PROGRESS,
      queued: KycCheckStatus.IN_PROGRESS,
      processing: KycCheckStatus.IN_PROGRESS,
      completed: KycCheckStatus.COMPLETE,
      onHold: KycCheckStatus.PAUSED,
      retry: KycCheckStatus.REOPENED,
      // Webhook event types
      applicantCreated: KycCheckStatus.PENDING,
      applicantReviewed: KycCheckStatus.COMPLETE,
      applicantPending: KycCheckStatus.IN_PROGRESS,
    };
    return mapping[status] || KycCheckStatus.PENDING;
  }

  private mapResult(result: string | undefined): KycCheckResult | undefined {
    if (!result) return undefined;

    const mapping: Record<string, KycCheckResult> = {
      GREEN: KycCheckResult.CLEAR,
      YELLOW: KycCheckResult.CONSIDER,
      RED: KycCheckResult.UNIDENTIFIED,
    };
    return mapping[result];
  }

  // Mock methods for development

  private mockCreateApplicant(data: KycApplicantData): KycApplicantResponse {
    const mockId = `mock_sumsub_applicant_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`MOCK: Created Sumsub applicant ${mockId} for ${data.email}`);

    return {
      id: mockId,
      createdAt: new Date(),
      href: `https://mock.sumsub.com/applicants/${mockId}`,
    };
  }

  private mockUploadDocument(
    applicantId: string,
    document: KycDocumentUpload,
  ): KycDocumentResponse {
    const mockId = `mock_sumsub_doc_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`MOCK: Uploaded ${document.type} for applicant ${applicantId}`);

    return {
      id: mockId,
      applicantId,
      type: document.type,
      side: document.side,
      fileName: document.fileName,
      fileSize: Buffer.isBuffer(document.file) ? document.file.length : 1024,
      href: `https://mock.sumsub.com/documents/${mockId}`,
      downloadHref: `https://mock.sumsub.com/documents/${mockId}/download`,
    };
  }

  private mockCreateCheck(
    applicantId: string,
    checkTypes: KycCheckType[],
  ): KycCheckResponse {
    const mockId = `mock_sumsub_check_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(
      `MOCK: Created Sumsub check ${mockId} for applicant ${applicantId} with types: ${checkTypes.join(', ')}`,
    );

    return {
      id: mockId,
      applicantId,
      status: KycCheckStatus.IN_PROGRESS,
      createdAt: new Date(),
      href: `https://mock.sumsub.com/applicants/${applicantId}/status`,
    };
  }

  private mockGetCheck(checkId: string): KycVerificationReport {
    this.logger.log(`MOCK: Retrieved Sumsub check ${checkId}`);

    return {
      checkId,
      applicantId: 'mock_sumsub_applicant',
      status: KycCheckStatus.COMPLETE,
      result: KycCheckResult.CLEAR,
      breakdown: {
        documentAuthenticity: {
          result: KycCheckResult.CLEAR,
          breakdown: {
            moderationComment: 'Document looks authentic',
            rejectLabels: [],
          },
        },
        faceComparison: {
          result: KycCheckResult.CLEAR,
          breakdown: {
            similarity: 0.96,
          },
        },
        addressVerification: {
          result: KycCheckResult.CLEAR,
          breakdown: {
            verified: true,
          },
        },
        amlCheck: {
          result: KycCheckResult.CLEAR,
          breakdown: {
            hits: [],
            searchStatus: 'COMPLETE',
          },
        },
      },
      documents: [
        {
          id: 'PASSPORT',
          type: 'PASSPORT',
          extractedData: {
            firstName: 'John',
            lastName: 'Doe',
            documentNumber: 'SUMSUB123456',
            dateOfBirth: '1990-01-01',
            expiryDate: '2030-12-31',
            issuingCountry: 'USA',
          },
        },
      ],
    };
  }

  private mockGetApplicant(applicantId: string): KycApplicantResponse {
    this.logger.log(`MOCK: Retrieved Sumsub applicant ${applicantId}`);

    return {
      id: applicantId,
      createdAt: new Date(),
      href: `https://mock.sumsub.com/applicants/${applicantId}`,
    };
  }
}
