import { Injectable, Logger } from '@nestjs/common';
import { StripeProvider } from '../providers/stripe.provider';
import { CreatePaymentRequest, PaymentResult } from '../interfaces';

/**
 * Asia Payments Service
 * Payment methods for Asian markets
 *
 * Providers:
 * - Stripe (Cards, regional methods)
 * - Alipay (China)
 * - WeChat Pay (China)
 *
 * Payment Methods:
 * - Alipay (China)
 * - WeChat Pay (China)
 * - GrabPay (Southeast Asia)
 * - PayNow (Singapore)
 * - UPI (India)
 * - Cards
 */

@Injectable()
export class AsiaPaymentsService {
  private readonly logger = new Logger(AsiaPaymentsService.name);

  constructor(private stripeProvider: StripeProvider) {}

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const country = request.customer.address?.country;

    // Route to appropriate payment method
    if (country === 'CN') {
      return this.createChinaPayment(request);
    }

    if (country === 'IN') {
      return this.createIndiaPayment(request);
    }

    return this.stripeProvider.createPayment(request);
  }

  private async createChinaPayment(
    request: CreatePaymentRequest,
  ): Promise<PaymentResult> {
    this.logger.log('Creating China payment (Alipay/WeChat)');

    // In production, integrate with Alipay/WeChat APIs
    return this.stripeProvider.createPayment({
      ...request,
      metadata: {
        ...request.metadata,
        preferredMethod: 'alipay',
      },
    });
  }

  private async createIndiaPayment(
    request: CreatePaymentRequest,
  ): Promise<PaymentResult> {
    this.logger.log('Creating India payment (UPI)');

    return this.stripeProvider.createPayment({
      ...request,
      metadata: {
        ...request.metadata,
        preferredMethod: 'upi',
      },
    });
  }

  getCountryMethods(country: string): string[] {
    const methods: Record<string, string[]> = {
      CN: ['alipay', 'wechat_pay', 'card'],
      IN: ['upi', 'card', 'netbanking', 'wallet'],
      SG: ['paynow', 'grabpay', 'card'],
      MY: ['fpx', 'grabpay', 'card'],
      ID: ['gopay', 'ovo', 'card'],
      TH: ['promptpay', 'truemoney', 'card'],
      default: ['card'],
    };

    return methods[country] || methods.default;
  }
}
