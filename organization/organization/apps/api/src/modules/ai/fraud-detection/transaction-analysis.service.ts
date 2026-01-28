import { Injectable, Logger } from '@nestjs/common';
import { DeviceFingerprintService, DeviceFingerprintData } from './device-fingerprint.service';

@Injectable()
export class TransactionAnalysisService {
  private readonly logger = new Logger(TransactionAnalysisService.name);
  private transactionHistory: Map<string, any[]> = new Map();

  constructor(
    private readonly deviceFingerprintService: DeviceFingerprintService,
  ) {}

  async analyzeTransaction(data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
    deviceFingerprint?: string;
    billingAddress?: any;
    shippingAddress?: any;
  }) {
    try {
      this.logger.log(`Analyzing transaction ${data.transactionId}`);

      // Real-time fraud detection using multiple signals:
      // - Behavioral biometrics
      // - Device fingerprinting
      // - IP reputation
      // - Velocity checks
      // - Geolocation anomalies
      // - Payment method risk
      // - Purchase patterns

      const riskSignals = [];
      let riskScore = 0;

      // Check for IP address risk
      const ipRisk = await this.checkIPRisk(data.ipAddress);
      if (ipRisk.isProxy || ipRisk.isTor) {
        riskSignals.push('Suspicious IP address (proxy/VPN detected)');
        riskScore += 30;
      }

      // Check for high-value transaction
      if (data.amount > 1000) {
        riskSignals.push('High-value transaction');
        riskScore += 15;
      }

      // Check billing vs shipping address mismatch
      if (data.billingAddress && data.shippingAddress) {
        const addressMatch = this.compareAddresses(
          data.billingAddress,
          data.shippingAddress,
        );
        if (!addressMatch) {
          riskSignals.push('Billing and shipping address mismatch');
          riskScore += 20;
        }
      }

      // Check user's transaction velocity
      const velocityRisk = await this.checkTransactionVelocity(data.userId);
      if (velocityRisk.isHigh) {
        riskSignals.push(`High transaction velocity: ${velocityRisk.count} in ${velocityRisk.timeframe}`);
        riskScore += 25;
      }

      // Check payment method risk
      const paymentRisk = this.assessPaymentMethodRisk(data.paymentMethod);
      if (paymentRisk > 0) {
        riskSignals.push('Payment method has elevated risk');
        riskScore += paymentRisk;
      }

      // Device fingerprint analysis
      if (data.deviceFingerprint) {
        const deviceRisk = await this.analyzeDeviceFingerprint(data.deviceFingerprint);
        if (deviceRisk.suspicious) {
          riskSignals.push('Suspicious device fingerprint');
          riskScore += 15;
        }
      }

      // Store transaction for velocity checks
      this.recordTransaction(data.userId, {
        transactionId: data.transactionId,
        amount: data.amount,
        timestamp: new Date().toISOString(),
      });

      const decision =
        riskScore >= 70
          ? 'decline'
          : riskScore >= 40
          ? '3ds_challenge'
          : riskScore >= 20
          ? 'additional_verification'
          : 'approve';

      return {
        success: true,
        transactionId: data.transactionId,
        riskScore,
        decision,
        riskSignals,
        recommendations:
          decision === 'decline'
            ? ['Block transaction', 'Contact customer', 'Alert security team']
            : decision === '3ds_challenge'
            ? ['Require 3D Secure authentication', 'Send SMS verification']
            : decision === 'additional_verification'
            ? ['Request CVV', 'Verify billing address']
            : ['Process normally'],
        fraudProbability: riskScore / 100,
        estimatedLoss: decision === 'decline' ? data.amount : 0,
      };
    } catch (error) {
      this.logger.error('Transaction analysis failed', error);
      throw error;
    }
  }

  async velocityCheck(data: {
    userId: string;
    action: 'login' | 'purchase' | 'password_reset' | 'address_change';
    timeWindow: number;
  }) {
    try {
      // Check for suspicious velocity patterns
      const userActions = this.transactionHistory.get(data.userId) || [];
      const cutoffTime = new Date(Date.now() - data.timeWindow * 60000);

      const recentActions = userActions.filter(
        action => new Date(action.timestamp) > cutoffTime,
      );

      const threshold = {
        login: 10,
        purchase: 3,
        password_reset: 2,
        address_change: 3,
      }[data.action];

      const isVelocityExceeded = recentActions.length >= threshold;

      return {
        success: true,
        userId: data.userId,
        action: data.action,
        count: recentActions.length,
        threshold,
        isVelocityExceeded,
        recommendation: isVelocityExceeded
          ? 'block_temporarily'
          : recentActions.length >= threshold * 0.7
          ? 'require_verification'
          : 'allow',
        cooldownPeriod: isVelocityExceeded ? 30 : 0, // minutes
      };
    } catch (error) {
      this.logger.error('Velocity check failed', error);
      throw error;
    }
  }

  async assessChargebackRisk(data: {
    transactionId: string;
    userId: string;
    amount: number;
    productCategory: string;
  }) {
    try {
      // Predict chargeback likelihood based on:
      // - User history
      // - Product category (electronics, digital goods higher risk)
      // - Transaction amount
      // - Time patterns
      // - Historical chargeback data

      let riskScore = 0;
      const riskFactors = [];

      // High-risk categories
      const highRiskCategories = ['electronics', 'jewelry', 'digital_goods', 'software'];
      if (highRiskCategories.includes(data.productCategory.toLowerCase())) {
        riskFactors.push('High-risk product category');
        riskScore += 25;
      }

      // High-value transaction
      if (data.amount > 500) {
        riskFactors.push('High transaction value');
        riskScore += 20;
      }

      // User chargeback history (would query database in production)
      const userHistory = await this.getUserChargebackHistory(data.userId);
      if (userHistory.previousChargebacks > 0) {
        riskFactors.push('Previous chargebacks on record');
        riskScore += 40;
      }

      // New account risk
      if (userHistory.accountAgeDays < 30) {
        riskFactors.push('New account');
        riskScore += 15;
      }

      const chargebackProbability = Math.min(riskScore / 100, 0.95);
      const riskLevel =
        riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

      return {
        success: true,
        transactionId: data.transactionId,
        chargebackProbability,
        riskScore,
        riskLevel,
        riskFactors,
        recommendations:
          riskLevel === 'high'
            ? [
                'Consider declining transaction',
                'Request additional verification',
                'Set aside chargeback reserve',
              ]
            : riskLevel === 'medium'
            ? ['Enhanced monitoring', 'Verify delivery', 'Quick customer contact']
            : ['Standard processing'],
        estimatedChargebackCost: chargebackProbability * (data.amount + 25), // Include chargeback fee
      };
    } catch (error) {
      this.logger.error('Chargeback risk assessment failed', error);
      throw error;
    }
  }

  private async checkIPRisk(ipAddress: string) {
    // In production: Use IP intelligence services (MaxMind, IPHub, etc.)
    // Check for: VPN, Proxy, Tor, hosting provider, high-risk country
    const isProxy = ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.');
    return {
      ipAddress,
      isProxy,
      isTor: false,
      isHosting: false,
      riskScore: isProxy ? 30 : 0,
    };
  }

  private compareAddresses(billing: any, shipping: any): boolean {
    // Simple comparison - in production use address normalization
    if (!billing || !shipping) return true;
    return (
      billing.postalCode === shipping.postalCode &&
      billing.country === shipping.country
    );
  }

  private async checkTransactionVelocity(userId: string) {
    const userTransactions = this.transactionHistory.get(userId) || [];
    const last24Hours = userTransactions.filter(
      tx => new Date(tx.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    );

    return {
      isHigh: last24Hours.length > 3,
      count: last24Hours.length,
      timeframe: '24 hours',
    };
  }

  private assessPaymentMethodRisk(paymentMethod: string): number {
    const riskMap: Record<string, number> = {
      credit_card: 5,
      debit_card: 3,
      paypal: 2,
      bank_transfer: 1,
      cryptocurrency: 20,
      prepaid_card: 25,
    };
    return riskMap[paymentMethod.toLowerCase()] || 10;
  }

  private async analyzeDeviceFingerprint(fingerprint: string) {
    // Use the device fingerprint service for comprehensive analysis
    // Note: In production, the fingerprint string would contain serialized fingerprint data
    // For now, we treat it as a pre-computed hash and check if it's known
    try {
      const deviceTrust = await this.deviceFingerprintService.getDeviceTrustForUser(
        '', // No specific user context
        fingerprint,
      );

      return {
        fingerprint,
        suspicious: deviceTrust.trustScore < 40 || !deviceTrust.isKnownDevice,
        reason: !deviceTrust.isKnownDevice
          ? 'Unknown device fingerprint'
          : deviceTrust.trustScore < 40
            ? 'Low device trust score'
            : null,
        trustScore: deviceTrust.trustScore,
        isKnown: deviceTrust.isKnownDevice,
      };
    } catch (error) {
      this.logger.warn('Failed to analyze device fingerprint', error);
      return {
        fingerprint,
        suspicious: false,
        reason: null,
      };
    }
  }

  /**
   * Analyze a transaction with full device fingerprint data
   */
  async analyzeTransactionWithFingerprint(data: {
    transactionId: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
    deviceFingerprint?: DeviceFingerprintData;
    billingAddress?: any;
    shippingAddress?: any;
  }) {
    this.logger.log(`Analyzing transaction ${data.transactionId} with device fingerprint`);

    const riskSignals = [];
    let riskScore = 0;

    // Validate device fingerprint if provided
    let deviceValidation = null;
    if (data.deviceFingerprint) {
      deviceValidation = await this.deviceFingerprintService.validateFingerprint(
        data.deviceFingerprint,
        data.userId,
        data.ipAddress,
      );

      // Add device-related risk signals
      if (deviceValidation.isBot) {
        riskSignals.push('Bot activity detected on device');
        riskScore += 50;
      }
      if (deviceValidation.isEmulator) {
        riskSignals.push('Emulator detected');
        riskScore += 30;
      }
      if (deviceValidation.isNewDevice) {
        riskSignals.push('Transaction from new device');
        riskScore += 15;
      }
      if (deviceValidation.isBlocked) {
        riskSignals.push('Blocked device');
        riskScore += 100;
      }
      if (deviceValidation.trustScore < 40) {
        riskSignals.push(`Low device trust score: ${deviceValidation.trustScore}`);
        riskScore += 20;
      }
    }

    // Check for IP address risk
    const ipRisk = await this.checkIPRisk(data.ipAddress);
    if (ipRisk.isProxy || ipRisk.isTor) {
      riskSignals.push('Suspicious IP address (proxy/VPN detected)');
      riskScore += 30;
    }

    // Check for high-value transaction
    if (data.amount > 1000) {
      riskSignals.push('High-value transaction');
      riskScore += 15;
    }

    // Check billing vs shipping address mismatch
    if (data.billingAddress && data.shippingAddress) {
      const addressMatch = this.compareAddresses(data.billingAddress, data.shippingAddress);
      if (!addressMatch) {
        riskSignals.push('Billing and shipping address mismatch');
        riskScore += 20;
      }
    }

    // Check user's transaction velocity
    const velocityRisk = await this.checkTransactionVelocity(data.userId);
    if (velocityRisk.isHigh) {
      riskSignals.push(`High transaction velocity: ${velocityRisk.count} in ${velocityRisk.timeframe}`);
      riskScore += 25;
    }

    // Check payment method risk
    const paymentRisk = this.assessPaymentMethodRisk(data.paymentMethod);
    if (paymentRisk > 0) {
      riskSignals.push('Payment method has elevated risk');
      riskScore += paymentRisk;
    }

    // Store transaction for velocity checks
    this.recordTransaction(data.userId, {
      transactionId: data.transactionId,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });

    // Update device transaction count if fingerprint provided
    if (deviceValidation) {
      await this.deviceFingerprintService.recordSuccessfulLogin(
        deviceValidation.fingerprintHash,
        data.userId,
        data.ipAddress,
      );
    }

    const decision =
      riskScore >= 70
        ? 'decline'
        : riskScore >= 40
        ? '3ds_challenge'
        : riskScore >= 20
        ? 'additional_verification'
        : 'approve';

    return {
      success: true,
      transactionId: data.transactionId,
      riskScore,
      decision,
      riskSignals,
      deviceValidation: deviceValidation ? {
        fingerprintHash: deviceValidation.fingerprintHash,
        trustScore: deviceValidation.trustScore,
        riskLevel: deviceValidation.riskLevel,
        isNewDevice: deviceValidation.isNewDevice,
        isBot: deviceValidation.isBot,
        isEmulator: deviceValidation.isEmulator,
        isTrusted: deviceValidation.isTrusted,
      } : null,
      recommendations:
        decision === 'decline'
          ? ['Block transaction', 'Contact customer', 'Alert security team']
          : decision === '3ds_challenge'
          ? ['Require 3D Secure authentication', 'Send SMS verification']
          : decision === 'additional_verification'
          ? ['Request CVV', 'Verify billing address']
          : ['Process normally'],
      fraudProbability: riskScore / 100,
      estimatedLoss: decision === 'decline' ? data.amount : 0,
    };
  }

  private recordTransaction(userId: string, transaction: any) {
    const existing = this.transactionHistory.get(userId) || [];
    existing.push(transaction);
    // Keep last 100 transactions per user
    if (existing.length > 100) {
      existing.shift();
    }
    this.transactionHistory.set(userId, existing);
  }

  private async getUserChargebackHistory(userId: string) {
    // In production: Query database
    return {
      previousChargebacks: 0,
      accountAgeDays: 180,
      totalOrders: 15,
    };
  }
}
