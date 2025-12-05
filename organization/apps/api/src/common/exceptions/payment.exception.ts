import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Payment Exception
 */
export class PaymentException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(
      {
        message,
        code: code || 'PAYMENT_ERROR',
        metadata,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

/**
 * Payment Provider Configuration Error
 * Thrown when payment provider (Stripe, PayPal) is not properly configured
 */
export class PaymentProviderNotConfiguredException extends PaymentException {
  constructor(provider: string, metadata?: Record<string, any>) {
    super(
      `Payment provider '${provider}' is not properly configured. Please check your configuration.`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'PAYMENT_PROVIDER_NOT_CONFIGURED',
      { provider, ...metadata },
    );
  }
}

/**
 * Payment Intent Creation Failed
 * Thrown when creating a payment intent fails
 */
export class PaymentIntentCreationException extends PaymentException {
  constructor(provider: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to create payment intent with ${provider}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'PAYMENT_INTENT_CREATION_FAILED',
      { provider, reason, ...metadata },
    );
  }
}

/**
 * Payment Processing Failed
 * Thrown when processing a payment fails
 */
export class PaymentProcessingException extends PaymentException {
  constructor(reason: string, metadata?: Record<string, any>) {
    super(
      `Payment processing failed: ${reason}`,
      HttpStatus.PAYMENT_REQUIRED,
      'PAYMENT_PROCESSING_FAILED',
      { reason, ...metadata },
    );
  }
}

/**
 * Refund Failed Exception
 * Thrown when a refund operation fails
 */
export class RefundFailedException extends PaymentException {
  constructor(
    provider: string,
    transactionId: string,
    reason?: string,
    metadata?: Record<string, any>,
  ) {
    super(
      `Refund failed for ${provider} transaction ${transactionId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'REFUND_FAILED',
      { provider, transactionId, reason, ...metadata },
    );
  }
}

/**
 * Payment Method Attachment Failed
 * Thrown when attaching a payment method fails
 */
export class PaymentMethodAttachmentException extends PaymentException {
  constructor(paymentMethodId: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to attach payment method ${paymentMethodId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'PAYMENT_METHOD_ATTACHMENT_FAILED',
      { paymentMethodId, reason, ...metadata },
    );
  }
}

/**
 * Payment Webhook Verification Failed
 * Thrown when webhook signature verification fails
 */
export class PaymentWebhookVerificationException extends PaymentException {
  constructor(provider: string, metadata?: Record<string, any>) {
    super(
      `Webhook signature verification failed for ${provider}`,
      HttpStatus.UNAUTHORIZED,
      'PAYMENT_WEBHOOK_VERIFICATION_FAILED',
      { provider, ...metadata },
    );
  }
}

/**
 * Insufficient Funds Exception
 * Thrown when payment fails due to insufficient funds
 */
export class InsufficientFundsException extends PaymentException {
  constructor(amount: number, currency: string, metadata?: Record<string, any>) {
    super(
      `Insufficient funds to complete payment of ${amount} ${currency}`,
      HttpStatus.PAYMENT_REQUIRED,
      'INSUFFICIENT_FUNDS',
      { amount, currency, ...metadata },
    );
  }
}

/**
 * Payment Card Declined Exception
 * Thrown when a card payment is declined
 */
export class CardDeclinedException extends PaymentException {
  constructor(reason?: string, metadata?: Record<string, any>) {
    super(
      `Card payment declined${reason ? `: ${reason}` : ''}`,
      HttpStatus.PAYMENT_REQUIRED,
      'CARD_DECLINED',
      { reason, ...metadata },
    );
  }
}

/**
 * Payment Amount Invalid Exception
 * Thrown when payment amount is invalid
 */
export class InvalidPaymentAmountException extends PaymentException {
  constructor(amount: number, reason?: string, metadata?: Record<string, any>) {
    super(
      `Invalid payment amount: ${amount}${reason ? `. ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_PAYMENT_AMOUNT',
      { amount, reason, ...metadata },
    );
  }
}

/**
 * PayPal Order Creation Failed
 * Thrown when PayPal order creation fails
 */
export class PayPalOrderCreationException extends PaymentException {
  constructor(reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to create PayPal order${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'PAYPAL_ORDER_CREATION_FAILED',
      { reason, ...metadata },
    );
  }
}

/**
 * PayPal Capture Failed
 * Thrown when PayPal order capture fails
 */
export class PayPalCaptureException extends PaymentException {
  constructor(orderId: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to capture PayPal order ${orderId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'PAYPAL_CAPTURE_FAILED',
      { orderId, reason, ...metadata },
    );
  }
}

/**
 * Payment Token Expired Exception
 * Thrown when a payment token or access token has expired
 */
export class PaymentTokenExpiredException extends PaymentException {
  constructor(tokenType: string, metadata?: Record<string, any>) {
    super(
      `${tokenType} has expired. Please request a new token.`,
      HttpStatus.UNAUTHORIZED,
      'PAYMENT_TOKEN_EXPIRED',
      { tokenType, ...metadata },
    );
  }
}

/**
 * Stripe Customer Not Found Exception
 * Thrown when a Stripe customer cannot be found or created
 */
export class StripeCustomerException extends PaymentException {
  constructor(userId: string, reason?: string, metadata?: Record<string, any>) {
    super(
      `Failed to get or create Stripe customer for user ${userId}${reason ? `: ${reason}` : ''}`,
      HttpStatus.BAD_REQUEST,
      'STRIPE_CUSTOMER_ERROR',
      { userId, reason, ...metadata },
    );
  }
}
