/**
 * Fraud Detection Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface TransactionAnalysis {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  cardLastFour?: string;
  billingAddress: Address;
  shippingAddress: Address;
  deviceFingerprint?: string;
  ipAddress: string;
  userAgent: string;
  items: TransactionItem[];
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface TransactionItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface FraudScore {
  transactionId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: FraudFactor[];
  recommendation: 'approve' | 'review' | 'reject';
  modelVersion: string;
}

export interface FraudFactor {
  name: string;
  score: number;
  description: string;
}

export interface DeviceAnalysis {
  userId: string;
  deviceTrustScore: number;
  isKnownDevice: boolean;
  deviceAgeDays: number;
  suspiciousSignals: string[];
}

export interface VelocityCheck {
  userId: string;
  transactions1h: number;
  transactions24h: number;
  amount1h: number;
  amount24h: number;
  velocityScore: number;
  exceededLimits: string[];
}

export class FraudDetectionClient {
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/fraud`,
      timeout: config.timeout || 10000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Analyze a transaction for fraud
   */
  async analyzeTransaction(transaction: TransactionAnalysis): Promise<FraudScore> {
    const response = await this.client.post<FraudScore>('/analyze', {
      transaction_id: transaction.transactionId,
      user_id: transaction.userId,
      amount: transaction.amount,
      currency: transaction.currency,
      payment_method: transaction.paymentMethod,
      card_last_four: transaction.cardLastFour,
      billing_address: transaction.billingAddress,
      shipping_address: transaction.shippingAddress,
      device_fingerprint: transaction.deviceFingerprint,
      ip_address: transaction.ipAddress,
      user_agent: transaction.userAgent,
      items: transaction.items,
    });
    return response.data;
  }

  /**
   * Analyze device for suspicious activity
   */
  async analyzeDevice(
    userId: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<DeviceAnalysis> {
    const response = await this.client.post<DeviceAnalysis>('/device/analyze', {
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    return response.data;
  }

  /**
   * Check transaction velocity
   */
  async checkVelocity(
    userId: string,
    ipAddress: string,
    cardLastFour?: string
  ): Promise<VelocityCheck> {
    const response = await this.client.post<VelocityCheck>('/velocity/check', {
      user_id: userId,
      ip_address: ipAddress,
      card_last_four: cardLastFour,
    });
    return response.data;
  }

  /**
   * Report a confirmed fraud case
   */
  async reportFraud(
    transactionId: string,
    fraudType: string,
    details?: string
  ): Promise<void> {
    await this.client.post('/report/fraud', {
      transaction_id: transactionId,
      fraud_type: fraudType,
      details,
    });
  }

  /**
   * Get fraud detection statistics
   */
  async getStats(days: number = 7): Promise<Record<string, unknown>> {
    const response = await this.client.get('/stats', { params: { days } });
    return response.data;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
