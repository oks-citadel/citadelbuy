import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IIAPProvider,
  PaymentProviderType,
  IAPValidationResult,
  IAPSubscriptionStatus,
  IAPNotificationResult,
} from '../interfaces';

/**
 * Google Play Billing Provider
 * Handles Google Play In-App Purchases and Subscriptions
 *
 * Features:
 * - One-time purchase validation
 * - Subscription verification
 * - Real-Time Developer Notifications (RTDN)
 * - Voided purchases
 */
@Injectable()
export class GoogleIAPProvider implements IIAPProvider {
  private readonly logger = new Logger(GoogleIAPProvider.name);
  readonly providerType = PaymentProviderType.GOOGLE_IAP;

  private readonly baseUrl = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private configService: ConfigService) {}

  private get packageName(): string {
    return this.configService.get<string>('GOOGLE_PACKAGE_NAME', '');
  }

  private get serviceAccountEmail(): string {
    return this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL', '');
  }

  private get serviceAccountPrivateKey(): string {
    // Handle escaped newlines in environment variable
    const key = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', '');
    return key.replace(/\\n/g, '\n');
  }

  isConfigured(): boolean {
    return !!this.packageName && !!this.serviceAccountEmail && !!this.serviceAccountPrivateKey;
  }

  /**
   * Get OAuth2 access token using service account
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const jwt = await this.createServiceAccountJWT();

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      return this.accessToken;
    } catch (error: any) {
      this.logger.error(`Failed to get Google access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create JWT for service account authentication
   */
  private async createServiceAccountJWT(): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureInput = `${base64Header}.${base64Payload}`;

    // Sign with the service account private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.serviceAccountPrivateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Validate a one-time purchase
   */
  async validateReceipt(purchaseToken: string, productId: string): Promise<IAPValidationResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Google IAP not configured');
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/products/${productId}/tokens/${purchaseToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return this.errorResult(error.error?.message || 'Validation failed', error.error?.code);
      }

      const data = await response.json();

      // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
      // consumptionState: 0 = Yet to be consumed, 1 = Consumed
      // acknowledgementState: 0 = Not acknowledged, 1 = Acknowledged

      const isValid = data.purchaseState === 0;

      return {
        isValid,
        productId,
        transactionId: data.orderId,
        purchaseDate: new Date(parseInt(data.purchaseTimeMillis)),
        quantity: data.quantity || 1,
        environment: data.purchaseType === 0 ? 'sandbox' : 'production',
        error: isValid ? undefined : {
          code: 'INVALID_PURCHASE',
          message: this.getPurchaseStateMessage(data.purchaseState),
        },
      };
    } catch (error: any) {
      this.logger.error(`Google purchase validation error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  /**
   * Verify subscription status
   */
  async verifySubscription(purchaseToken: string, productId: string): Promise<IAPSubscriptionStatus> {
    if (!this.isConfigured()) {
      return {
        isActive: false,
        productId,
        originalTransactionId: '',
        autoRenewStatus: false,
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`Google subscription verification failed: ${JSON.stringify(error)}`);
        return {
          isActive: false,
          productId,
          originalTransactionId: '',
          autoRenewStatus: false,
        };
      }

      const data = await response.json();

      const expiryTimeMillis = parseInt(data.expiryTimeMillis);
      const now = Date.now();
      const isActive = expiryTimeMillis > now;

      return {
        isActive,
        productId,
        originalTransactionId: data.orderId,
        expiresDate: new Date(expiryTimeMillis),
        autoRenewStatus: data.autoRenewing === true,
        gracePeriodExpiresDate: data.userCancellationTimeMillis
          ? new Date(parseInt(data.userCancellationTimeMillis))
          : undefined,
        billingRetryPeriod: data.paymentState === 0, // 0 = Payment pending
        cancellationDate: data.cancelReason !== undefined
          ? new Date(parseInt(data.userCancellationTimeMillis || expiryTimeMillis))
          : undefined,
        cancellationReason: this.getCancellationReason(data.cancelReason),
      };
    } catch (error: any) {
      this.logger.error(`Google subscription verification error: ${error.message}`);
      return {
        isActive: false,
        productId,
        originalTransactionId: '',
        autoRenewStatus: false,
      };
    }
  }

  /**
   * Process Real-Time Developer Notification (RTDN)
   */
  async processNotification(notification: any): Promise<IAPNotificationResult> {
    try {
      // RTDN is a base64-encoded JSON
      const decodedData = notification.message?.data
        ? JSON.parse(Buffer.from(notification.message.data, 'base64').toString())
        : notification;

      const subscriptionNotification = decodedData.subscriptionNotification;
      const oneTimeProductNotification = decodedData.oneTimeProductNotification;
      const voidedPurchaseNotification = decodedData.voidedPurchaseNotification;

      if (subscriptionNotification) {
        return this.processSubscriptionNotification(subscriptionNotification);
      }

      if (oneTimeProductNotification) {
        return this.processOneTimeNotification(oneTimeProductNotification);
      }

      if (voidedPurchaseNotification) {
        return this.processVoidedNotification(voidedPurchaseNotification);
      }

      throw new Error('Unknown notification type');
    } catch (error: any) {
      this.logger.error(`Google notification processing error: ${error.message}`);
      throw error;
    }
  }

  private processSubscriptionNotification(notification: any): IAPNotificationResult {
    const notificationType = notification.notificationType;

    // Google notification types:
    // 1 = SUBSCRIPTION_RECOVERED
    // 2 = SUBSCRIPTION_RENEWED
    // 3 = SUBSCRIPTION_CANCELED
    // 4 = SUBSCRIPTION_PURCHASED
    // 5 = SUBSCRIPTION_ON_HOLD
    // 6 = SUBSCRIPTION_IN_GRACE_PERIOD
    // 7 = SUBSCRIPTION_RESTARTED
    // 8 = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
    // 9 = SUBSCRIPTION_DEFERRED
    // 10 = SUBSCRIPTION_PAUSED
    // 11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
    // 12 = SUBSCRIPTION_REVOKED
    // 13 = SUBSCRIPTION_EXPIRED

    const typeMapping: Record<number, IAPNotificationResult['type']> = {
      1: 'RENEWAL', // RECOVERED
      2: 'RENEWAL', // RENEWED
      3: 'CANCEL', // CANCELED
      4: 'INITIAL_BUY', // PURCHASED
      5: 'DID_FAIL_TO_RENEW', // ON_HOLD
      6: 'DID_FAIL_TO_RENEW', // IN_GRACE_PERIOD
      7: 'RENEWAL', // RESTARTED
      8: 'PRICE_INCREASE', // PRICE_CHANGE_CONFIRMED
      9: 'RENEWAL', // DEFERRED
      10: 'CANCEL', // PAUSED
      12: 'REVOKE', // REVOKED
      13: 'CANCEL', // EXPIRED
    };

    return {
      type: typeMapping[notificationType] || 'RENEWAL',
      productId: notification.subscriptionId,
      originalTransactionId: notification.purchaseToken,
      environment: 'production', // Google doesn't distinguish in RTDN
    };
  }

  private processOneTimeNotification(notification: any): IAPNotificationResult {
    const notificationType = notification.notificationType;

    // 1 = ONE_TIME_PRODUCT_PURCHASED
    // 2 = ONE_TIME_PRODUCT_CANCELED

    return {
      type: notificationType === 1 ? 'INITIAL_BUY' : 'REFUND',
      productId: notification.sku,
      originalTransactionId: notification.purchaseToken,
      environment: 'production',
    };
  }

  private processVoidedNotification(notification: any): IAPNotificationResult {
    return {
      type: 'REFUND',
      productId: notification.productId,
      originalTransactionId: notification.orderId,
      environment: 'production',
    };
  }

  /**
   * Acknowledge a purchase (required for one-time purchases)
   */
  async acknowledgePurchase(purchaseToken: string, productId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Google acknowledge purchase error: ${error.message}`);
      return false;
    }
  }

  /**
   * Acknowledge a subscription
   */
  async acknowledgeSubscription(purchaseToken: string, productId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Google acknowledge subscription error: ${error.message}`);
      return false;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(purchaseToken: string, productId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Google cancel subscription error: ${error.message}`);
      return false;
    }
  }

  /**
   * Refund a subscription
   */
  async refundSubscription(purchaseToken: string, productId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Google refund subscription error: ${error.message}`);
      return false;
    }
  }

  /**
   * Defer billing for a subscription (extend free access)
   */
  async deferSubscription(
    purchaseToken: string,
    productId: string,
    expectedExpiryTimeMillis: number,
    desiredExpiryTimeMillis: number,
  ): Promise<{ newExpiryTimeMillis: number } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:defer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deferralInfo: {
              expectedExpiryTimeMillis: expectedExpiryTimeMillis.toString(),
              desiredExpiryTimeMillis: desiredExpiryTimeMillis.toString(),
            },
          }),
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return { newExpiryTimeMillis: parseInt(data.newExpiryTimeMillis) };
    } catch (error: any) {
      this.logger.error(`Google defer subscription error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get voided purchases (refunded or revoked)
   */
  async getVoidedPurchases(
    startTimeMillis?: number,
    endTimeMillis?: number,
  ): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const token = await this.getAccessToken();

      const params = new URLSearchParams();
      if (startTimeMillis) params.set('startTime', startTimeMillis.toString());
      if (endTimeMillis) params.set('endTime', endTimeMillis.toString());

      const response = await fetch(
        `${this.baseUrl}/applications/${this.packageName}/purchases/voidedpurchases?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.voidedPurchases || [];
    } catch (error: any) {
      this.logger.error(`Google get voided purchases error: ${error.message}`);
      return [];
    }
  }

  // Helper methods
  private getPurchaseStateMessage(state: number): string {
    const messages: Record<number, string> = {
      0: 'Purchased',
      1: 'Canceled',
      2: 'Pending',
    };
    return messages[state] || 'Unknown state';
  }

  private getCancellationReason(reason?: number): string | undefined {
    if (reason === undefined) return undefined;

    const reasons: Record<number, string> = {
      0: 'User canceled',
      1: 'System canceled (billing issue)',
      2: 'Subscription replaced',
      3: 'Developer canceled',
    };
    return reasons[reason] || 'Unknown reason';
  }

  private errorResult(message: string, code?: string): IAPValidationResult {
    return {
      isValid: false,
      productId: '',
      transactionId: '',
      purchaseDate: new Date(),
      environment: 'production',
      error: {
        code: code || 'VALIDATION_ERROR',
        message,
      },
    };
  }
}
