import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Email Exception
 */
export class EmailException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(
      {
        message,
        code: code || 'EMAIL_ERROR',
        metadata,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

/**
 * Email Service Not Configured Exception
 * Thrown when email service is not properly configured
 */
export class EmailServiceNotConfiguredException extends EmailException {
  constructor(missingConfig?: string[], metadata?: Record<string, any>) {
    super(
      `Email service is not properly configured${missingConfig ? `. Missing: ${missingConfig.join(', ')}` : ''}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'EMAIL_SERVICE_NOT_CONFIGURED',
      { missingConfig, ...metadata },
    );
  }
}

/**
 * Email Sending Failed Exception
 * Thrown when sending an email fails
 */
export class EmailSendingException extends EmailException {
  constructor(
    recipient: string,
    reason?: string,
    public readonly isTransient: boolean = false,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to send email to ${recipient}${reason ? `: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_SENDING_FAILED',
      { recipient, reason, isTransient, ...metadata },
    );
  }
}

/**
 * SMTP Connection Failed Exception
 * Thrown when SMTP connection fails
 */
export class SmtpConnectionException extends EmailException {
  constructor(
    host: string,
    port: number,
    reason?: string,
    public readonly isTransient: boolean = true,
    metadata?: Record<string, any>,
  ) {
    super(
      `Failed to connect to SMTP server ${host}:${port}${reason ? `: ${reason}` : ''}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'SMTP_CONNECTION_FAILED',
      { host, port, reason, isTransient, ...metadata },
    );
  }
}

/**
 * SMTP Authentication Failed Exception
 * Thrown when SMTP authentication fails
 */
export class SmtpAuthenticationException extends EmailException {
  constructor(username: string, metadata?: Record<string, any>) {
    super(
      `SMTP authentication failed for user ${username}`,
      HttpStatus.UNAUTHORIZED,
      'SMTP_AUTHENTICATION_FAILED',
      { username, ...metadata },
    );
  }
}

/**
 * Email Template Not Found Exception
 * Thrown when an email template cannot be found
 */
export class EmailTemplateNotFoundException extends EmailException {
  constructor(templateName: string, metadata?: Record<string, any>) {
    super(
      `Email template '${templateName}' not found`,
      HttpStatus.NOT_FOUND,
      'EMAIL_TEMPLATE_NOT_FOUND',
      { templateName, ...metadata },
    );
  }
}

/**
 * Email Template Compilation Exception
 * Thrown when email template compilation fails
 */
export class EmailTemplateCompilationException extends EmailException {
  constructor(templateName: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to compile email template '${templateName}'${reason ? `: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_TEMPLATE_COMPILATION_FAILED',
      { templateName, reason, ...metadata },
    );
  }
}

/**
 * Invalid Email Address Exception
 * Thrown when an email address is invalid
 */
export class InvalidEmailAddressException extends EmailException {
  constructor(email: string, metadata?: Record<string, any>) {
    super(
      `Invalid email address: ${email}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_EMAIL_ADDRESS',
      { email, ...metadata },
    );
  }
}

/**
 * Email Queue Full Exception
 * Thrown when the email queue is full and cannot accept more emails
 */
export class EmailQueueFullException extends EmailException {
  constructor(currentSize: number, maxSize: number, metadata?: Record<string, any>) {
    super(
      `Email queue is full (${currentSize}/${maxSize}). Please try again later.`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'EMAIL_QUEUE_FULL',
      { currentSize, maxSize, ...metadata },
    );
  }
}

/**
 * Email Rate Limit Exceeded Exception
 * Thrown when email sending rate limit is exceeded
 */
export class EmailRateLimitException extends EmailException {
  constructor(
    recipient: string,
    limit: number,
    timeWindow: string,
    metadata?: Record<string, any>,
  ) {
    super(
      `Email rate limit exceeded for ${recipient}. Limit: ${limit} per ${timeWindow}`,
      HttpStatus.TOO_MANY_REQUESTS,
      'EMAIL_RATE_LIMIT_EXCEEDED',
      { recipient, limit, timeWindow, ...metadata },
    );
  }
}

/**
 * Email Attachment Failed Exception
 * Thrown when attaching a file to an email fails
 */
export class EmailAttachmentException extends EmailException {
  constructor(fileName: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to attach file ${fileName}${reason ? `: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_ATTACHMENT_FAILED',
      { fileName, reason, ...metadata },
    );
  }
}

/**
 * Email Bounce Exception
 * Thrown when an email bounces
 */
export class EmailBounceException extends EmailException {
  constructor(
    recipient: string,
    bounceType: 'hard' | 'soft',
    reason?: string,
    metadata?: Record<string, any>,
  ) {
    super(
      `Email to ${recipient} bounced (${bounceType})${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'EMAIL_BOUNCED',
      { recipient, bounceType, reason, ...metadata },
    );
  }
}

/**
 * Email Delivery Timeout Exception
 * Thrown when email delivery times out
 */
export class EmailDeliveryTimeoutException extends EmailException {
  constructor(
    recipient: string,
    timeoutSeconds: number,
    public readonly isTransient: boolean = true,
    metadata?: Record<string, any>,
  ) {
    super(
      `Email delivery to ${recipient} timed out after ${timeoutSeconds} seconds`,
      HttpStatus.GATEWAY_TIMEOUT,
      'EMAIL_DELIVERY_TIMEOUT',
      { recipient, timeoutSeconds, isTransient, ...metadata },
    );
  }
}

/**
 * Email Spam Rejected Exception
 * Thrown when an email is rejected as spam
 */
export class EmailSpamRejectedException extends EmailException {
  constructor(recipient: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Email to ${recipient} rejected as spam${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'EMAIL_SPAM_REJECTED',
      { recipient, reason, ...metadata },
    );
  }
}

/**
 * Transient Email Exception
 * Wrapper for transient errors that should be retried
 */
export class TransientEmailException extends EmailException {
  constructor(
    originalError: Error,
    recipient: string,
    retryCount: number = 0,
    maxRetries: number = 3,
    metadata?: Record<string, any>,
  ) {
    super(
      `Transient email error for ${recipient} (retry ${retryCount}/${maxRetries}): ${originalError.message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'TRANSIENT_EMAIL_ERROR',
      { recipient, retryCount, maxRetries, originalError: originalError.message, ...metadata },
    );
  }
}
