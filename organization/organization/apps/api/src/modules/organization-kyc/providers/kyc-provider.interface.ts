/**
 * KYC Provider Interface
 *
 * Abstract interface for third-party KYC verification providers
 * Supports: Onfido, Jumio, Sumsub, and custom implementations
 */

export enum KycProviderType {
  ONFIDO = 'onfido',
  JUMIO = 'jumio',
  SUMSUB = 'sumsub',
  MOCK = 'mock', // For development/testing
}

export enum KycCheckType {
  DOCUMENT = 'document',
  IDENTITY = 'identity',
  FACIAL_SIMILARITY = 'facial_similarity',
  PROOF_OF_ADDRESS = 'proof_of_address',
}

export enum KycCheckStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  WITHDRAWN = 'withdrawn',
  PAUSED = 'paused',
  REOPENED = 'reopened',
}

export enum KycCheckResult {
  CLEAR = 'clear',
  CONSIDER = 'consider',
  UNIDENTIFIED = 'unidentified',
}

export interface KycApplicantData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  organizationId: string;
}

export interface KycDocumentUpload {
  type: 'passport' | 'driving_licence' | 'national_identity_card' | 'proof_of_address';
  side?: 'front' | 'back';
  file: Buffer | string; // Buffer for direct upload, string for URL
  fileName: string;
  contentType: string;
}

export interface KycApplicantResponse {
  id: string;
  createdAt: Date;
  href?: string;
}

export interface KycCheckResponse {
  id: string;
  applicantId: string;
  status: KycCheckStatus;
  result?: KycCheckResult;
  createdAt: Date;
  completedAt?: Date;
  href?: string;
}

export interface KycDocumentResponse {
  id: string;
  applicantId: string;
  type: string;
  side?: string;
  fileName: string;
  fileSize?: number;
  href?: string;
  downloadHref?: string;
}

export interface KycWebhookPayload {
  id: string;
  status: KycCheckStatus;
  completedAt?: string;
  href?: string;
  output?: {
    result: KycCheckResult;
    subResult?: string;
    breakdown?: any;
    properties?: any;
  };
  applicantId?: string;
  checkId?: string;
}

export interface KycVerificationReport {
  checkId: string;
  applicantId: string;
  status: KycCheckStatus;
  result?: KycCheckResult;
  breakdown?: {
    documentAuthenticity?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    visualAuthenticity?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    dataComparison?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    dataConsistency?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    faceComparison?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    livenessCheck?: {
      result: KycCheckResult;
      breakdown?: any;
    };
    addressVerification?: {
      result: KycCheckResult;
      breakdown?: any;
    };
  };
  documents?: Array<{
    id: string;
    type: string;
    extractedData?: any;
  }>;
}

/**
 * Abstract KYC Provider Interface
 * All KYC providers must implement this interface
 */
export interface IKycProvider {
  /**
   * Get provider name
   */
  getProviderName(): KycProviderType;

  /**
   * Create an applicant in the provider's system
   */
  createApplicant(data: KycApplicantData): Promise<KycApplicantResponse>;

  /**
   * Upload a document for an applicant
   */
  uploadDocument(
    applicantId: string,
    document: KycDocumentUpload,
  ): Promise<KycDocumentResponse>;

  /**
   * Create a verification check for an applicant
   */
  createCheck(
    applicantId: string,
    checkTypes: KycCheckType[],
  ): Promise<KycCheckResponse>;

  /**
   * Get check status and results
   */
  getCheck(checkId: string): Promise<KycVerificationReport>;

  /**
   * Get applicant information
   */
  getApplicant(applicantId: string): Promise<KycApplicantResponse>;

  /**
   * Verify webhook signature for authenticity
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret?: string,
  ): boolean;

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any): KycWebhookPayload;

  /**
   * Cancel/withdraw a check
   */
  cancelCheck(checkId: string): Promise<void>;

  /**
   * Get document download URL (pre-signed)
   */
  getDocumentDownloadUrl(documentId: string): Promise<string>;
}
