import { Injectable, Logger } from '@nestjs/common';
import { FlutterwaveProvider } from '../providers/flutterwave.provider';
import { PaystackProvider } from '../providers/paystack.provider';
import { CreatePaymentRequest, PaymentResult } from '../interfaces';

/**
 * Africa Payments Service
 * Unified service for African payment methods
 *
 * Providers:
 * - Flutterwave (Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda, Rwanda)
 * - Paystack (Nigeria, Ghana, South Africa, Kenya)
 *
 * Payment Methods:
 * - Card payments
 * - Mobile Money (M-Pesa, MTN, Airtel)
 * - Bank transfers
 * - USSD
 */

@Injectable()
export class AfricaPaymentsService {
  private readonly logger = new Logger(AfricaPaymentsService.name);

  // Country to provider mapping
  private readonly COUNTRY_PROVIDERS = {
    NG: ['flutterwave', 'paystack'], // Nigeria
    GH: ['flutterwave', 'paystack'], // Ghana
    KE: ['flutterwave', 'paystack'], // Kenya
    ZA: ['flutterwave', 'paystack'], // South Africa
    TZ: ['flutterwave'], // Tanzania
    UG: ['flutterwave'], // Uganda
    RW: ['flutterwave'], // Rwanda
  };

  constructor(
    private flutterwaveProvider: FlutterwaveProvider,
    private paystackProvider: PaystackProvider,
  ) {}

  /**
   * Create payment with automatic provider selection
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const country = request.customer.address?.country || 'NG';
    const provider = this.selectProvider(country, request.currency);

    this.logger.log(`Processing African payment via ${provider} for ${country}`);

    if (provider === 'paystack' && this.paystackProvider.isEnabled()) {
      return this.paystackProvider.createPayment(request);
    }

    if (provider === 'flutterwave' && this.flutterwaveProvider.isEnabled()) {
      return this.flutterwaveProvider.createPayment(request);
    }

    throw new Error('No payment provider available for this region');
  }

  /**
   * Select best provider for country and currency
   */
  private selectProvider(country: string, currency: string): string {
    const providers = (this.COUNTRY_PROVIDERS as Record<string, string[]>)[country] || ['flutterwave'];

    // Paystack is preferred for NGN in Nigeria
    if (country === 'NG' && currency === 'NGN') {
      return 'paystack';
    }

    // Flutterwave has broader coverage
    return providers[0];
  }

  /**
   * Get supported payment methods for country
   */
  getSupportedMethods(country: string): string[] {
    const methods = {
      NG: ['card', 'bank_transfer', 'ussd', 'qr'],
      GH: ['card', 'mobile_money', 'bank_transfer'],
      KE: ['card', 'mpesa', 'bank_transfer'],
      ZA: ['card', 'eft', 'instant_eft'],
      TZ: ['card', 'mobile_money', 'bank_transfer'],
      UG: ['card', 'mobile_money'],
      RW: ['card', 'mobile_money'],
    };

    return (methods as Record<string, string[]>)[country] || ['card'];
  }

  /**
   * Get mobile money providers for country
   */
  getMobileMoneyProviders(country: string): string[] {
    const providers = {
      KE: ['M-Pesa'],
      GH: ['MTN', 'Vodafone', 'AirtelTigo'],
      TZ: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
      UG: ['MTN', 'Airtel'],
      RW: ['MTN', 'Airtel'],
    };

    return (providers as Record<string, string[]>)[country] || [];
  }
}
