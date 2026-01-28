import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base KYC Exception
 */
export class KycException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(
      {
        message,
        code: code || 'KYC_ERROR',
        metadata,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

/**
 * KYC Provider Not Configured Exception
 * Thrown when KYC provider is not properly configured
 */
export class KycProviderNotConfiguredException extends KycException {
  constructor(provider: string, missingConfig?: string[], metadata?: Record<string, any>) {
    super(
      `KYC provider '${provider}' is not properly configured${missingConfig ? `. Missing: ${missingConfig.join(', ')}` : ''}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'KYC_PROVIDER_NOT_CONFIGURED',
      { provider, missingConfig, ...metadata },
    );
  }
}

/**
 * KYC Application Not Found Exception
 * Thrown when a KYC application cannot be found
 */
export class KycApplicationNotFoundException extends KycException {
  constructor(identifier: string, identifierType: string = 'id', metadata?: Record<string, any>) {
    super(
      `KYC application not found: ${identifierType} = ${identifier}`,
      HttpStatus.NOT_FOUND,
      'KYC_APPLICATION_NOT_FOUND',
      { identifier, identifierType, ...metadata },
    );
  }
}

/**
 * KYC Application Already Exists Exception
 * Thrown when trying to create a duplicate KYC application
 */
export class KycApplicationAlreadyExistsException extends KycException {
  constructor(organizationId: string, status?: string, metadata?: Record<string, any>) {
    super(
      `KYC application already exists for organization ${organizationId}${status ? ` with status: ${status}` : ''}`,
      HttpStatus.CONFLICT,
      'KYC_APPLICATION_ALREADY_EXISTS',
      { organizationId, status, ...metadata },
    );
  }
}

/**
 * KYC Verification Not Initiated Exception
 * Thrown when trying to perform an operation that requires initiated verification
 */
export class KycVerificationNotInitiatedException extends KycException {
  constructor(organizationId: string, metadata?: Record<string, any>) {
    super(
      `KYC verification not initiated for organization ${organizationId}. Please initiate verification first.`,
      HttpStatus.BAD_REQUEST,
      'KYC_VERIFICATION_NOT_INITIATED',
      { organizationId, ...metadata },
    );
  }
}

/**
 * KYC Document Upload Failed Exception
 * Thrown when document upload fails
 */
export class KycDocumentUploadException extends KycException {
  constructor(
    documentType: string,
    reason?: string,
    public readonly isTransient: boolean = false,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to upload ${documentType} document${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'KYC_DOCUMENT_UPLOAD_FAILED',
      { documentType, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC Document Invalid Exception
 * Thrown when a document is invalid
 */
export class KycDocumentInvalidException extends KycException {
  constructor(
    documentType: string,
    validationErrors: string[],
    metadata?: Record<string, any>,
  ) {
    super(
      `Invalid ${documentType} document: ${validationErrors.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'KYC_DOCUMENT_INVALID',
      { documentType, validationErrors, ...metadata },
    );
  }
}

/**
 * KYC Document Processing Failed Exception
 * Thrown when document processing fails at the provider
 */
export class KycDocumentProcessingException extends KycException {
  constructor(
    documentId: string,
    reason?: string,
    public readonly isTransient: boolean = true,
    metadata?: Record<string, any>,
  ) {
    super(
      `Document processing failed for ${documentId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'KYC_DOCUMENT_PROCESSING_FAILED',
      { documentId, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC Applicant Creation Failed Exception
 * Thrown when creating an applicant fails
 */
export class KycApplicantCreationException extends KycException {
  constructor(
    provider: string,
    reason?: string,
    public readonly isTransient: boolean = false,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to create applicant with ${provider}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'KYC_APPLICANT_CREATION_FAILED',
      { provider, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC Check Creation Failed Exception
 * Thrown when creating a verification check fails
 */
export class KycCheckCreationException extends KycException {
  constructor(
    provider: string,
    applicantId: string,
    reason?: string,
    public readonly isTransient: boolean = false,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to create verification check with ${provider} for applicant ${applicantId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'KYC_CHECK_CREATION_FAILED',
      { provider, applicantId, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC Check Retrieval Failed Exception
 * Thrown when retrieving check status fails
 */
export class KycCheckRetrievalException extends KycException {
  constructor(
    checkId: string,
    reason?: string,
    public readonly isTransient: boolean = true,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to retrieve verification check ${checkId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'KYC_CHECK_RETRIEVAL_FAILED',
      { checkId, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC API Communication Failed Exception
 * Thrown when communication with KYC provider API fails
 */
export class KycApiCommunicationException extends KycException {
  constructor(
    provider: string,
    endpoint: string,
    statusCode?: number,
    reason?: string,
    public readonly isTransient: boolean = true,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to communicate with ${provider} API at ${endpoint}${statusCode ? ` (HTTP ${statusCode})` : ''}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_GATEWAY,
      'KYC_API_COMMUNICATION_FAILED',
      { provider, endpoint, statusCode, reason, isTransient, ...metadata },
    );
  }
}

/**
 * KYC Rate Limit Exceeded Exception
 * Thrown when KYC provider rate limit is exceeded
 */
export class KycRateLimitException extends KycException {
  constructor(
    provider: string,
    retryAfterSeconds?: number,
    metadata?: Record<string, any>,
  ) {
    super(
      `KYC provider ${provider} rate limit exceeded${retryAfterSeconds ? `. Retry after ${retryAfterSeconds} seconds` : ''}`,
      HttpStatus.TOO_MANY_REQUESTS,
      'KYC_RATE_LIMIT_EXCEEDED',
      { provider, retryAfterSeconds, ...metadata },
    );
  }
}

/**
 * KYC Webhook Verification Failed Exception
 * Thrown when webhook signature verification fails
 */
export class KycWebhookVerificationException extends KycException {
  constructor(provider: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Webhook verification failed for ${provider}${reason ? `: ${reason}` : ''}`,
      HttpStatus.UNAUTHORIZED,
      'KYC_WEBHOOK_VERIFICATION_FAILED',
      { provider, reason, ...metadata },
    );
  }
}

/**
 * KYC Invalid Status Transition Exception
 * Thrown when attempting an invalid status transition
 */
export class KycInvalidStatusTransitionException extends KycException {
  constructor(
    currentStatus: string,
    targetStatus: string,
    allowedTransitions: string[],
    metadata?: Record<string, any>,
  ) {
    super(
      `Invalid KYC status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'KYC_INVALID_STATUS_TRANSITION',
      { currentStatus, targetStatus, allowedTransitions, ...metadata },
    );
  }
}

/**
 * KYC Required Documents Missing Exception
 * Thrown when required documents are missing
 */
export class KycRequiredDocumentsMissingException extends KycException {
  constructor(missingDocuments: string[], metadata?: Record<string, any>) {
    super(
      `Required KYC documents missing: ${missingDocuments.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'KYC_REQUIRED_DOCUMENTS_MISSING',
      { missingDocuments, ...metadata },
    );
  }
}

/**
 * KYC Verification Expired Exception
 * Thrown when a KYC verification has expired
 */
export class KycVerificationExpiredException extends KycException {
  constructor(
    applicationId: string,
    expirationDate: Date,
    metadata?: Record<string, any>,
  ) {
    super(
      `KYC verification for application ${applicationId} expired on ${expirationDate.toISOString()}`,
      HttpStatus.BAD_REQUEST,
      'KYC_VERIFICATION_EXPIRED',
      { applicationId, expirationDate, ...metadata },
    );
  }
}

/**
 * KYC Verification Rejected Exception
 * Thrown when verification is rejected by provider
 */
export class KycVerificationRejectedException extends KycException {
  constructor(
    applicationId: string,
    rejectionReasons: string[],
    metadata?: Record<string, any>,
  ) {
    super(
      `KYC verification rejected for application ${applicationId}: ${rejectionReasons.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'KYC_VERIFICATION_REJECTED',
      { applicationId, rejectionReasons, ...metadata },
    );
  }
}

/**
 * KYC Provider Token Expired Exception
 * Thrown when provider authentication token expires
 */
export class KycProviderTokenExpiredException extends KycException {
  constructor(provider: string, metadata?: Record<string, any>) {
    super(
      `Authentication token expired for KYC provider ${provider}`,
      HttpStatus.UNAUTHORIZED,
      'KYC_PROVIDER_TOKEN_EXPIRED',
      { provider, ...metadata },
    );
  }
}
