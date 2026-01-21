import { Injectable, Logger } from '@nestjs/common';
import { StripeProvider } from '../providers/stripe.provider';
import { CreatePaymentRequest, PaymentResult } from '../interfaces';

/**
 * EU Payments Service
 * Payment methods for European Union
 *
 * Providers:
 * - Stripe (SEPA, Cards)
 *
 * Payment Methods:
 * - SEPA Direct Debit
 * - SEPA Credit Transfer
 * - Credit/Debit Cards
 * - Bancontact (Belgium)
 * - iDEAL (Netherlands)
 * - Sofort (Germany)
 * - Giropay (Germany)
 */

@Injectable()
export class EUPaymentsService {
  private readonly logger = new Logger(EUPaymentsService.name);

  constructor(private stripeProvider: StripeProvider) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    return this.stripeProvider.createPayment(request);
  }

  /**
   * Create SEPA payment
   */
  async createSEPAPayment(
    request: CreatePaymentRequest & {
      iban: string;
      bic?: string;
    },
  ): Promise<PaymentResult> {
    this.logger.log('Creating SEPA payment');

    return this.stripeProvider.createPayment({
      ...request,
      metadata: {
        ...request.metadata,
        paymentMethod: 'sepa_debit',
        iban: request.iban,
        bic: request.bic,
      },
    });
  }

  /**
   * Get payment methods for country
   */
  getCountryMethods(country: string): string[] {
    const methods: Record<string, string[]> = {
      NL: ['card', 'sepa', 'ideal'],
      DE: ['card', 'sepa', 'sofort', 'giropay'],
      BE: ['card', 'sepa', 'bancontact'],
      AT: ['card', 'sepa', 'eps'],
      FR: ['card', 'sepa'],
      IT: ['card', 'sepa'],
      ES: ['card', 'sepa'],
      default: ['card', 'sepa'],
    };

    return methods[country] || methods.default;
  }
}
