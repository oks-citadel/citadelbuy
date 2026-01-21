import { Injectable, Logger } from '@nestjs/common';
import { StripeProvider } from '../providers/stripe.provider';
import { CreatePaymentRequest, PaymentResult } from '../interfaces';

/**
 * US Payments Service
 * Payment methods for United States
 *
 * Providers:
 * - Stripe (primary)
 *
 * Payment Methods:
 * - Credit/Debit Cards
 * - ACH Direct Debit
 * - ACH Credit Transfer
 * - Wire Transfer
 * - Apple Pay
 * - Google Pay
 */

@Injectable()
export class USPaymentsService {
  private readonly logger = new Logger(USPaymentsService.name);

  constructor(private stripeProvider: StripeProvider) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return this.stripeProvider.createPayment(request);
  }

  /**
   * Create ACH payment
   */
  async createACHPayment(
    request: CreatePaymentRequest & {
      accountNumber: string;
      routingNumber: string;
      accountType: 'checking' | 'savings';
    },
  ): Promise<PaymentResult> {
    // In production, this would create ACH payment via Stripe or Plaid
    this.logger.log('Creating ACH payment');

    return this.stripeProvider.createPayment({
      ...request,
      metadata: {
        ...request.metadata,
        paymentMethod: 'ach',
        accountType: request.accountType,
      },
    });
  }

  getSupportedMethods(): string[] {
    return [
      'card',
      'ach_debit',
      'ach_credit',
      'wire',
      'apple_pay',
      'google_pay',
    ];
  }
}
