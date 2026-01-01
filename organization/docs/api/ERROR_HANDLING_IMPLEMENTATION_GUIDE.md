# Comprehensive Error Handling Implementation Guide

This guide documents the error handling improvements made to critical paths in Broxiva API.

## Overview

Custom exception classes have been created in `src/common/exceptions/` for:
- **Payment operations** (`payment.exception.ts`)
- **Email services** (`email.exception.ts`)
- **KYC verification** (`kyc.exception.ts`)

## 1. Payment Service Error Handling

### Location
`src/modules/payments/payments.service.ts`

### Required Changes

#### 1.1 Add Imports
```typescript
import {
  PaymentProviderNotConfiguredException,
  PaymentIntentCreationException,
  PaymentProcessingException,
  RefundFailedException,
  PaymentWebhookVerificationException,
  InvalidPaymentAmountException,
  PayPalOrderCreationException,
  PayPalCaptureException,
  StripeCustomerException,
  CardDeclinedException,
  PaymentException,
} from '@/common/exceptions';
```

#### 1.2 Enhance `createPaymentIntent` Method
Replace the existing try-catch with:

```typescript
async createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  this.ensureStripeConfigured();

  // Validate amount
  if (amount <= 0) {
    throw new InvalidPaymentAmountException(amount, 'Amount must be greater than 0');
  }

  if (amount > 999999.99) {
    throw new InvalidPaymentAmountException(amount, 'Amount exceeds maximum allowed value');
  }

  try {
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: metadata || {},
    });

    this.logger.log(`Payment intent created: ${paymentIntent.id} for amount ${amount} ${currency}`);

    return {
      clientSecret: paymentIntent.client_secret as string,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    this.logger.error('Failed to create payment intent', {
      amount,
      currency,
      error: error.message,
      code: error.code,
    });

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      throw new CardDeclinedException(error.message, { code: error.code });
    } else if (error.type === 'StripeRateLimitError') {
      throw new PaymentProcessingException('Rate limit exceeded. Please try again later.', {
        code: error.code,
        isTransient: true,
      });
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new PaymentIntentCreationException('Stripe', error.message, { code: error.code });
    } else if (error.type === 'StripeAPIError' || error.type === 'StripeConnectionError') {
      throw new PaymentIntentCreationException('Stripe', 'Service temporarily unavailable', {
        code: error.code,
        isTransient: true,
      });
    }

    throw new PaymentIntentCreationException('Stripe', error.message, {
      amount,
      currency,
      originalError: error.code,
    });
  }
}
```

#### 1.3 Enhance `createStripeRefund` Method
```typescript
async createStripeRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  metadata?: Record<string, string>,
): Promise<{ refundId: string; status: string; amount: number }> {
  this.ensureStripeConfigured();

  if (amount !== undefined && amount <= 0) {
    throw new InvalidPaymentAmountException(amount, 'Refund amount must be greater than 0');
  }

  try {
    const refund = await this.stripe!.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason || 'requested_by_customer',
      metadata: metadata || {},
    });

    this.logger.log(`Stripe refund created: ${refund.id} for amount ${refund.amount / 100}`);

    return {
      refundId: refund.id,
      status: refund.status ?? 'pending',
      amount: refund.amount / 100,
    };
  } catch (error: any) {
    this.logger.error('Failed to create Stripe refund', {
      paymentIntentId,
      amount,
      error: error.message,
      code: error.code,
    });

    if (error.type === 'StripeInvalidRequestError') {
      throw new RefundFailedException('Stripe', paymentIntentId, error.message, {
        code: error.code,
      });
    }

    throw new RefundFailedException('Stripe', paymentIntentId, 'Service temporarily unavailable', {
      code: error.code,
      isTransient: true,
    });
  }
}
```

#### 1.4 Enhance `createPayPalOrder` Method
```typescript
async createPayPalOrder(
  amount: number,
  currency: string = 'USD',
  orderId?: string,
  returnUrl?: string,
  cancelUrl?: string,
): Promise<{ orderId: string; approvalUrl: string }> {
  const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
  const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new PaymentProviderNotConfiguredException('PayPal', {
        missingConfig: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
      });
    }
    // ... development mock response
  }

  if (amount <= 0) {
    throw new InvalidPaymentAmountException(amount, 'Order amount must be greater than 0');
  }

  try {
    // ... existing PayPal order creation logic

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      this.logger.error('PayPal order creation failed', {
        amount,
        currency,
        status: response.status,
        error: errorData,
      });

      throw new PayPalOrderCreationException(errorData.message || response.statusText, {
        amount,
        currency,
        statusCode: response.status,
        errorData,
        isTransient: response.status >= 500,
      });
    }

    // ... success logic
  } catch (error: any) {
    if (error instanceof PaymentException) {
      throw error;
    }

    this.logger.error('Failed to create PayPal order', {
      amount,
      currency,
      error: error.message,
    });

    throw new PayPalOrderCreationException(error.message, {
      amount,
      currency,
      isTransient: true,
    });
  }
}
```

#### 1.5 Enhance `getPayPalAccessToken` Method
```typescript
private async getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Return cached token if still valid
  if (this.paypalAccessToken && Date.now() < this.paypalTokenExpiry) {
    return this.paypalAccessToken;
  }

  // ... existing setup code

  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      this.logger.error('Failed to get PayPal access token', {
        status: response.status,
        error: errorData,
      });

      throw new PaymentProviderNotConfiguredException('PayPal', {
        reason: 'Failed to authenticate with PayPal',
        statusCode: response.status,
        isTransient: response.status >= 500,
      });
    }

    const tokenData: PayPalAccessToken = await response.json();

    // Cache token with 5 minute buffer before expiry
    this.paypalAccessToken = tokenData.access_token;
    this.paypalTokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000;

    this.logger.log('PayPal access token refreshed successfully');

    return tokenData.access_token;
  } catch (error: any) {
    if (error instanceof PaymentException) {
      throw error;
    }

    this.logger.error('PayPal token request failed', error.message);
    throw new PaymentProviderNotConfiguredException('PayPal', {
      reason: 'Failed to obtain access token',
      originalError: error.message,
      isTransient: true,
    });
  }
}
```

## 2. Email Service Error Handling

### Location
`src/modules/email/email.service.ts`

### Required Changes

#### 2.1 Add Imports
```typescript
import {
  EmailException,
  EmailServiceNotConfiguredException,
  EmailSendingException,
  SmtpConnectionException,
  SmtpAuthenticationException,
  EmailTemplateNotFoundException,
  EmailTemplateCompilationException,
  InvalidEmailAddressException,
  TransientEmailException,
} from '@/common/exceptions';
```

#### 2.2 Enhance `initializeTransporter` Method
```typescript
private initializeTransporter() {
  try {
    const emailHost = this.configService.get('EMAIL_HOST');
    const emailPort = this.configService.get('EMAIL_PORT');
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPassword = this.configService.get('EMAIL_PASSWORD');

    const missingConfig: string[] = [];
    if (!emailHost) missingConfig.push('EMAIL_HOST');
    if (!emailUser) missingConfig.push('EMAIL_USER');
    if (!emailPassword) missingConfig.push('EMAIL_PASSWORD');

    if (missingConfig.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new EmailServiceNotConfiguredException(missingConfig);
      }

      this.logger.warn(
        `Email configuration is missing (${missingConfig.join(', ')}). Emails will be logged instead of sent.`,
      );

      // Create a test transporter for development
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort || '587'),
      secure: emailPort === '465',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    this.logger.log('Email transporter initialized');
  } catch (error) {
    this.logger.error('Failed to initialize email transporter', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}
```

#### 2.3 Enhance `loadTemplate` Method
```typescript
private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
  if (this.templatesCache.has(templateName)) {
    return this.templatesCache.get(templateName)!;
  }

  const templatePath = path.join(
    __dirname,
    'templates',
    `${templateName}.hbs`,
  );

  try {
    if (!fs.existsSync(templatePath)) {
      throw new EmailTemplateNotFoundException(templateName, { templatePath });
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);
    this.templatesCache.set(templateName, template);

    this.logger.log(`Template loaded and cached: ${templateName}`);
    return template;
  } catch (error: any) {
    if (error instanceof EmailException) {
      throw error;
    }

    this.logger.error(`Failed to load template: ${templateName}`, {
      error: error.message,
      templatePath,
    });

    if (error.code === 'ENOENT') {
      throw new EmailTemplateNotFoundException(templateName, { templatePath });
    }

    throw new EmailTemplateCompilationException(templateName, error.message, {
      templatePath,
    });
  }
}
```

#### 2.4 Enhance `sendEmail` Method with Retry Logic
```typescript
async sendEmail(options: EmailOptions, retryCount: number = 0, maxRetries: number = 3): Promise<void> {
  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.to)) {
    throw new InvalidEmailAddressException(options.to);
  }

  try {
    let html: string;

    if (options.html) {
      html = options.html;
    } else if (options.template) {
      try {
        const template = await this.loadTemplate(options.template);
        html = template(options.context || {});
      } catch (error) {
        this.logger.error(`Template rendering failed: ${options.template}`, error);
        throw error;
      }
    } else {
      throw new EmailSendingException(
        options.to,
        'Either template or html must be provided',
        false,
      );
    }

    const mailOptions = {
      from: this.configService.get('EMAIL_FROM') || 'noreply@broxiva.com',
      to: options.to,
      subject: options.subject,
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent successfully: ${info.messageId} to ${options.to}`);
  } catch (error: any) {
    const isTransientError = this.isTransientEmailError(error);

    this.logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: error.message,
      code: error.code,
      retryCount,
      isTransient: isTransientError,
    });

    // Retry logic for transient errors
    if (isTransientError && retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
      this.logger.log(`Retrying email send in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.sendEmail(options, retryCount + 1, maxRetries);
    }

    // Handle specific error types
    if (error.code === 'EAUTH') {
      throw new SmtpAuthenticationException(
        this.configService.get('EMAIL_USER') || 'unknown',
        { originalError: error.message },
      );
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new SmtpConnectionException(
        this.configService.get('EMAIL_HOST') || 'unknown',
        parseInt(this.configService.get('EMAIL_PORT') || '587'),
        error.message,
        true,
      );
    }

    // Queue for later if all retries failed
    if (isTransientError && retryCount >= maxRetries) {
      this.logger.warn(`Email failed after ${maxRetries} retries, queueing for later: ${options.to}`);
      // Queue the email for later processing
      await this.queueFailedEmail(options);
    }

    throw new EmailSendingException(options.to, error.message, isTransientError, {
      code: error.code,
      retryCount,
      maxRetries,
    });
  }
}

/**
 * Determine if an email error is transient and should be retried
 */
private isTransientEmailError(error: any): boolean {
  const transientCodes = [
    'ECONNECTION',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'EAI_AGAIN',
  ];

  if (transientCodes.includes(error.code)) {
    return true;
  }

  // SMTP 4xx codes are typically transient
  if (error.responseCode >= 400 && error.responseCode < 500) {
    return true;
  }

  return false;
}

/**
 * Queue failed emails for retry
 */
private async queueFailedEmail(options: EmailOptions): Promise<void> {
  try {
    await this.queueEmail({
      to: options.to,
      subject: options.subject,
      htmlContent: options.html || '',
      type: EmailType.TRANSACTIONAL,
    }, undefined, 10); // High priority
  } catch (error) {
    this.logger.error('Failed to queue email for retry', error);
    // Don't throw - we've already logged the original error
  }
}
```

#### 2.5 Enhance `sendEmailWithLogging` Method
```typescript
async sendEmailWithLogging(dto: SendEmailDto, userId?: string) {
  let emailLog;

  try {
    // Create email log
    emailLog = await this.prisma.emailLog.create({
      data: {
        userId,
        to: dto.to,
        cc: dto.cc || [],
        bcc: dto.bcc || [],
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        textContent: dto.textContent,
        type: dto.type,
        status: EmailStatus.PENDING,
        metadata: dto.metadata,
      },
    });

    // Send email using existing method with retry logic
    await this.sendEmail({
      to: dto.to,
      subject: dto.subject,
      html: dto.htmlContent,
    });

    // Update log on success
    await this.prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.log(`Email sent and logged: ${emailLog.id}`);

    return { success: true, emailLogId: emailLog.id };
  } catch (error: any) {
    this.logger.error('Failed to send email with logging', {
      emailLogId: emailLog?.id,
      error: error.message,
    });

    // Update log on failure
    if (emailLog) {
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: error.message,
        },
      }).catch(err => {
        this.logger.error('Failed to update email log', err);
      });
    }

    throw error;
  }
}
```

## 3. KYC Provider Service Error Handling

### Location
`src/modules/organization-kyc/services/kyc-provider.service.ts`

### Required Changes

#### 3.1 Add Imports
```typescript
import {
  KycException,
  KycProviderNotConfiguredException,
  KycApplicationNotFoundException,
  KycVerificationNotInitiatedException,
  KycDocumentUploadException,
  KycDocumentInvalidException,
  KycDocumentProcessingException,
  KycApplicantCreationException,
  KycCheckCreationException,
  KycCheckRetrievalException,
  KycApiCommunicationException,
  KycWebhookVerificationException,
} from '@/common/exceptions';
```

#### 3.2 Enhance `initiateVerification` Method
```typescript
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
    throw new KycApplicationNotFoundException(organizationId, 'organizationId');
  }

  const kycApplication = await this.prisma.kycApplication.findFirst({
    where: { organizationId },
  });

  if (!kycApplication) {
    throw new KycApplicationNotFoundException(organizationId, 'organizationId', {
      reason: 'No KYC application found for this organization',
    });
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
  } catch (error: any) {
    this.logger.error('Failed to initiate KYC verification', {
      organizationId,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof KycException) {
      throw error;
    }

    // Handle provider-specific errors
    if (error.response?.status === 401) {
      throw new KycProviderNotConfiguredException(this.providerType.toString(), {
        reason: 'Authentication failed with KYC provider',
      });
    } else if (error.response?.status === 429) {
      throw new KycApiCommunicationException(
        this.providerType.toString(),
        'applicants',
        error.response.status,
        'Rate limit exceeded',
        true,
      );
    } else if (error.response?.status >= 500) {
      throw new KycApplicantCreationException(
        this.providerType.toString(),
        `Provider error: ${error.message}`,
        true,
      );
    }

    throw new KycApplicantCreationException(
      this.providerType.toString(),
      error.message,
      false,
    );
  }
}
```

#### 3.3 Enhance `submitDocument` Method
```typescript
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
    throw new KycApplicationNotFoundException(organizationId, 'organizationId');
  }

  const verificationData = kycApplication.verificationData as any;
  const applicantId = verificationData?.providerApplicantId;

  if (!applicantId) {
    throw new KycVerificationNotInitiatedException(organizationId);
  }

  // Validate file
  const validationErrors: string[] = [];

  if (!file || file.length === 0) {
    validationErrors.push('File is empty');
  }

  if (file.length > 10 * 1024 * 1024) { // 10MB limit
    validationErrors.push('File size exceeds 10MB limit');
  }

  const validContentTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!validContentTypes.includes(contentType)) {
    validationErrors.push(`Invalid file type. Allowed: ${validContentTypes.join(', ')}`);
  }

  if (validationErrors.length > 0) {
    throw new KycDocumentInvalidException(documentType, validationErrors);
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
  } catch (error: any) {
    this.logger.error('Failed to submit document to provider', {
      organizationId,
      documentType,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof KycException) {
      throw error;
    }

    // Handle provider-specific errors
    if (error.response?.status === 400) {
      throw new KycDocumentInvalidException(documentType, [error.message || 'Invalid document']);
    } else if (error.response?.status === 429) {
      throw new KycApiCommunicationException(
        this.providerType.toString(),
        'documents',
        error.response.status,
        'Rate limit exceeded',
        true,
      );
    } else if (error.response?.status >= 500) {
      throw new KycDocumentUploadException(
        documentType,
        `Provider error: ${error.message}`,
        true,
      );
    }

    throw new KycDocumentUploadException(documentType, error.message, false);
  }
}
```

#### 3.4 Enhance `createVerificationCheck` Method
```typescript
async createVerificationCheck(
  organizationId: string,
  userId: string,
  ipAddress?: string,
): Promise<{ checkId: string; status: KycCheckStatus }> {
  const kycApplication = await this.prisma.kycApplication.findFirst({
    where: { organizationId },
  });

  if (!kycApplication) {
    throw new KycApplicationNotFoundException(organizationId, 'organizationId');
  }

  const verificationData = kycApplication.verificationData as any;
  const applicantId = verificationData?.providerApplicantId;

  if (!applicantId) {
    throw new KycVerificationNotInitiatedException(organizationId);
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
  } catch (error: any) {
    this.logger.error('Failed to create verification check', {
      organizationId,
      applicantId,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof KycException) {
      throw error;
    }

    // Handle provider-specific errors
    if (error.response?.status === 422) {
      throw new KycCheckCreationException(
        this.providerType.toString(),
        applicantId,
        'Missing required documents or data',
        false,
      );
    } else if (error.response?.status === 429) {
      throw new KycApiCommunicationException(
        this.providerType.toString(),
        'checks',
        error.response.status,
        'Rate limit exceeded',
        true,
      );
    } else if (error.response?.status >= 500) {
      throw new KycCheckCreationException(
        this.providerType.toString(),
        applicantId,
        `Provider error: ${error.message}`,
        true,
      );
    }

    throw new KycCheckCreationException(
      this.providerType.toString(),
      applicantId,
      error.message,
      false,
    );
  }
}
```

#### 3.5 Enhance `getCheckStatus` Method
```typescript
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

    this.logger.log(`Check status retrieved: ${checkId}, status: ${report.status}`);

    return report;
  } catch (error: any) {
    this.logger.error('Failed to get check status', {
      checkId,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof KycException) {
      throw error;
    }

    // Handle provider-specific errors
    if (error.response?.status === 404) {
      throw new KycCheckRetrievalException(checkId, 'Check not found', false);
    } else if (error.response?.status === 429) {
      throw new KycApiCommunicationException(
        this.providerType.toString(),
        `checks/${checkId}`,
        error.response.status,
        'Rate limit exceeded',
        true,
      );
    } else if (error.response?.status >= 500) {
      throw new KycCheckRetrievalException(
        checkId,
        `Provider error: ${error.message}`,
        true,
      );
    }

    throw new KycCheckRetrievalException(checkId, error.message, true);
  }
}
```

#### 3.6 Enhance `processWebhook` Method
```typescript
async processWebhook(
  payload: any,
  signature: string,
  organizationId?: string,
): Promise<void> {
  // Verify webhook signature
  let isValid: boolean;

  try {
    isValid = this.provider.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );
  } catch (error: any) {
    this.logger.error('Webhook signature verification failed', {
      error: error.message,
    });

    throw new KycWebhookVerificationException(
      this.providerType.toString(),
      error.message,
    );
  }

  if (!isValid) {
    this.logger.warn('Invalid webhook signature received');
    throw new KycWebhookVerificationException(
      this.providerType.toString(),
      'Signature verification failed',
    );
  }

  try {
    // Parse webhook
    const webhookData = this.provider.parseWebhook(payload);

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
  } catch (error: any) {
    this.logger.error('Failed to process webhook', {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof KycException) {
      throw error;
    }

    // Don't throw - webhook processing failures shouldn't break the flow
    // The error is already logged
  }
}
```

## 4. Error Handling Best Practices

### 4.1 Logging Standards
- Always log at ERROR level with structured context
- Include relevant IDs, parameters, and error details
- Never log sensitive data (passwords, tokens, full credit cards)
- Use consistent log format across services

### 4.2 Error Response Format
All custom exceptions return standardized error responses:
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "metadata": {
    "field1": "value1",
    "field2": "value2"
  },
  "timestamp": "2025-12-04T12:00:00.000Z"
}
```

### 4.3 Transient vs Permanent Errors
- **Transient errors**: Should be retried (network issues, rate limits, 5xx errors)
- **Permanent errors**: Should not be retried (validation errors, 4xx errors, auth failures)
- Use the `isTransient` metadata flag to indicate retry-ability

### 4.4 Retry Strategy
- Use exponential backoff for retries
- Maximum 3 retries for transient errors
- Email service: Queue failed emails after max retries
- Payment service: Don't retry payment attempts (customer must re-initiate)

### 4.5 Circuit Breaker Pattern (Future Enhancement)
Consider implementing circuit breakers for external services:
- Open circuit after N consecutive failures
- Half-open state for testing recovery
- Close circuit after successful requests

## 5. Testing Error Handling

### 5.1 Unit Tests
Create tests for each error scenario:
```typescript
describe('PaymentsService - Error Handling', () => {
  it('should throw InvalidPaymentAmountException for negative amounts', async () => {
    await expect(service.createPaymentIntent(-10, 'usd')).rejects.toThrow(
      InvalidPaymentAmountException,
    );
  });

  it('should throw CardDeclinedException for declined cards', async () => {
    // Mock Stripe to return card error
    // Verify correct exception is thrown
  });

  it('should retry transient errors with exponential backoff', async () => {
    // Mock transient failure then success
    // Verify retry count and delays
  });
});
```

### 5.2 Integration Tests
Test real error scenarios:
- Invalid API keys
- Network timeouts
- Rate limit responses
- Malformed requests

## 6. Monitoring and Alerting

### 6.1 Metrics to Track
- Error rate by type
- Retry success rate
- Average retry count
- Email queue size
- Payment failure rate

### 6.2 Alerts
Set up alerts for:
- Error rate > 5%
- Email queue > 1000 messages
- Payment provider unavailable
- KYC verification failures > 20%

## 7. Implementation Checklist

- [x] Create custom exception classes
- [ ] Update PaymentsService with error handling
- [ ] Update EmailService with retry logic and error handling
- [ ] Update KycProviderService with error handling
- [ ] Add unit tests for error scenarios
- [ ] Add integration tests
- [ ] Update API documentation
- [ ] Set up error monitoring
- [ ] Configure alerts
- [ ] Train team on error handling patterns

## 8. Migration Notes

When implementing these changes:
1. Test in development environment first
2. Monitor error logs closely after deployment
3. Adjust retry parameters based on real-world performance
4. Update frontend to handle new error codes
5. Document API changes for consumers

## Conclusion

These error handling improvements significantly enhance production reliability by:
- Providing clear, actionable error messages
- Implementing automatic retry for transient failures
- Logging comprehensive error context for debugging
- Categorizing errors for appropriate handling
- Queueing failed operations for later retry
- Maintaining system stability during external service failures
