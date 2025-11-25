import { Injectable, Logger } from '@nestjs/common';

interface FitFeedback {
  productId: string;
  userId: string;
  size: string;
  fit: 'too_small' | 'perfect' | 'too_large';
  measurements?: any;
}

@Injectable()
export class FitRecommendationService {
  private readonly logger = new Logger(FitRecommendationService.name);
  private fitFeedbackData: Map<string, FitFeedback[]> = new Map();

  async getRecommendation(data: {
    productId: string;
    measurements?: any;
    userId?: string;
  }) {
    try {
      const { productId, measurements, userId } = data;

      // Get user's purchase history for better recommendations
      const purchaseHistory = userId ? await this.getPurchaseHistory(userId) : null;

      // Analyze fit feedback from other users
      const fitAnalysis = await this.analyzeFitFeedback(productId);

      // Generate size recommendation
      const recommendation = await this.calculateSizeRecommendation(
        productId,
        measurements,
        purchaseHistory,
        fitAnalysis,
      );

      return {
        success: true,
        productId,
        recommendation,
        confidence: recommendation.confidence,
        alternatives: recommendation.alternatives,
      };
    } catch (error) {
      this.logger.error('Fit recommendation failed', error);
      throw error;
    }
  }

  private async calculateSizeRecommendation(
    productId: string,
    measurements: any,
    purchaseHistory: any,
    fitAnalysis: any,
  ) {
    // ML model would predict best size based on:
    // - User measurements
    // - Purchase history
    // - Other users' feedback
    // - Brand-specific sizing quirks

    const recommendedSize = 'M';
    const confidence = 0.87;

    return {
      size: recommendedSize,
      confidence,
      fit: 'true_to_size',
      alternatives: [
        { size: 'S', probability: 0.08, reason: 'If you prefer fitted' },
        { size: 'L', probability: 0.05, reason: 'If you prefer relaxed fit' },
      ],
      reasoning: [
        'Based on your measurements',
        '87% of similar users chose M',
        'This brand runs true to size',
      ],
      tips: [
        'Chest measurement suggests M',
        'Consider sizing up if between sizes',
      ],
    };
  }

  async getSizeChart(productId: string) {
    try {
      // Fetch product size chart
      // Enhanced with AI predictions

      return {
        success: true,
        productId,
        chart: {
          sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          measurements: {
            XS: { chest: '86-91', waist: '71-76', hips: '91-96' },
            S: { chest: '91-96', waist: '76-81', hips: '96-101' },
            M: { chest: '96-101', waist: '81-86', hips: '101-106' },
            L: { chest: '101-109', waist: '86-94', hips: '106-114' },
            XL: { chest: '109-117', waist: '94-102', hips: '114-122' },
            XXL: { chest: '117-125', waist: '102-110', hips: '122-130' },
          },
          unit: 'cm',
        },
        fitInsights: {
          truToSize: true,
          customerFeedback: {
            tooSmall: 12,
            perfect: 78,
            tooLarge: 10,
          },
          popularSizes: ['M', 'L'],
        },
      };
    } catch (error) {
      this.logger.error('Failed to get size chart', error);
      throw error;
    }
  }

  async submitFeedback(feedback: FitFeedback) {
    try {
      // Store feedback for ML model training
      const existing = this.fitFeedbackData.get(feedback.productId) || [];
      existing.push(feedback);
      this.fitFeedbackData.set(feedback.productId, existing);

      this.logger.log(`Fit feedback received for product ${feedback.productId}`);

      return {
        success: true,
        message: 'Thank you for your feedback!',
        impact: 'This helps improve recommendations for others',
      };
    } catch (error) {
      this.logger.error('Failed to submit feedback', error);
      throw error;
    }
  }

  private async getPurchaseHistory(userId: string) {
    // In production: Query user's purchase history
    return {
      preferredSizes: { tops: 'M', bottoms: '32' },
      brands: ['Nike', 'Adidas'],
      fitPreference: 'regular',
    };
  }

  private async analyzeFitFeedback(productId: string) {
    const feedback = this.fitFeedbackData.get(productId) || [];

    const total = feedback.length;
    const tooSmall = feedback.filter(f => f.fit === 'too_small').length;
    const perfect = feedback.filter(f => f.fit === 'perfect').length;
    const tooLarge = feedback.filter(f => f.fit === 'too_large').length;

    return {
      total,
      distribution: {
        tooSmall: (tooSmall / total) * 100 || 0,
        perfect: (perfect / total) * 100 || 0,
        tooLarge: (tooLarge / total) * 100 || 0,
      },
      recommendation: perfect / total > 0.7 ? 'true_to_size' : 'size_up',
    };
  }
}
