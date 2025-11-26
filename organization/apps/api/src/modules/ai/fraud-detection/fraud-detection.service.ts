import { Injectable, Logger } from '@nestjs/common';

interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  userId?: string;
  transactionId?: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private userRiskScores: Map<string, any> = new Map();
  private fraudAlerts: FraudAlert[] = [];

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
    // In production: Query database for user's reviews in last 7 days
    return Math.floor(Math.random() * 15);
  }

  private async getUserReturnHistory(userId: string) {
    // In production: Query actual return data from database
    return {
      totalOrders: 20,
      totalReturns: 6,
      returnRate: 0.3,
      recentReturns: 2,
      averageReturnValue: 150,
    };
  }

  private async getTransactionHistory(userId: string) {
    // In production: Query transaction database
    return {
      totalTransactions: 25,
      recentTransactions: 3,
      averageOrderValue: 200,
      chargebacks: 0,
      declinedPayments: 1,
    };
  }

  private async getAccountAge(userId: string): Promise<number> {
    // In production: Calculate from user creation date
    return 120; // days
  }

  private async getUserReviewHistory(userId: string) {
    // In production: Query review database
    return {
      totalReviews: 5,
      suspiciousReviews: 0,
      averageRating: 4.2,
    };
  }
}
