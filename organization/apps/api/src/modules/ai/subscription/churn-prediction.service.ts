import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChurnPredictionService {
  private readonly logger = new Logger(ChurnPredictionService.name);

  async predictChurn(data: {
    subscriptionId: string;
    userId: string;
    subscriptionAge: number;
    lastInteraction: string;
  }) {
    try {
      this.logger.log(`Predicting churn for subscription ${data.subscriptionId}`);

      // ML would analyze:
      // - Engagement metrics
      // - Payment failures
      // - Customer service interactions
      // - Usage patterns
      // - Competitor activity
      // - Seasonal factors

      const churnSignals = [];
      let churnScore = 0;

      // Analyze last interaction
      const daysSinceInteraction = Math.floor(
        (Date.now() - new Date(data.lastInteraction).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceInteraction > 30) {
        churnSignals.push('No interaction in 30+ days');
        churnScore += 30;
      } else if (daysSinceInteraction > 14) {
        churnSignals.push('Low recent engagement');
        churnScore += 15;
      }

      // Subscription age analysis
      if (data.subscriptionAge < 90) {
        churnSignals.push('New subscription (high-risk period)');
        churnScore += 20;
      }

      // Simulated additional signals
      const paymentIssues = Math.random() > 0.7;
      if (paymentIssues) {
        churnSignals.push('Recent payment failure');
        churnScore += 35;
      }

      const negativeInteraction = Math.random() > 0.8;
      if (negativeInteraction) {
        churnSignals.push('Recent customer service complaint');
        churnScore += 25;
      }

      const usageDecline = Math.random() > 0.6;
      if (usageDecline) {
        churnSignals.push('Declining product usage');
        churnScore += 20;
      }

      const churnProbability = Math.min(churnScore / 100, 0.95);
      const riskLevel =
        churnScore >= 60 ? 'high' : churnScore >= 30 ? 'medium' : 'low';

      return {
        success: true,
        subscriptionId: data.subscriptionId,
        userId: data.userId,
        churnPrediction: {
          probability: (churnProbability * 100).toFixed(1) + '%',
          score: churnScore,
          riskLevel,
        },
        signals: churnSignals,
        timing: {
          estimatedChurnDate: this.estimateChurnDate(churnScore),
          windowForIntervention: this.calculateInterventionWindow(churnScore),
        },
        recommendations: this.generateChurnRecommendations(riskLevel, churnSignals),
      };
    } catch (error) {
      this.logger.error('Churn prediction failed', error);
      throw error;
    }
  }

  async generateRetentionStrategy(data: {
    userId: string;
    subscriptionId: string;
    churnRisk: number;
    reason?: string;
  }) {
    try {
      this.logger.log(`Generating retention strategy for subscription ${data.subscriptionId}`);

      const riskLevel =
        data.churnRisk >= 60 ? 'high' : data.churnRisk >= 30 ? 'medium' : 'low';

      const strategies = [];

      // High-risk interventions
      if (riskLevel === 'high') {
        strategies.push({
          action: 'immediate_discount',
          description: 'Offer 25% off next 3 months',
          timing: 'Immediate',
          expectedRetention: '65%',
          cost: 'Medium',
          priority: 'critical',
        });

        strategies.push({
          action: 'personal_outreach',
          description: 'Personal call from account manager',
          timing: 'Within 24 hours',
          expectedRetention: '55%',
          cost: 'High',
          priority: 'high',
        });

        strategies.push({
          action: 'pause_option',
          description: 'Offer 1-month pause instead of cancellation',
          timing: 'Immediate',
          expectedRetention: '70%',
          cost: 'Low',
          priority: 'high',
        });
      }

      // Medium-risk interventions
      if (riskLevel === 'medium' || riskLevel === 'high') {
        strategies.push({
          action: 'engagement_campaign',
          description: 'Send usage tips and product highlights',
          timing: 'Next 7 days',
          expectedRetention: '45%',
          cost: 'Low',
          priority: 'medium',
        });

        strategies.push({
          action: 'frequency_optimization',
          description: 'Suggest adjusted delivery schedule',
          timing: 'Next 3 days',
          expectedRetention: '50%',
          cost: 'Low',
          priority: 'medium',
        });
      }

      // Low-risk maintenance
      strategies.push({
        action: 'satisfaction_survey',
        description: 'Quick feedback survey',
        timing: 'Next 14 days',
        expectedRetention: '35%',
        cost: 'Very Low',
        priority: 'low',
      });

      // Incentive calculation
      const incentive = this.calculateRetentionIncentive(
        data.churnRisk,
        data.userId,
      );

      return {
        success: true,
        subscriptionId: data.subscriptionId,
        riskLevel,
        strategy: {
          primary: strategies[0],
          alternatives: strategies.slice(1),
        },
        incentive,
        messaging: {
          subject: this.generateSubjectLine(riskLevel),
          tone: riskLevel === 'high' ? 'urgent' : 'friendly',
          channel: riskLevel === 'high' ? ['email', 'phone', 'sms'] : ['email'],
        },
        timeline: {
          implementation: 'Immediate',
          followUp: riskLevel === 'high' ? '24 hours' : '7 days',
          evaluation: '30 days',
        },
      };
    } catch (error) {
      this.logger.error('Retention strategy generation failed', error);
      throw error;
    }
  }

  async suggestPauseTiming(data: {
    subscriptionId: string;
    userId: string;
    reason: string;
  }) {
    try {
      this.logger.log(`Suggesting pause timing for subscription ${data.subscriptionId}`);

      // Analyze reason and suggest optimal pause duration
      const pauseSuggestions = this.analyzePauseReason(data.reason);

      return {
        success: true,
        subscriptionId: data.subscriptionId,
        reason: data.reason,
        recommendations: pauseSuggestions,
        benefits: [
          'Keep your discount and subscriber benefits',
          'Resume anytime with one click',
          'No reactivation fees',
          'Priority slot reserved for your deliveries',
        ],
        alternatives: [
          {
            option: 'Reduce frequency',
            description: 'Deliver every 6 weeks instead of monthly',
            benefit: 'Stay active with less frequent deliveries',
          },
          {
            option: 'Gift subscription',
            description: 'Gift next delivery to a friend',
            benefit: 'Share the love while taking a break',
          },
        ],
      };
    } catch (error) {
      this.logger.error('Pause timing suggestion failed', error);
      throw error;
    }
  }

  private estimateChurnDate(churnScore: number): string {
    const daysUntilChurn = Math.max(7, 90 - churnScore);
    const churnDate = new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000);
    return churnDate.toISOString().split('T')[0];
  }

  private calculateInterventionWindow(churnScore: number): string {
    if (churnScore >= 60) return '24-48 hours';
    if (churnScore >= 30) return '7-14 days';
    return '30 days';
  }

  private generateChurnRecommendations(
    riskLevel: string,
    signals: string[],
  ): string[] {
    const recommendations = [];

    if (riskLevel === 'high') {
      recommendations.push('Immediate intervention required');
      recommendations.push('Offer retention discount');
      recommendations.push('Personal outreach recommended');
    }

    if (signals.some(s => s.includes('payment'))) {
      recommendations.push('Update payment method');
      recommendations.push('Offer payment plan flexibility');
    }

    if (signals.some(s => s.includes('engagement'))) {
      recommendations.push('Send re-engagement campaign');
      recommendations.push('Highlight unused benefits');
    }

    recommendations.push('Monitor closely for 30 days');

    return recommendations;
  }

  private calculateRetentionIncentive(churnRisk: number, userId: string) {
    let discountPercent = 0;
    let duration = 1; // months

    if (churnRisk >= 60) {
      discountPercent = 25;
      duration = 3;
    } else if (churnRisk >= 30) {
      discountPercent = 15;
      duration = 2;
    } else {
      discountPercent = 10;
      duration = 1;
    }

    return {
      type: 'percentage_discount',
      value: discountPercent + '%',
      duration: duration + ' months',
      conditions: ['Maintain active subscription', 'No pauses during offer period'],
      estimatedCost: '$' + (discountPercent * 10).toFixed(2),
      estimatedLTV: '$' + ((100 - discountPercent) * 10 * duration).toFixed(2),
    };
  }

  private generateSubjectLine(riskLevel: string): string {
    const subjects = {
      high: "We'd hate to see you go - Special offer inside",
      medium: "We noticed you haven't been around lately",
      low: 'How are you enjoying your subscription?',
    };
    return subjects[riskLevel] || subjects.low;
  }

  private analyzePauseReason(reason: string): any[] {
    const reasonLower = reason.toLowerCase();

    if (reasonLower.includes('vacation') || reasonLower.includes('travel')) {
      return [
        {
          duration: '2 weeks',
          description: 'Perfect for vacation',
          resumeDate: 'Automatically resumes after 2 weeks',
        },
        {
          duration: '1 month',
          description: 'Extended travel',
          resumeDate: 'Automatically resumes in 1 month',
        },
      ];
    }

    if (reasonLower.includes('stock') || reasonLower.includes('too much')) {
      return [
        {
          duration: '1 month',
          description: 'Clear your current stock',
          resumeDate: 'Resume when you need more',
        },
        {
          duration: 'Until manually resumed',
          description: 'Pause indefinitely',
          resumeDate: 'Resume anytime with one click',
        },
      ];
    }

    return [
      {
        duration: '1 month',
        description: 'Standard pause',
        resumeDate: 'Automatically resumes in 1 month',
      },
    ];
  }
}
