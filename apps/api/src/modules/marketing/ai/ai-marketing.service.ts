import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface LeadScore {
  userId: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  category: 'hot' | 'warm' | 'cold';
  factors: Array<{ name: string; impact: number; value: any }>;
  lastUpdated: Date;
}

export interface ChurnPrediction {
  userId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ name: string; impact: number }>;
  predictedChurnDate?: Date;
  recommendations: string[];
}

export interface CampaignForecast {
  impressions: { predicted: number; range: [number, number] };
  clicks: { predicted: number; range: [number, number] };
  conversions: { predicted: number; range: [number, number] };
  revenue: { predicted: number; range: [number, number] };
  roi: { predicted: number; range: [number, number] };
  confidenceLevel: number;
  recommendations: string[];
}

export interface GeneratedContent {
  id: string;
  type: string;
  variations: Array<{ content: string; score: number }>;
  metadata: {
    topic: string;
    targetAudience?: string;
    tone?: string;
    generatedAt: Date;
  };
}

@Injectable()
export class AiMarketingService {
  private readonly logger = new Logger(AiMarketingService.name);

  private scoringModels: Map<string, { weights: Record<string, number>; thresholds: any }> = new Map();
  private leadScores: Map<string, LeadScore> = new Map();

  constructor(private readonly prisma: PrismaService) {
    this.initDefaultScoringModel();
  }

  private initDefaultScoringModel() {
    this.scoringModels.set('default', {
      weights: {
        pageViews: 1,
        productViews: 3,
        addToCart: 5,
        wishlistAdd: 4,
        emailOpen: 2,
        emailClick: 4,
        purchase: 10,
        recentActivity: 5,
        accountAge: 2,
      },
      thresholds: { hot: 80, warm: 50, cold: 20 },
    });
  }

  // Lead Scoring
  async scoreLeadml(userId: string, attributes?: Record<string, any>): Promise<LeadScore> {
    this.logger.log(`Scoring lead: ${userId}`);

    const model = this.scoringModels.get('default')!;
    const factors: Array<{ name: string; impact: number; value: any }> = [];

    // Mock scoring based on attributes
    let score = 0;

    // Base activity score
    const activityScore = Math.random() * 30 + 10;
    score += activityScore;
    factors.push({ name: 'Activity Level', impact: activityScore, value: 'Moderate' });

    // Engagement score
    const engagementScore = Math.random() * 25;
    score += engagementScore;
    factors.push({ name: 'Engagement', impact: engagementScore, value: 'Active' });

    // Fit score
    const fitScore = Math.random() * 25;
    score += fitScore;
    factors.push({ name: 'Fit Score', impact: fitScore, value: 'Good' });

    // Recency
    const recencyScore = Math.random() * 20;
    score += recencyScore;
    factors.push({ name: 'Recency', impact: recencyScore, value: 'Last 7 days' });

    score = Math.min(100, Math.max(0, score));

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    let category: 'hot' | 'warm' | 'cold';
    if (score >= model.thresholds.hot) category = 'hot';
    else if (score >= model.thresholds.warm) category = 'warm';
    else category = 'cold';

    const leadScore: LeadScore = {
      userId,
      score,
      grade,
      category,
      factors,
      lastUpdated: new Date(),
    };

    this.leadScores.set(userId, leadScore);
    return leadScore;
  }

  async getLeadScore(userId: string): Promise<LeadScore | null> {
    return this.leadScores.get(userId) || null;
  }

  async updateScoringModel(
    organizationId: string,
    weights: Record<string, number>,
    thresholds?: any,
  ): Promise<void> {
    this.scoringModels.set(organizationId, {
      weights,
      thresholds: thresholds || { hot: 80, warm: 50, cold: 20 },
    });
  }

  // Churn Prediction
  async predictChurn(userId: string): Promise<ChurnPrediction> {
    this.logger.log(`Predicting churn for user: ${userId}`);

    const factors: Array<{ name: string; impact: number }> = [];
    let riskScore = 0;

    // Days since last activity
    const inactivityImpact = Math.random() * 30;
    riskScore += inactivityImpact;
    factors.push({ name: 'Inactivity Period', impact: inactivityImpact });

    // Declining engagement
    const engagementDecline = Math.random() * 25;
    riskScore += engagementDecline;
    factors.push({ name: 'Engagement Decline', impact: engagementDecline });

    // Support tickets
    const supportIssues = Math.random() * 20;
    riskScore += supportIssues;
    factors.push({ name: 'Support Issues', impact: supportIssues });

    // Payment issues
    const paymentIssues = Math.random() * 15;
    riskScore += paymentIssues;
    factors.push({ name: 'Payment Problems', impact: paymentIssues });

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    const recommendations: string[] = [];
    if (inactivityImpact > 15) recommendations.push('Send re-engagement email');
    if (engagementDecline > 15) recommendations.push('Offer personalized discount');
    if (supportIssues > 10) recommendations.push('Proactive customer outreach');
    if (paymentIssues > 10) recommendations.push('Payment reminder and assistance');

    return {
      userId,
      riskScore,
      riskLevel,
      factors,
      predictedChurnDate: riskLevel === 'critical' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined,
      recommendations,
    };
  }

  async getChurnRiskUsers(
    organizationId: string,
    minRiskScore?: number,
    page?: number,
    limit?: number,
  ): Promise<{ users: ChurnPrediction[]; total: number }> {
    // Mock high-risk users
    const mockUsers = Array.from({ length: 25 }, (_, i) => ({
      userId: `user-${i + 1}`,
      riskScore: Math.random() * 100,
      riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      factors: [{ name: 'Inactivity', impact: Math.random() * 30 }],
      recommendations: ['Send re-engagement email'],
    }));

    let filtered = mockUsers;
    if (minRiskScore) {
      filtered = mockUsers.filter((u) => u.riskScore >= minRiskScore);
    }

    const total = filtered.length;
    const p = page || 1;
    const l = limit || 20;
    filtered = filtered.slice((p - 1) * l, p * l);

    return { users: filtered, total };
  }

  // Campaign Forecasting
  async forecastCampaign(
    campaignParams: { budget: number; duration: number; channels: string[]; targetAudience?: string[] },
    metrics?: string[],
  ): Promise<CampaignForecast> {
    this.logger.log(`Forecasting campaign with budget: ${campaignParams.budget}`);

    const { budget, duration, channels } = campaignParams;
    const channelMultiplier = channels.length * 0.3 + 0.7;

    // Base calculations
    const baseImpressions = budget * 100 * channelMultiplier;
    const baseCTR = 0.02 + Math.random() * 0.03;
    const baseConversionRate = 0.03 + Math.random() * 0.02;
    const avgOrderValue = 50 + Math.random() * 100;

    const impressions = baseImpressions * duration;
    const clicks = impressions * baseCTR;
    const conversions = clicks * baseConversionRate;
    const revenue = conversions * avgOrderValue;
    const roi = ((revenue - budget) / budget) * 100;

    const variance = 0.15;

    return {
      impressions: {
        predicted: Math.round(impressions),
        range: [Math.round(impressions * (1 - variance)), Math.round(impressions * (1 + variance))],
      },
      clicks: {
        predicted: Math.round(clicks),
        range: [Math.round(clicks * (1 - variance)), Math.round(clicks * (1 + variance))],
      },
      conversions: {
        predicted: Math.round(conversions),
        range: [Math.round(conversions * (1 - variance)), Math.round(conversions * (1 + variance))],
      },
      revenue: {
        predicted: Math.round(revenue),
        range: [Math.round(revenue * (1 - variance)), Math.round(revenue * (1 + variance))],
      },
      roi: {
        predicted: Math.round(roi * 10) / 10,
        range: [Math.round(roi * (1 - variance) * 10) / 10, Math.round(roi * (1 + variance) * 10) / 10],
      },
      confidenceLevel: 75 + Math.random() * 20,
      recommendations: [
        'Consider increasing budget for social channels',
        'Target returning customers for higher conversion',
        'A/B test ad creatives for improved CTR',
      ],
    };
  }

  async analyzeCampaignPerformance(
    campaignId: string,
    includeRecommendations?: boolean,
  ): Promise<{ performance: any; recommendations?: string[] }> {
    return {
      performance: {
        impressions: Math.floor(Math.random() * 100000),
        clicks: Math.floor(Math.random() * 5000),
        conversions: Math.floor(Math.random() * 500),
        revenue: Math.floor(Math.random() * 50000),
        spend: Math.floor(Math.random() * 10000),
        ctr: Math.random() * 5,
        conversionRate: Math.random() * 10,
        roas: 1 + Math.random() * 5,
      },
      recommendations: includeRecommendations
        ? [
            'Increase budget allocation to top-performing ad sets',
            'Pause underperforming creatives',
            'Expand audience to similar segments',
            'Test video content for higher engagement',
          ]
        : undefined,
    };
  }

  // Content Generation
  async generateContent(params: {
    type: string;
    topic: string;
    targetAudience?: string;
    tone?: string;
    keyPoints?: string[];
    variations?: number;
    maxLength?: number;
  }): Promise<GeneratedContent> {
    this.logger.log(`Generating ${params.type} content for: ${params.topic}`);

    const variationCount = params.variations || 3;
    const variations: Array<{ content: string; score: number }> = [];

    const templates: Record<string, string[]> = {
      EMAIL_SUBJECT: [
        `Discover ${params.topic} - Limited Time Offer`,
        `Your Exclusive ${params.topic} Awaits`,
        `Dont Miss Out on ${params.topic}`,
      ],
      EMAIL_BODY: [
        `Hi there,\n\nWe are excited to share ${params.topic} with you. ${params.keyPoints?.join('. ') || 'Learn more about our latest offerings.'}\n\nBest regards`,
        `Hello,\n\nThank you for being a valued customer. Today we are featuring ${params.topic}.\n\nCheers`,
      ],
      PRODUCT_DESCRIPTION: [
        `Introducing ${params.topic} - the perfect solution for ${params.targetAudience || 'everyone'}. ${params.keyPoints?.join('. ') || 'Premium quality guaranteed.'}`,
        `Experience the difference with ${params.topic}. Designed with care, built to last.`,
      ],
      AD_COPY: [
        `${params.topic} - Transform your experience today!`,
        `Ready for ${params.topic}? Start now and save!`,
        `${params.topic} made simple. Try it free.`,
      ],
      SOCIAL_POST: [
        `Excited to announce ${params.topic}! Who else is ready? #trending #new`,
        `${params.topic} is here and its amazing! Check it out now`,
      ],
      META_DESCRIPTION: [
        `Discover ${params.topic}. ${params.keyPoints?.[0] || 'Learn more and get started today.'}`,
        `${params.topic} - Your complete guide. ${params.keyPoints?.[0] || 'Everything you need to know.'}`,
      ],
    };

    const typeTemplates = templates[params.type] || templates.AD_COPY;

    for (let i = 0; i < variationCount; i++) {
      const content = typeTemplates[i % typeTemplates.length];
      const score = 70 + Math.random() * 30;
      variations.push({
        content: params.maxLength ? content.substring(0, params.maxLength) : content,
        score,
      });
    }

    variations.sort((a, b) => b.score - a.score);

    return {
      id: `content-${Date.now()}`,
      type: params.type,
      variations,
      metadata: {
        topic: params.topic,
        targetAudience: params.targetAudience,
        tone: params.tone,
        generatedAt: new Date(),
      },
    };
  }

  async optimizeContent(
    content: string,
    goal: string,
    targetAudience?: string,
  ): Promise<{
    optimizedContent: string;
    improvements: string[];
    scoreImprovement: number;
  }> {
    const improvements: string[] = [];

    if (goal === 'engagement') {
      improvements.push('Added question to increase interaction');
      improvements.push('Shortened sentences for readability');
    } else if (goal === 'conversion') {
      improvements.push('Added stronger call-to-action');
      improvements.push('Highlighted key benefits');
    } else if (goal === 'seo') {
      improvements.push('Added relevant keywords');
      improvements.push('Improved meta structure');
    }

    return {
      optimizedContent: `[Optimized for ${goal}] ${content}`,
      improvements,
      scoreImprovement: 15 + Math.random() * 20,
    };
  }
}
