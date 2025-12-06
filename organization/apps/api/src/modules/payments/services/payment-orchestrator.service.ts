import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  PaymentProviderType,
  PaymentStatus,
  CreatePaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  IPaymentProvider,
  ISubscriptionProvider,
  IIAPProvider,
  CreateSubscriptionRequest,
  SubscriptionResult,
  IAPValidationResult,
  IAPSubscriptionStatus,
} from '../interfaces';
import { StripeProvider } from '../providers/stripe.provider';
import { PayPalProvider } from '../providers/paypal.provider';
import { FlutterwaveProvider } from '../providers/flutterwave.provider';
import { PaystackProvider } from '../providers/paystack.provider';
import { AppleIAPProvider } from '../providers/apple-iap.provider';
import { GoogleIAPProvider } from '../providers/google-iap.provider';

/**
 * Payment Orchestrator Service
 *
 * Unified payment service that orchestrates all payment providers.
 * Single point of entry for all payment operations.
 */
@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);
  private readonly providers: Map<PaymentProviderType, IPaymentProvider> = new Map();
  private readonly subscriptionProviders: Map<PaymentProviderType, ISubscriptionProvider> = new Map();
  private readonly iapProviders: Map<PaymentProviderType, IIAPProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private stripeProvider: StripeProvider,
    private paypalProvider: PayPalProvider,
    private flutterwaveProvider: FlutterwaveProvider,
    private paystackProvider: PaystackProvider,
    private appleIAPProvider: AppleIAPProvider,
    private googleIAPProvider: GoogleIAPProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Payment providers
    this.providers.set(PaymentProviderType.STRIPE, this.stripeProvider);
    this.providers.set(PaymentProviderType.PAYPAL, this.paypalProvider);
    this.providers.set(PaymentProviderType.FLUTTERWAVE, this.flutterwaveProvider);
    this.providers.set(PaymentProviderType.PAYSTACK, this.paystackProvider);

    // Subscription providers
    this.subscriptionProviders.set(PaymentProviderType.STRIPE, this.stripeProvider);
    this.subscriptionProviders.set(PaymentProviderType.PAYPAL, this.paypalProvider);
    this.subscriptionProviders.set(PaymentProviderType.PAYSTACK, this.paystackProvider);

    // IAP providers
    this.iapProviders.set(PaymentProviderType.APPLE_IAP, this.appleIAPProvider);
    this.iapProviders.set(PaymentProviderType.GOOGLE_IAP, this.googleIAPProvider);

    this.logger.log('Payment providers initialized');
  }

  /**
   * Get available payment providers for a region/currency
   */
  getAvailableProviders(currency?: string, country?: string): PaymentProviderType[] {
    const available: PaymentProviderType[] = [];

    // Check each provider
    for (const [type, provider] of this.providers) {
      if (provider.isEnabled()) {
        // Apply regional restrictions
        if (this.isProviderAvailableForRegion(type, currency, country)) {
          available.push(type);
        }
      }
    }

    return available;
  }

  private isProviderAvailableForRegion(
    type: PaymentProviderType,
    currency?: string,
    country?: string,
  ): boolean {
    // Flutterwave - primarily African markets
    if (type === PaymentProviderType.FLUTTERWAVE) {
      const supportedCountries = ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW', 'CM', 'CI'];
      const supportedCurrencies = ['NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'RWF', 'XAF', 'XOF', 'USD'];
      if (country && !supportedCountries.includes(country)) return false;
      if (currency && !supportedCurrencies.includes(currency)) return false;
    }

    // Paystack - Nigeria and Ghana focus
    if (type === PaymentProviderType.PAYSTACK) {
      const supportedCountries = ['NG', 'GH', 'ZA', 'KE'];
      const supportedCurrencies = ['NGN', 'GHS', 'ZAR', 'KES', 'USD'];
      if (country && !supportedCountries.includes(country)) return false;
      if (currency && !supportedCurrencies.includes(currency)) return false;
    }

    return true;
  }

  /**
   * Create a payment using the specified provider
   */
  async createPayment(
    providerType: PaymentProviderType,
    request: CreatePaymentRequest,
  ): Promise<PaymentResult> {
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Provider ${providerType} not found`);
    }

    if (!provider.isEnabled()) {
      throw new BadRequestException(`Provider ${providerType} is not enabled`);
    }

    const result = await provider.createPayment(request);

    // Log payment attempt
    if (result.success) {
      await this.logPaymentAttempt({
        provider: providerType,
        transactionId: result.transactionId,
        amount: request.amount,
        currency: request.currency,
        status: result.status,
        metadata: request.metadata,
      });
    }

    return result;
  }

  /**
   * Create a payment with automatic provider selection
   */
  async createPaymentAuto(request: CreatePaymentRequest): Promise<PaymentResult> {
    const country = request.customer.address?.country;
    const currency = request.currency;

    // Get available providers for this region
    const available = this.getAvailableProviders(currency, country);

    if (available.length === 0) {
      throw new BadRequestException('No payment providers available for this region');
    }

    // Priority order for provider selection
    const priorityOrder = [
      PaymentProviderType.STRIPE,
      PaymentProviderType.PAYPAL,
      PaymentProviderType.PAYSTACK,
      PaymentProviderType.FLUTTERWAVE,
    ];

    const selectedProvider = priorityOrder.find(p => available.includes(p));

    if (!selectedProvider) {
      throw new BadRequestException('No suitable payment provider found');
    }

    return this.createPayment(selectedProvider, request);
  }

  /**
   * Capture a payment
   */
  async capturePayment(
    providerType: PaymentProviderType,
    transactionId: string,
    amount?: number,
  ): Promise<PaymentResult> {
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Provider ${providerType} not found`);
    }

    return provider.capturePayment(transactionId, amount);
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    providerType: PaymentProviderType,
    request: RefundRequest,
  ): Promise<RefundResult> {
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Provider ${providerType} not found`);
    }

    const result = await provider.refundPayment(request);

    // Log refund attempt
    if (result.success) {
      await this.logRefundAttempt({
        provider: providerType,
        transactionId: request.transactionId,
        refundId: result.refundId,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      });
    }

    return result;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    providerType: PaymentProviderType,
    transactionId: string,
  ): Promise<PaymentResult> {
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Provider ${providerType} not found`);
    }

    return provider.getPaymentStatus(transactionId);
  }

  // ==================== Subscription Methods ====================

  /**
   * Create a subscription
   */
  async createSubscription(
    providerType: PaymentProviderType,
    request: CreateSubscriptionRequest,
  ): Promise<SubscriptionResult> {
    const provider = this.subscriptionProviders.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Subscription provider ${providerType} not found`);
    }

    return provider.createSubscription(request);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    providerType: PaymentProviderType,
    subscriptionId: string,
    immediately?: boolean,
  ): Promise<SubscriptionResult> {
    const provider = this.subscriptionProviders.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Subscription provider ${providerType} not found`);
    }

    return provider.cancelSubscription(subscriptionId, immediately);
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(
    providerType: PaymentProviderType,
    subscriptionId: string,
  ): Promise<SubscriptionResult> {
    const provider = this.subscriptionProviders.get(providerType);

    if (!provider) {
      throw new BadRequestException(`Subscription provider ${providerType} not found`);
    }

    return provider.getSubscriptionStatus(subscriptionId);
  }

  // ==================== IAP Methods ====================

  /**
   * Validate an IAP receipt
   */
  async validateIAPReceipt(
    platform: 'ios' | 'android',
    receipt: string,
    productId?: string,
  ): Promise<IAPValidationResult> {
    const providerType = platform === 'ios'
      ? PaymentProviderType.APPLE_IAP
      : PaymentProviderType.GOOGLE_IAP;

    const provider = this.iapProviders.get(providerType);

    if (!provider) {
      throw new BadRequestException(`IAP provider for ${platform} not found`);
    }

    const result = await provider.validateReceipt(receipt, productId);

    // Log IAP validation
    if (result.isValid) {
      await this.logIAPValidation({
        platform,
        productId: result.productId,
        transactionId: result.transactionId,
        environment: result.environment,
      });
    }

    return result;
  }

  /**
   * Verify IAP subscription
   */
  async verifyIAPSubscription(
    platform: 'ios' | 'android',
    receipt: string,
    productId: string,
  ): Promise<IAPSubscriptionStatus> {
    const providerType = platform === 'ios'
      ? PaymentProviderType.APPLE_IAP
      : PaymentProviderType.GOOGLE_IAP;

    const provider = this.iapProviders.get(providerType);

    if (!provider) {
      throw new BadRequestException(`IAP provider for ${platform} not found`);
    }

    return provider.verifySubscription(receipt, productId);
  }

  /**
   * Sync IAP purchase with user account
   */
  async syncIAPPurchase(
    userId: string,
    platform: 'ios' | 'android',
    receipt: string,
    productId: string,
  ): Promise<{
    success: boolean;
    subscriptionUpdated?: boolean;
    walletUpdated?: boolean;
    error?: string;
  }> {
    try {
      // Validate the receipt
      const validation = await this.validateIAPReceipt(platform, receipt, productId);

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error?.message || 'Invalid receipt',
        };
      }

      // Check if this transaction was already processed
      // Note: walletTransaction model may not exist in all deployments
      const existingTransaction = await (this.prisma as any).walletTransaction?.findFirst?.({
        where: {
          providerTransactionId: validation.transactionId,
        },
      }).catch(() => null);

      if (existingTransaction) {
        return {
          success: true,
          subscriptionUpdated: false,
          walletUpdated: false,
        };
      }

      // Determine if this is a subscription or consumable
      const isSubscription = productId.includes('subscription') || productId.includes('premium');
      const isConsumable = productId.includes('coin') || productId.includes('credit') || productId.includes('boost');

      let subscriptionUpdated = false;
      let walletUpdated = false;

      if (isSubscription && validation.expiresDate) {
        // Update user subscription
        await this.updateUserSubscriptionFromIAP(userId, {
          productId,
          transactionId: validation.transactionId,
          originalTransactionId: validation.originalTransactionId,
          expiresDate: validation.expiresDate,
          platform,
        });
        subscriptionUpdated = true;
      }

      if (isConsumable) {
        // Add credits to user wallet
        const creditAmount = this.getCreditsForProduct(productId);
        await this.addCreditsToWallet(userId, creditAmount, {
          source: `iap_${platform}`,
          productId,
          transactionId: validation.transactionId,
        });
        walletUpdated = true;
      }

      return {
        success: true,
        subscriptionUpdated,
        walletUpdated,
      };
    } catch (error: any) {
      this.logger.error(`IAP sync error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== Helper Methods ====================

  private async updateUserSubscriptionFromIAP(
    userId: string,
    data: {
      productId: string;
      transactionId: string;
      originalTransactionId?: string;
      expiresDate: Date;
      platform: 'ios' | 'android';
    },
  ): Promise<void> {
    // Map IAP product ID to subscription plan
    const planId = this.mapIAPProductToPlan(data.productId);

    if (!planId) {
      this.logger.warn(`Unknown IAP product: ${data.productId}`);
      return;
    }

    // Find or create subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await this.prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          currentPeriodEnd: data.expiresDate,
          status: 'ACTIVE',
          metadata: {
            iapPlatform: data.platform,
            iapTransactionId: data.transactionId,
            iapOriginalTransactionId: data.originalTransactionId,
          },
        },
      });
    } else {
      // Create new subscription
      await this.prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: data.expiresDate,
          metadata: {
            iapPlatform: data.platform,
            iapTransactionId: data.transactionId,
            iapOriginalTransactionId: data.originalTransactionId,
          },
        },
      });
    }
  }

  private mapIAPProductToPlan(productId: string): string | null {
    // Map IAP product IDs to internal plan IDs
    const mapping: Record<string, string> = {
      'com.citadelbuy.subscription.basic': 'basic',
      'com.citadelbuy.subscription.premium': 'premium',
      'com.citadelbuy.subscription.vip': 'vip',
      'citadelbuy_subscription_basic': 'basic',
      'citadelbuy_subscription_premium': 'premium',
      'citadelbuy_subscription_vip': 'vip',
    };

    return mapping[productId] || null;
  }

  private getCreditsForProduct(productId: string): number {
    // Map IAP product IDs to credit amounts
    const creditMapping: Record<string, number> = {
      'com.citadelbuy.coins.small': 100,
      'com.citadelbuy.coins.medium': 500,
      'com.citadelbuy.coins.large': 1200,
      'com.citadelbuy.coins.xlarge': 3000,
      'citadelbuy_coins_100': 100,
      'citadelbuy_coins_500': 500,
      'citadelbuy_coins_1200': 1200,
      'citadelbuy_coins_3000': 3000,
    };

    return creditMapping[productId] || 0;
  }

  private async addCreditsToWallet(
    userId: string,
    amount: number,
    metadata: Record<string, any>,
  ): Promise<void> {
    // Find or create user's wallet/store credit
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: {
          userId,
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    }

    // Add transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: 'GIFT', // IAP purchase
        transactionType: 'PURCHASE',
        amount,
        balanceBefore: storeCredit.currentBalance,
        balanceAfter: storeCredit.currentBalance + amount,
        description: `IAP purchase: ${metadata.productId}`,
        notes: JSON.stringify(metadata),
      },
    });

    // Update balance
    await this.prisma.storeCredit.update({
      where: { id: storeCredit.id },
      data: {
        currentBalance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
  }

  private async logPaymentAttempt(data: {
    provider: PaymentProviderType;
    transactionId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Log to revenue/analytics table if exists
    this.logger.log(`Payment: ${data.provider} - ${data.transactionId} - ${data.amount} ${data.currency} - ${data.status}`);
  }

  private async logRefundAttempt(data: {
    provider: PaymentProviderType;
    transactionId: string;
    refundId: string;
    amount: number;
    currency: string;
    status: string;
  }): Promise<void> {
    this.logger.log(`Refund: ${data.provider} - ${data.refundId} - ${data.amount} ${data.currency} - ${data.status}`);
  }

  private async logIAPValidation(data: {
    platform: string;
    productId: string;
    transactionId: string;
    environment: string;
  }): Promise<void> {
    this.logger.log(`IAP: ${data.platform} - ${data.productId} - ${data.transactionId} - ${data.environment}`);
  }

  // ==================== Provider Status ====================

  /**
   * Get status of all payment providers
   */
  getProvidersStatus(): Record<PaymentProviderType, {
    configured: boolean;
    enabled: boolean;
  }> {
    const status: Record<string, { configured: boolean; enabled: boolean }> = {};

    for (const [type, provider] of this.providers) {
      status[type] = {
        configured: provider.isConfigured(),
        enabled: provider.isEnabled(),
      };
    }

    // Add IAP providers
    status[PaymentProviderType.APPLE_IAP] = {
      configured: this.appleIAPProvider.isConfigured(),
      enabled: true,
    };

    status[PaymentProviderType.GOOGLE_IAP] = {
      configured: this.googleIAPProvider.isConfigured(),
      enabled: true,
    };

    return status as Record<PaymentProviderType, { configured: boolean; enabled: boolean }>;
  }
}
