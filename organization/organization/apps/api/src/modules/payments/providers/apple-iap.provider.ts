import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import {
  IIAPProvider,
  PaymentProviderType,
  IAPValidationResult,
  IAPSubscriptionStatus,
  IAPNotificationResult,
} from '../interfaces';

/**
 * Apple In-App Purchase Provider
 * Handles StoreKit 1 and StoreKit 2 receipt validation
 *
 * Features:
 * - Receipt validation
 * - Subscription verification
 * - Server-to-server notifications (App Store Server Notifications V2)
 * - Sandbox and production environments
 */
@Injectable()
export class AppleIAPProvider implements IIAPProvider {
  private readonly logger = new Logger(AppleIAPProvider.name);
  readonly providerType = PaymentProviderType.APPLE_IAP;

  // Apple endpoints
  private readonly productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  private readonly sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private readonly storeKitV2Url = 'https://api.storekit.itunes.apple.com';
  private readonly storeKitV2SandboxUrl = 'https://api.storekit-sandbox.itunes.apple.com';

  constructor(private configService: ConfigService) {}

  private get sharedSecret(): string {
    return this.configService.get<string>('APPLE_SHARED_SECRET', '');
  }

  private get bundleId(): string {
    return this.configService.get<string>('APPLE_BUNDLE_ID', '');
  }

  private get issuerId(): string {
    return this.configService.get<string>('APPLE_ISSUER_ID', '');
  }

  private get keyId(): string {
    return this.configService.get<string>('APPLE_KEY_ID', '');
  }

  private get privateKey(): string {
    return this.configService.get<string>('APPLE_PRIVATE_KEY', '');
  }

  isConfigured(): boolean {
    return !!this.sharedSecret;
  }

  /**
   * Validate a receipt (StoreKit 1)
   */
  async validateReceipt(receipt: string, productId?: string): Promise<IAPValidationResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Apple IAP not configured');
    }

    try {
      // Try production first
      let response = await this.verifyWithApple(receipt, false);

      // If status 21007, it's a sandbox receipt - retry with sandbox
      if (response.status === 21007) {
        response = await this.verifyWithApple(receipt, true);
      }

      if (response.status !== 0) {
        return this.errorResult(this.getStatusMessage(response.status), response.status.toString());
      }

      const receipt_data = response.receipt;
      const latestReceiptInfo = response.latest_receipt_info?.[0] || receipt_data?.in_app?.[0];

      if (!latestReceiptInfo) {
        return this.errorResult('No purchase found in receipt');
      }

      // If productId specified, verify it matches
      if (productId && latestReceiptInfo.product_id !== productId) {
        return this.errorResult('Product ID mismatch');
      }

      const expiresDate = latestReceiptInfo.expires_date_ms
        ? new Date(parseInt(latestReceiptInfo.expires_date_ms))
        : undefined;

      return {
        isValid: true,
        productId: latestReceiptInfo.product_id,
        transactionId: latestReceiptInfo.transaction_id,
        originalTransactionId: latestReceiptInfo.original_transaction_id,
        purchaseDate: new Date(parseInt(latestReceiptInfo.purchase_date_ms)),
        expiresDate,
        isTrialPeriod: latestReceiptInfo.is_trial_period === 'true',
        isInIntroOfferPeriod: latestReceiptInfo.is_in_intro_offer_period === 'true',
        quantity: parseInt(latestReceiptInfo.quantity || '1'),
        environment: response.environment?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production',
      };
    } catch (error: any) {
      this.logger.error(`Apple receipt validation error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  /**
   * Verify subscription status
   */
  async verifySubscription(receipt: string, productId: string): Promise<IAPSubscriptionStatus> {
    const validationResult = await this.validateReceipt(receipt, productId);

    if (!validationResult.isValid) {
      return {
        isActive: false,
        productId,
        originalTransactionId: '',
        autoRenewStatus: false,
      };
    }

    // Check if subscription is still active
    const now = new Date();
    const isActive = validationResult.expiresDate
      ? validationResult.expiresDate > now
      : true; // Non-subscription items are "active"

    return {
      isActive,
      productId: validationResult.productId,
      originalTransactionId: validationResult.originalTransactionId || validationResult.transactionId,
      expiresDate: validationResult.expiresDate,
      autoRenewStatus: isActive, // Simplified - in real implementation, check pending_renewal_info
    };
  }

  /**
   * Process App Store Server Notification V2
   */
  async processNotification(notification: any): Promise<IAPNotificationResult> {
    try {
      // V2 notifications are signed JWTs
      const signedPayload = notification.signedPayload;

      if (!signedPayload) {
        // V1 notification (legacy)
        return this.processV1Notification(notification);
      }

      // Decode JWT (skip verification for now - in production, verify with Apple's certificate)
      const decoded = jwt.decode(signedPayload, { complete: true }) as any;
      const payload = decoded?.payload;

      if (!payload) {
        throw new Error('Invalid notification payload');
      }

      const notificationType = payload.notificationType;
      const subtype = payload.subtype;
      const data = payload.data;

      // Decode transaction info
      const transactionInfo = data?.signedTransactionInfo
        ? jwt.decode(data.signedTransactionInfo) as any
        : null;

      const renewalInfo = data?.signedRenewalInfo
        ? jwt.decode(data.signedRenewalInfo) as any
        : null;

      const typeMapping: Record<string, IAPNotificationResult['type']> = {
        SUBSCRIBED: 'INITIAL_BUY',
        DID_RENEW: 'RENEWAL',
        DID_CHANGE_RENEWAL_STATUS: renewalInfo?.autoRenewStatus === 0 ? 'CANCEL' : 'RENEWAL',
        DID_FAIL_TO_RENEW: 'DID_FAIL_TO_RENEW',
        REFUND: 'REFUND',
        PRICE_INCREASE: 'PRICE_INCREASE',
        REVOKE: 'REVOKE',
      };

      return {
        type: typeMapping[notificationType] || 'RENEWAL',
        productId: transactionInfo?.productId || '',
        originalTransactionId: transactionInfo?.originalTransactionId || '',
        transactionId: transactionInfo?.transactionId,
        expiresDate: transactionInfo?.expiresDate ? new Date(transactionInfo.expiresDate) : undefined,
        environment: data?.environment?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production',
      };
    } catch (error: any) {
      this.logger.error(`Apple notification processing error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process V1 notification (legacy)
   */
  private processV1Notification(notification: any): IAPNotificationResult {
    const notificationType = notification.notification_type;
    const latestReceipt = notification.latest_receipt_info;

    const typeMapping: Record<string, IAPNotificationResult['type']> = {
      INITIAL_BUY: 'INITIAL_BUY',
      DID_RENEW: 'RENEWAL',
      CANCEL: 'CANCEL',
      DID_CHANGE_RENEWAL_STATUS: 'CANCEL',
      DID_FAIL_TO_RENEW: 'DID_FAIL_TO_RENEW',
      REFUND: 'REFUND',
      PRICE_INCREASE_CONSENT: 'PRICE_INCREASE',
      REVOKE: 'REVOKE',
    };

    return {
      type: typeMapping[notificationType] || 'RENEWAL',
      productId: latestReceipt?.product_id || notification.auto_renew_product_id || '',
      originalTransactionId: latestReceipt?.original_transaction_id || '',
      transactionId: latestReceipt?.transaction_id,
      expiresDate: latestReceipt?.expires_date_ms
        ? new Date(parseInt(latestReceipt.expires_date_ms))
        : undefined,
      environment: notification.environment?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production',
    };
  }

  /**
   * Verify receipt with Apple servers
   */
  private async verifyWithApple(receipt: string, sandbox: boolean): Promise<any> {
    const url = sandbox ? this.sandboxUrl : this.productionUrl;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: this.sharedSecret,
        'exclude-old-transactions': true,
      }),
    });

    return response.json();
  }

  /**
   * Get status message for Apple receipt status code
   */
  private getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      0: 'Valid receipt',
      21000: 'The App Store could not read the JSON object you provided',
      21002: 'The data in the receipt-data property was malformed or missing',
      21003: 'The receipt could not be authenticated',
      21004: 'The shared secret you provided does not match the shared secret on file',
      21005: 'The receipt server is not currently available',
      21006: 'This receipt is valid but the subscription has expired',
      21007: 'This receipt is from the test environment (sandbox)',
      21008: 'This receipt is from the production environment',
      21010: 'This receipt could not be authorized',
      21100: 'Internal data access error (21100)',
      21199: 'Internal data access error (21199)',
    };
    return messages[status] || `Unknown status: ${status}`;
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

  // StoreKit 2 API methods (for iOS 15+)

  /**
   * Generate JWT for App Store Server API
   */
  private generateAppStoreJWT(): string {
    if (!this.privateKey || !this.keyId || !this.issuerId) {
      throw new Error('StoreKit 2 credentials not configured');
    }

    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: this.issuerId,
      iat: now,
      exp: now + 3600, // 1 hour
      aud: 'appstoreconnect-v1',
      bid: this.bundleId,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'ES256',
      keyid: this.keyId,
    });
  }

  /**
   * Get transaction history for a customer (StoreKit 2)
   */
  async getTransactionHistory(
    originalTransactionId: string,
    sandbox: boolean = false,
  ): Promise<any[]> {
    try {
      const token = this.generateAppStoreJWT();
      const baseUrl = sandbox ? this.storeKitV2SandboxUrl : this.storeKitV2Url;

      const response = await fetch(
        `${baseUrl}/inApps/v1/history/${originalTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get transaction history: ${response.status}`);
      }

      const data = await response.json();
      return data.signedTransactions || [];
    } catch (error: any) {
      this.logger.error(`Get transaction history error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all subscription statuses for a customer (StoreKit 2)
   */
  async getAllSubscriptionStatuses(
    originalTransactionId: string,
    sandbox: boolean = false,
  ): Promise<any[]> {
    try {
      const token = this.generateAppStoreJWT();
      const baseUrl = sandbox ? this.storeKitV2SandboxUrl : this.storeKitV2Url;

      const response = await fetch(
        `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get subscription statuses: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error: any) {
      this.logger.error(`Get subscription statuses error: ${error.message}`);
      return [];
    }
  }

  /**
   * Request a test notification (for testing webhook setup)
   */
  async requestTestNotification(sandbox: boolean = true): Promise<boolean> {
    try {
      const token = this.generateAppStoreJWT();
      const baseUrl = sandbox ? this.storeKitV2SandboxUrl : this.storeKitV2Url;

      const response = await fetch(
        `${baseUrl}/inApps/v1/notifications/test`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.ok;
    } catch (error: any) {
      this.logger.error(`Request test notification error: ${error.message}`);
      return false;
    }
  }
}
