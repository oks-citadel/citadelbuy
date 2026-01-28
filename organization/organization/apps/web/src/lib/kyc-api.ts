/**
 * KYC API - Handles KYC verification operations
 */

import { apiClient } from './api-client';

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE';

export interface KycStatusResponse {
  id: string;
  status: KycStatus;
  idType?: string;
  idVerified: boolean;
  addressVerified: boolean;
  businessVerified: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  verificationData?: any;
}

export interface SubmitKycData {
  idType: 'passport' | 'drivers_license' | 'national_id';
  businessType: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPostalCode?: string;
  businessCountry?: string;
}

export interface UploadDocumentData {
  documentType: 'id_document' | 'address_proof' | 'business_document';
  fileName: string;
  contentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  expiresAt: string;
  documentType: string;
}

export interface DocumentInfo {
  id: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
  status: string;
}

export interface ProviderInitiateResponse {
  applicantId: string;
  provider: string;
  sdkToken?: string;
}

// KYC API
export const kycApi = {
  /**
   * Get KYC status for organization
   */
  getStatus: async (orgId: string): Promise<KycStatusResponse> => {
    const response = await apiClient.get<KycStatusResponse>(`/api/v1/organizations/${orgId}/kyc`);
    return response.data;
  },

  /**
   * Submit KYC application
   */
  submit: async (orgId: string, data: SubmitKycData): Promise<KycStatusResponse> => {
    const response = await apiClient.post<KycStatusResponse>(
      `/api/v1/organizations/${orgId}/kyc`,
      data
    );
    return response.data;
  },

  /**
   * Get upload URL for document
   */
  getUploadUrl: async (orgId: string, data: UploadDocumentData): Promise<UploadUrlResponse> => {
    const response = await apiClient.post<UploadUrlResponse>(
      `/api/v1/organizations/${orgId}/kyc/documents`,
      data
    );
    return response.data;
  },

  /**
   * Upload document file to pre-signed URL
   */
  uploadFile: async (uploadUrl: string, file: File): Promise<void> => {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  /**
   * Complete document upload (notify backend)
   */
  completeUpload: async (
    orgId: string,
    documentType: 'id_document' | 'address_proof' | 'business_document',
    fileName: string
  ): Promise<DocumentInfo> => {
    const response = await apiClient.post<DocumentInfo>(
      `/api/v1/organizations/${orgId}/kyc/documents/complete`,
      {
        documentType,
        fileName,
      }
    );
    return response.data;
  },

  /**
   * Get uploaded documents
   */
  getDocuments: async (orgId: string): Promise<DocumentInfo[]> => {
    const response = await apiClient.get<DocumentInfo[]>(
      `/api/v1/organizations/${orgId}/kyc/documents`
    );
    return response.data;
  },

  /**
   * Initiate provider verification (Jumio/SumSub)
   */
  initiateProviderVerification: async (orgId: string): Promise<ProviderInitiateResponse> => {
    const response = await apiClient.post<ProviderInitiateResponse>(
      `/api/v1/organizations/${orgId}/kyc/provider/initiate`
    );
    return response.data;
  },

  /**
   * Submit document to provider
   */
  submitDocumentToProvider: async (
    orgId: string,
    documentType: 'id_document' | 'address_proof' | 'business_document',
    file: File
  ): Promise<{ documentId: string; provider: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ documentId: string; provider: string }>(
      `/api/v1/organizations/${orgId}/kyc/provider/document/${documentType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Create verification check with provider
   */
  createProviderCheck: async (
    orgId: string
  ): Promise<{ checkId: string; status: string; provider: string }> => {
    const response = await apiClient.post<{ checkId: string; status: string; provider: string }>(
      `/api/v1/organizations/${orgId}/kyc/provider/check`
    );
    return response.data;
  },

  /**
   * Get provider check status
   */
  getProviderCheckStatus: async (
    orgId: string,
    checkId: string
  ): Promise<{ status: string; result?: string; provider: string }> => {
    const response = await apiClient.get<{ status: string; result?: string; provider: string }>(
      `/api/v1/organizations/${orgId}/kyc/provider/check/${checkId}`
    );
    return response.data;
  },
};

/**
 * Map backend KYC status to frontend status
 */
export const mapKycStatus = (backendStatus: string): 'incomplete' | 'pending' | 'in_review' | 'approved' | 'rejected' => {
  const statusMap: Record<string, 'incomplete' | 'pending' | 'in_review' | 'approved' | 'rejected'> = {
    'INCOMPLETE': 'incomplete',
    'PENDING': 'pending',
    'UNDER_REVIEW': 'in_review',
    'APPROVED': 'approved',
    'REJECTED': 'rejected',
  };

  return statusMap[backendStatus] || 'incomplete';
};

/**
 * Map frontend status to verification step
 */
export const getVerificationStep = (
  status: string,
  documentsUploaded: { id: boolean; address: boolean; business: boolean }
): 'info' | 'documents' | 'review' | 'complete' => {
  if (status === 'approved') return 'complete';
  if (status === 'in_review' || status === 'pending') return 'review';
  if (documentsUploaded.id && documentsUploaded.address && documentsUploaded.business) return 'review';
  return 'documents';
};
