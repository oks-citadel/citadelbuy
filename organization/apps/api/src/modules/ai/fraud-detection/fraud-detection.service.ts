import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { subDays, differenceInDays } from 'date-fns';

interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  userId?: string;
  transactionId?: string;
}

interface TransactionHistory {
  totalTransactions: number;
  recentTransactions: number;
  averageOrderValue: number;
  chargebacks: number;
  declinedPayments: number;
}

interface ReturnHistory {
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  recentReturns: number;
  averageReturnValue: number;
}

interface ReviewHistory {
  totalReviews: number;
  suspiciousReviews: number;
  averageRating: number;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private userRiskScores: Map<string, any> = new Map();
  private fraudAlerts: FraudAlert[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeFakeReview(data: {
    reviewId: string;
    userId: string;
    productId: string;
    rating: number;
    content: string;
    verified: boolean;
  }) {
    try {
      this.logger.log(`Analyzing review ${data.reviewId} for fraud`);

      // In production: Use ML models trained on verified/fake review datasets
      // Features to analyze:
      // - Review text patterns (generic phrases, excessive enthusiasm)
      // - User behavior (review frequency, rating patterns)
      // - Account age and verification status
      // - Review timing (coordinated reviews)
      // - Language patterns (bot-like text)
      // - Sentiment analysis (overly positive/negative)

      const fraudIndicators = [];
      let fraudScore = 0;

      // Check if user is verified purchaser
      if (!data.verified) {
        fraudIndicators.push('Not a verified purchase');
        fraudScore += 20;
      }

      // Check for generic/template language
      const genericPhrases = [
        'amazing product',
        'highly recommend',
        'best ever',
        'five stars',
      ];
      const hasGeneric = genericPhrases.some(phrase =>
        data.content.toLowerCase().includes(phrase),
      );
      if (hasGeneric && data.content.length < 50) {
        fraudIndicators.push('Generic template language detected');
        fraudScore += 25;
      }

      // Check rating distribution anomaly
      if ((data.rating === 5 || data.rating === 1) && data.content.length < 30) {
        fraudIndicators.push('Extreme rating with minimal content');
        fraudScore += 15;
      }

      // User review velocity check (would query database in production)
      const userReviewVelocity = await this.getUserReviewVelocity(data.userId);
      if (userReviewVelocity > 10) {
        fraudIndicators.push('Unusually high review frequency');
        fraudScore += 30;
      }

      const isFake = fraudScore >= 50;
      const confidence = fraudScore / 100;

      if (isFake) {
        this.addFraudAlert({
          id: `alert-${Date.now()}`,
          type: 'fake_review',
          severity: fraudScore > 70 ? 'high' : 'medium',
          description: `Potential fake review detected: ${data.reviewId}`,
          timestamp: new Date().toISOString(),
          userId: data.userId,
        });
      }

      return {
        success: true,
        reviewId: data.reviewId,
        isFake,
        fraudScore,
        confidence,
        indicators: fraudIndicators,
        recommendation: isFake ? 'flag_for_review' : 'approve',
        reasons: fraudIndicators,
      };
    } catch (error) {
      this.logger.error('Review fraud analysis failed', error);
      throw error;
    }
  }

  async detectReturnFraud(data: {
    orderId: string;
    userId: string;
    returnReason: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
  }) {
    try {
      this.logger.log(`Analyzing return ${data.orderId} for fraud`);

      // Fraud patterns to detect:
      // - Serial returners (high return rate)
      // - Wardrobing (using and returning)
      // - Empty box returns
      // - Item switching
      // - Friendly fraud (false claims)
      // - Return after promotion abuse

      const fraudIndicators = [];
      let riskScore = 0;

      // Check user's return history
      const returnHistory = await this.getUserReturnHistory(data.userId);
      const returnRate = returnHistory.returnRate;

      if (returnRate > 0.5) {
        fraudIndicators.push('High return rate: ' + (returnRate * 100).toFixed(0) + '%');
        riskScore += 40;
      }

      // Check for high-value items
      const totalValue = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (totalValue > 500) {
        fraudIndicators.push('High-value return');
        riskScore += 15;
      }

      // Check for vague return reason
      const vagueReasons = ['changed mind', 'dont want', 'not needed'];
      if (vagueReasons.some(reason => data.returnReason.toLowerCase().includes(reason))) {
        fraudIndicators.push('Vague return reason');
        riskScore += 10;
      }

      // Check for multiple returns in short time
      if (returnHistory.recentReturns > 3) {
        fraudIndicators.push('Multiple recent returns');
        riskScore += 25;
      }

      const isFraudulent = riskScore >= 50;

      if (isFraudulent) {
        this.addFraudAlert({
          id: `alert-${Date.now()}`,
          type: 'return_fraud',
          severity: riskScore > 70 ? 'high' : 'medium',
          description: `Potential return fraud detected: ${data.orderId}`,
          timestamp: new Date().toISOString(),
          userId: data.userId,
        });
      }

      return {
        success: true,
        orderId: data.orderId,
        isFraudulent,
        riskScore,
        indicators: fraudIndicators,
        recommendation: isFraudulent
          ? 'manual_review_required'
          : riskScore > 30
          ? 'additional_verification'
          : 'auto_approve',
        actions: isFraudulent
          ? ['Verify item condition', 'Request photos', 'Contact customer']
          : [],
        estimatedLoss: isFraudulent ? totalValue : 0,
      };
    } catch (error) {
      this.logger.error('Return fraud detection failed', error);
      throw error;
    }
  }

  async getUserRiskScore(userId: string) {
    try {
      // Aggregate risk factors from multiple sources
      const transactionHistory = await this.getTransactionHistory(userId);
      const accountAge = await this.getAccountAge(userId);
      const returnHistory = await this.getUserReturnHistory(userId);
      const reviewHistory = await this.getUserReviewHistory(userId);

      let riskScore = 0;
      const riskFactors = [];

      // Account age risk
      if (accountAge < 30) {
        riskFactors.push('New account (< 30 days)');
        riskScore += 20;
      }

      // Return rate risk
      if (returnHistory.returnRate > 0.4) {
        riskFactors.push(`High return rate: ${(returnHistory.returnRate * 100).toFixed(0)}%`);
        riskScore += 25;
      }

      // Transaction velocity risk
      if (transactionHistory.recentTransactions > 5) {
        riskFactors.push('High transaction velocity');
        riskScore += 15;
      }

      // Chargeback history
      if (transactionHistory.chargebacks > 0) {
        riskFactors.push('Previous chargebacks');
        riskScore += 30;
      }

      // Review patterns
      if (reviewHistory.suspiciousReviews > 0) {
        riskFactors.push('Suspicious review activity');
        riskScore += 20;
      }

      const riskLevel =
        riskScore >= 70
          ? 'high'
          : riskScore >= 40
          ? 'medium'
          : riskScore >= 20
          ? 'low'
          : 'minimal';

      // Cache risk score
      this.userRiskScores.set(userId, {
        riskScore,
        riskLevel,
        riskFactors,
        lastUpdated: new Date().toISOString(),
      });

      return {
        success: true,
        userId,
        riskScore,
        riskLevel,
        riskFactors,
        recommendations:
          riskLevel === 'high'
            ? ['Enhanced verification', 'Manual review', 'Limit transaction amount']
            : riskLevel === 'medium'
            ? ['Monitor activity', 'Verify large transactions']
            : ['Standard processing'],
        accountStatus: riskLevel === 'high' ? 'restricted' : 'active',
      };
    } catch (error) {
      this.logger.error('Risk score calculation failed', error);
      throw error;
    }
  }

  getFraudAlerts(severity?: string) {
    try {
      let alerts = this.fraudAlerts;

      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // Sort by timestamp descending
      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        success: true,
        alerts: alerts.slice(0, 50), // Last 50 alerts
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get fraud alerts', error);
      throw error;
    }
  }

  private addFraudAlert(alert: FraudAlert) {
    this.fraudAlerts.push(alert);
    // Keep only last 1000 alerts in memory
    if (this.fraudAlerts.length > 1000) {
      this.fraudAlerts = this.fraudAlerts.slice(-1000);
    }
  }

  private async getUserReviewVelocity(userId: string): Promise<number> {
    try {
      // Count reviews in the last 7 days
      const sevenDaysAgo = subDays(new Date(), 7);

      const recentReviews = await this.prisma.review.count({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      return recentReviews;
    } catch (error) {
      this.logger.error(`Failed to get review velocity for user ${userId}`, error);
      return 0;
    }
  }

  private async getUserReturnHistory(userId: string): Promise<ReturnHistory> {
    try {
      // Get total orders
      const totalOrders = await this.prisma.order.count({
        where: { userId },
      });

      // Get return requests
      const returns = await this.prisma.returnRequest.findMany({
        where: {
          order: { userId },
        },
        include: {
          items: true,
        },
      });

      const totalReturns = returns.length;

      // Calculate return rate
      const returnRate = totalOrders > 0 ? totalReturns / totalOrders : 0;

      // Recent returns (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const recentReturns = returns.filter(
        r => r.createdAt >= thirtyDaysAgo
      ).length;

      // Calculate average return value
      let totalReturnValue = 0;
      for (const ret of returns) {
        for (const item of ret.items) {
          totalReturnValue += item.refundAmount;
        }
      }
      const averageReturnValue = totalReturns > 0 ? totalReturnValue / totalReturns : 0;

      return {
        totalOrders,
        totalReturns,
        returnRate,
        recentReturns,
        averageReturnValue,
      };
    } catch (error) {
      this.logger.error(`Failed to get return history for user ${userId}`, error);
      return {
        totalOrders: 0,
        totalReturns: 0,
        returnRate: 0,
        recentReturns: 0,
        averageReturnValue: 0,
      };
    }
  }

  private async getTransactionHistory(userId: string): Promise<TransactionHistory> {
    try {
      // Get all orders for the user
      const orders = await this.prisma.order.findMany({
        where: { userId },
      });

      const totalTransactions = orders.length;

      // Recent transactions (last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentOrders = orders.filter(o => o.createdAt >= sevenDaysAgo);
      const recentTransactions = recentOrders.length;

      // Calculate average order value
      const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
      const averageOrderValue = totalTransactions > 0 ? totalValue / totalTransactions : 0;

      // Count chargebacks and declined payments from order status
      const chargebacks = orders.filter(o => o.status === 'REFUNDED').length;
      const declinedPayments = orders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED').length;

      return {
        totalTransactions,
        recentTransactions,
        averageOrderValue,
        chargebacks,
        declinedPayments,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction history for user ${userId}`, error);
      return {
        totalTransactions: 0,
        recentTransactions: 0,
        averageOrderValue: 0,
        chargebacks: 0,
        declinedPayments: 0,
      };
    }
  }

  private async getAccountAge(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        return 0;
      }

      return differenceInDays(new Date(), user.createdAt);
    } catch (error) {
      this.logger.error(`Failed to get account age for user ${userId}`, error);
      return 0;
    }
  }

  private async getUserReviewHistory(userId: string): Promise<ReviewHistory> {
    try {
      // Get all reviews by the user
      const reviews = await this.prisma.review.findMany({
        where: { userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          status: true,
        },
      });

      const totalReviews = reviews.length;

      // Calculate average rating
      const avgRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      // Count suspicious reviews (rejected or pending)
      const suspiciousReviews = reviews.filter(
        r => r.status === 'REJECTED' || r.status === 'PENDING'
      ).length;

      return {
        totalReviews,
        suspiciousReviews,
        averageRating: Math.round(avgRating * 10) / 10,
      };
    } catch (error) {
      this.logger.error(`Failed to get review history for user ${userId}`, error);
      return {
        totalReviews: 0,
        suspiciousReviews: 0,
        averageRating: 0,
      };
    }
  }

  /**
   * Analyze transaction for fraud indicators
   */
  async analyzeTransaction(data: {
    orderId: string;
    userId: string;
    total: number;
    paymentMethod: string;
    ipAddress?: string;
    userAgent?: string;
    billingAddress?: any;
    shippingAddress?: any;
  }) {
    this.logger.log(`Analyzing transaction ${data.orderId} for fraud`);

    const fraudIndicators: string[] = [];
    let riskScore = 0;

    // Get user's transaction history and risk profile
    const [transactionHistory, accountAge, returnHistory] = await Promise.all([
      this.getTransactionHistory(data.userId),
      this.getAccountAge(data.userId),
      this.getUserReturnHistory(data.userId),
    ]);

    // New account risk
    if (accountAge < 7) {
      fraudIndicators.push('Very new account (< 7 days)');
      riskScore += 25;
    } else if (accountAge < 30) {
      fraudIndicators.push('New account (< 30 days)');
      riskScore += 15;
    }

    // High-value order risk
    if (data.total > transactionHistory.averageOrderValue * 3 && transactionHistory.totalTransactions > 0) {
      fraudIndicators.push('Order value significantly higher than average');
      riskScore += 20;
    }

    if (data.total > 1000) {
      fraudIndicators.push('High-value transaction');
      riskScore += 10;
    }

    // Previous chargebacks
    if (transactionHistory.chargebacks > 0) {
      fraudIndicators.push('Previous chargeback history');
      riskScore += 35;
    }

    // High return rate
    if (returnHistory.returnRate > 0.5) {
      fraudIndicators.push('High return rate (>50%)');
      riskScore += 20;
    }

    // Billing/Shipping address mismatch
    if (data.billingAddress && data.shippingAddress) {
      const billingZip = data.billingAddress.postalCode || data.billingAddress.zip;
      const shippingZip = data.shippingAddress.postalCode || data.shippingAddress.zip;

      if (billingZip && shippingZip && billingZip !== shippingZip) {
        fraudIndicators.push('Billing and shipping address mismatch');
        riskScore += 10;
      }
    }

    // Velocity check - too many transactions in short time
    if (transactionHistory.recentTransactions > 5) {
      fraudIndicators.push('High transaction velocity');
      riskScore += 15;
    }

    const riskLevel = riskScore >= 70 ? 'high' :
                      riskScore >= 40 ? 'medium' :
                      riskScore >= 20 ? 'low' : 'minimal';

    // Add fraud alert for high-risk transactions
    if (riskLevel === 'high') {
      this.addFraudAlert({
        id: `alert-${Date.now()}`,
        type: 'transaction_fraud',
        severity: riskScore > 80 ? 'critical' : 'high',
        description: `High-risk transaction detected: ${data.orderId}`,
        timestamp: new Date().toISOString(),
        userId: data.userId,
        transactionId: data.orderId,
      });
    }

    return {
      success: true,
      orderId: data.orderId,
      riskScore,
      riskLevel,
      indicators: fraudIndicators,
      recommendation: riskLevel === 'high' ? 'block' :
                      riskLevel === 'medium' ? 'manual_review' : 'approve',
      requiresVerification: riskLevel === 'high' || riskLevel === 'medium',
    };
  }
}
