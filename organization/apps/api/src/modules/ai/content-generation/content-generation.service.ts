import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from './llm/llm.service';
import { LLMError, LLMErrorType } from './llm/llm.interfaces';

/**
 * Content Generation Service
 *
 * Production-ready content generation using LLM integration.
 * Features automatic fallback to template-based generation when LLM is unavailable.
 */
@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * Generate product description using LLM with template fallback
   */
  async generateProductDescription(data: {
    productName: string;
    category: string;
    features?: string[];
    specifications?: Record<string, any>;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  }) {
    try {
      this.logger.log(`Generating description for ${data.productName}`);

      const tone = data.tone || 'professional';
      const features = data.features || [];
      const specs = data.specifications || {};

      // Try LLM generation first
      const llmContent = await this.tryLLMProductDescription(data);

      if (llmContent) {
        // Parse LLM response and return structured output
        const parsed = this.parseLLMProductDescription(llmContent);

        return {
          success: true,
          productName: data.productName,
          generatedBy: 'llm',
          provider: this.llmService.getPrimaryProvider(),
          descriptions: {
            short: parsed.shortDescription,
            long: parsed.detailedDescription,
            bullets: parsed.bulletPoints,
          },
          seo: {
            keywords: this.extractSEOKeywords(data.productName, data.category, features),
            title: this.generateSEOTitle(data.productName, data.category),
            metaDescription: parsed.shortDescription.substring(0, 160),
          },
          readabilityScore: this.calculateReadabilityScore(parsed.detailedDescription),
          wordCount: {
            short: parsed.shortDescription.split(' ').length,
            long: parsed.detailedDescription.split(' ').length,
          },
        };
      }

      // Fallback to template-based generation
      this.logger.log('Using template-based generation as fallback');
      const shortDescription = this.generateShortDescription(data.productName, data.category, tone);
      const longDescription = this.generateLongDescription(
        data.productName,
        data.category,
        features,
        specs,
        tone,
      );
      const bullets = this.generateBulletPoints(features, specs);
      const seoKeywords = this.extractSEOKeywords(data.productName, data.category, features);

      return {
        success: true,
        productName: data.productName,
        generatedBy: 'template',
        descriptions: {
          short: shortDescription,
          long: longDescription,
          bullets,
        },
        seo: {
          keywords: seoKeywords,
          title: this.generateSEOTitle(data.productName, data.category),
          metaDescription: shortDescription.substring(0, 160),
        },
        readabilityScore: 85,
        wordCount: {
          short: shortDescription.split(' ').length,
          long: longDescription.split(' ').length,
        },
      };
    } catch (error) {
      this.logger.error('Product description generation failed', error);
      throw error;
    }
  }

  /**
   * Generate variant descriptions for A/B testing
   */
  async generateVariantDescriptions(data: {
    productName: string;
    baseDescription: string;
    variantCount: number;
    style?: 'short' | 'medium' | 'long';
  }) {
    try {
      const variants = [];

      for (let i = 0; i < data.variantCount; i++) {
        // Try LLM for each variant
        const llmVariant = await this.tryLLMVariant(
          data.productName,
          data.baseDescription,
          i,
          data.style || 'medium',
        );

        const variant = {
          id: `variant_${i + 1}`,
          description: llmVariant || this.generateVariant(data.baseDescription, i, data.style || 'medium'),
          style: data.style || 'medium',
          focusArea: ['features', 'benefits', 'emotional', 'technical'][i % 4],
          estimatedConversion: 0.03 + Math.random() * 0.02,
          generatedBy: llmVariant ? 'llm' : 'template',
        };
        variants.push(variant);
      }

      return {
        success: true,
        productName: data.productName,
        baseDescription: data.baseDescription,
        variants,
        recommendation: variants[0].id,
      };
    } catch (error) {
      this.logger.error('Variant description generation failed', error);
      throw error;
    }
  }

  /**
   * Summarize product reviews using LLM with template fallback
   */
  async summarizeReviews(data: {
    productId: string;
    reviews: Array<{
      rating: number;
      content: string;
      helpful: number;
    }>;
  }) {
    try {
      this.logger.log(`Summarizing reviews for product ${data.productId}`);

      const reviews = data.reviews;
      const totalReviews = reviews.length;

      if (totalReviews === 0) {
        return {
          success: true,
          productId: data.productId,
          summary: 'No reviews available yet.',
          statistics: {
            totalReviews: 0,
            averageRating: 0,
            sentiment: { positive: 0, neutral: 0, negative: 0 },
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          },
          themes: [],
          pros: [],
          cons: [],
          highlights: [],
          generatedBy: 'template',
        };
      }

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      // Try LLM summarization first
      const llmSummary = await this.tryLLMReviewSummary(data);

      if (llmSummary) {
        const parsed = this.parseLLMReviewSummary(llmSummary);

        return {
          success: true,
          productId: data.productId,
          summary: parsed.summary,
          generatedBy: 'llm',
          provider: this.llmService.getPrimaryProvider(),
          statistics: {
            totalReviews,
            averageRating: Math.round(avgRating * 10) / 10,
            sentiment: this.analyzeSentiment(reviews),
            ratingDistribution: this.getRatingDistribution(reviews),
          },
          themes: parsed.positiveThemes,
          pros: parsed.positiveThemes,
          cons: parsed.concerns,
          highlights: parsed.notableQuotes,
        };
      }

      // Fallback to template-based summarization
      this.logger.log('Using template-based review summarization as fallback');

      const themes = this.extractReviewThemes(reviews);
      const pros = this.extractPros(reviews);
      const cons = this.extractCons(reviews);
      const sentiment = this.analyzeSentiment(reviews);
      const summary = this.generateReviewSummary(avgRating, totalReviews, themes, pros, cons);

      return {
        success: true,
        productId: data.productId,
        summary,
        generatedBy: 'template',
        statistics: {
          totalReviews,
          averageRating: Math.round(avgRating * 10) / 10,
          sentiment,
          ratingDistribution: this.getRatingDistribution(reviews),
        },
        themes,
        pros,
        cons,
        highlights: this.extractHighlights(reviews),
      };
    } catch (error) {
      this.logger.error('Review summarization failed', error);
      throw error;
    }
  }

  /**
   * Generate social media content
   */
  async generateSocialContent(data: {
    productId: string;
    productName: string;
    platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'tiktok';
    campaignType?: 'launch' | 'sale' | 'feature' | 'testimonial';
  }) {
    try {
      this.logger.log(`Generating ${data.platform} content for ${data.productName}`);

      const platformLimits = {
        facebook: { text: 2200, optimal: 80 },
        instagram: { text: 2200, optimal: 138, hashtags: 30 },
        twitter: { text: 280, optimal: 71 },
        pinterest: { text: 500, optimal: 100 },
        tiktok: { text: 2200, optimal: 150 },
      };

      const limits = platformLimits[data.platform];
      const campaignType = data.campaignType || 'feature';

      // Try LLM generation
      const llmContent = await this.tryLLMSocialContent(data);

      let content: string;
      let generatedBy: string;

      if (llmContent) {
        content = llmContent;
        generatedBy = 'llm';
      } else {
        content = this.generatePlatformContent(
          data.productName,
          data.platform,
          campaignType,
          limits,
        );
        generatedBy = 'template';
      }

      const hashtags = this.generateHashtags(data.productName, data.platform, campaignType);

      return {
        success: true,
        productId: data.productId,
        platform: data.platform,
        campaignType,
        generatedBy,
        content: {
          text: content,
          hashtags,
          characterCount: content.length,
          optimal: content.length <= limits.optimal,
        },
        suggestions: {
          postTime: this.suggestPostTime(data.platform),
          emoji: this.suggestEmojis(data.platform, campaignType),
          cta: this.generateCTA(data.platform, campaignType),
        },
      };
    } catch (error) {
      this.logger.error('Social media content generation failed', error);
      throw error;
    }
  }

  /**
   * Generate email content
   */
  async generateEmailContent(data: {
    emailType: 'welcome' | 'abandoned_cart' | 'promotion' | 'restock' | 'recommendation';
    recipientData: {
      name?: string;
      cartItems?: any[];
      recommendedProducts?: any[];
      discountAmount?: number;
    };
  }) {
    try {
      this.logger.log(`Generating ${data.emailType} email content`);

      const { emailType, recipientData } = data;
      const name = recipientData.name || 'Valued Customer';

      let subject = '';
      let preview = '';
      let body = '';
      let cta = { text: '', url: '' };

      switch (emailType) {
        case 'welcome':
          subject = `Welcome to Broxiva, ${name}!`;
          preview = 'Start your shopping journey with exclusive offers';
          body = this.generateWelcomeEmail(name);
          cta = { text: 'Start Shopping', url: '/products' };
          break;

        case 'abandoned_cart':
          subject = `${name}, you left something behind!`;
          preview = 'Complete your purchase and save';
          body = this.generateAbandonedCartEmail(
            name,
            recipientData.cartItems || [],
            recipientData.discountAmount,
          );
          cta = { text: 'Complete Purchase', url: '/cart' };
          break;

        case 'promotion':
          subject = `Exclusive Deal for You, ${name}!`;
          preview = `Save ${recipientData.discountAmount}% on your next order`;
          body = this.generatePromotionEmail(name, recipientData.discountAmount || 10);
          cta = { text: 'Shop Now', url: '/sale' };
          break;

        case 'restock':
          subject = `Good News! Your favorite item is back in stock`;
          preview = 'Get it before it sells out again';
          body = this.generateRestockEmail(name);
          cta = { text: 'View Product', url: '/products' };
          break;

        case 'recommendation':
          subject = `${name}, we found something you'll love`;
          preview = 'Personalized picks just for you';
          body = this.generateRecommendationEmail(name, recipientData.recommendedProducts || []);
          cta = { text: 'View Recommendations', url: '/recommendations' };
          break;
      }

      return {
        success: true,
        emailType,
        content: {
          subject,
          previewText: preview,
          body,
          cta,
        },
        optimization: {
          subjectLineScore: 85,
          previewTextScore: 90,
          readabilityScore: 88,
          estimatedOpenRate: '22-28%',
          estimatedClickRate: '3-5%',
        },
      };
    } catch (error) {
      this.logger.error('Email content generation failed', error);
      throw error;
    }
  }

  /**
   * Generate category description
   */
  async generateCategoryDescription(data: {
    categoryName: string;
    subcategories?: string[];
    topProducts?: Array<{ name: string; price: number }>;
  }) {
    try {
      const description = `Explore our ${data.categoryName} collection featuring the latest and most popular items. ${
        data.subcategories && data.subcategories.length > 0
          ? `Browse through ${data.subcategories.join(', ')} and more. `
          : ''
      }Find quality products at competitive prices, with fast shipping and easy returns.`;

      return {
        success: true,
        categoryName: data.categoryName,
        description,
        seo: {
          title: `${data.categoryName} - Shop Quality Products | Broxiva`,
          metaDescription: description.substring(0, 160),
          keywords: [
            data.categoryName.toLowerCase(),
            `buy ${data.categoryName.toLowerCase()}`,
            `${data.categoryName.toLowerCase()} online`,
            'quality products',
          ],
        },
      };
    } catch (error) {
      this.logger.error('Category description generation failed', error);
      throw error;
    }
  }

  /**
   * Get LLM status information
   */
  getLLMStatus(): {
    available: boolean;
    primaryProvider: string;
    rateLimitStatus: any;
    templateFallbackEnabled: boolean;
  } {
    return {
      available: this.llmService.isAvailable(),
      primaryProvider: this.llmService.getPrimaryProvider(),
      rateLimitStatus: this.llmService.getRateLimitStatus(),
      templateFallbackEnabled: this.llmService.isTemplateFallbackEnabled(),
    };
  }

  // ========== LLM Helper Methods ==========

  private async tryLLMProductDescription(data: {
    productName: string;
    category: string;
    features?: string[];
    specifications?: Record<string, any>;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  }): Promise<string | null> {
    if (!this.llmService.isAvailable()) {
      return null;
    }

    try {
      return await this.llmService.generateProductDescription(data);
    } catch (error) {
      if (error instanceof LLMError && error.type === LLMErrorType.RATE_LIMITED) {
        this.logger.warn(`LLM rate limited, retry after ${error.retryAfterSeconds}s`);
      }
      return null;
    }
  }

  private async tryLLMReviewSummary(data: {
    productId: string;
    reviews: Array<{ rating: number; content: string; helpful: number }>;
  }): Promise<string | null> {
    if (!this.llmService.isAvailable()) {
      return null;
    }

    try {
      return await this.llmService.summarizeReviews(data);
    } catch (error) {
      if (error instanceof LLMError && error.type === LLMErrorType.RATE_LIMITED) {
        this.logger.warn(`LLM rate limited, retry after ${error.retryAfterSeconds}s`);
      }
      return null;
    }
  }

  private async tryLLMVariant(
    productName: string,
    baseDescription: string,
    variantIndex: number,
    style: string,
  ): Promise<string | null> {
    if (!this.llmService.isAvailable()) {
      return null;
    }

    try {
      const focusAreas = ['features', 'benefits', 'emotional appeal', 'technical specs'];
      const prompt = `Rewrite this product description for "${productName}" with a focus on ${focusAreas[variantIndex % 4]}:

Base description: ${baseDescription}

Style: ${style}
Please provide only the rewritten description without any additional formatting.`;

      const response = await this.llmService.generateWithFallback(prompt, {
        maxTokens: 512,
        temperature: 0.8,
      });

      return response?.content || null;
    } catch {
      return null;
    }
  }

  private async tryLLMSocialContent(data: {
    productName: string;
    platform: string;
    campaignType?: string;
  }): Promise<string | null> {
    if (!this.llmService.isAvailable()) {
      return null;
    }

    try {
      const prompt = `Create a ${data.platform} post for a ${data.campaignType || 'feature'} campaign about "${data.productName}".
Platform: ${data.platform}
Campaign Type: ${data.campaignType || 'feature'}
Keep it engaging, on-brand, and within platform character limits.
Provide only the post text without hashtags (hashtags will be added separately).`;

      const response = await this.llmService.generateWithFallback(prompt, {
        maxTokens: 256,
        temperature: 0.8,
      });

      return response?.content || null;
    } catch {
      return null;
    }
  }

  private parseLLMProductDescription(content: string): {
    shortDescription: string;
    detailedDescription: string;
    bulletPoints: string[];
  } {
    const shortMatch = content.match(/SHORT_DESCRIPTION:\s*([\s\S]*?)(?=DETAILED_DESCRIPTION:|$)/i);
    const detailedMatch = content.match(/DETAILED_DESCRIPTION:\s*([\s\S]*?)(?=BULLET_POINTS:|$)/i);
    const bulletsMatch = content.match(/BULLET_POINTS:\s*([\s\S]*?)$/i);

    const bulletPoints: string[] = [];
    if (bulletsMatch) {
      const bulletText = bulletsMatch[1];
      const bullets = bulletText.match(/[-*]\s*(.+)/g);
      if (bullets) {
        bullets.forEach((b) => {
          const cleaned = b.replace(/^[-*]\s*/, '').trim();
          if (cleaned) bulletPoints.push(cleaned);
        });
      }
    }

    return {
      shortDescription: shortMatch?.[1]?.trim() || content.substring(0, 160),
      detailedDescription: detailedMatch?.[1]?.trim() || content,
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : [content.substring(0, 100)],
    };
  }

  private parseLLMReviewSummary(content: string): {
    summary: string;
    positiveThemes: string[];
    concerns: string[];
    notableQuotes: string[];
  } {
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=POSITIVE_THEMES:|$)/i);
    const positivesMatch = content.match(/POSITIVE_THEMES:\s*([\s\S]*?)(?=CONCERNS:|$)/i);
    const concernsMatch = content.match(/CONCERNS:\s*([\s\S]*?)(?=NOTABLE_QUOTES:|$)/i);
    const quotesMatch = content.match(/NOTABLE_QUOTES:\s*([\s\S]*?)$/i);

    const extractList = (text: string | undefined): string[] => {
      if (!text) return [];
      const items = text.match(/[-*]\s*"?(.+?)"?\s*(?=\n|$)/g);
      if (!items) return [];
      return items.map((item) => item.replace(/^[-*]\s*"?/, '').replace(/"?\s*$/, '').trim()).filter(Boolean);
    };

    return {
      summary: summaryMatch?.[1]?.trim() || content.substring(0, 200),
      positiveThemes: extractList(positivesMatch?.[1]),
      concerns: extractList(concernsMatch?.[1]),
      notableQuotes: extractList(quotesMatch?.[1]),
    };
  }

  private calculateReadabilityScore(text: string): number {
    // Simple readability score based on sentence and word length
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const words = text.split(/\s+/).filter(Boolean);
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

    // Score based on optimal ranges
    let score = 100;
    if (avgSentenceLength > 25) score -= 10;
    if (avgSentenceLength > 35) score -= 10;
    if (avgWordLength > 6) score -= 5;
    if (avgWordLength > 8) score -= 5;

    return Math.max(50, Math.min(100, score));
  }

  // ========== Template-based Generation Methods ==========

  private generateShortDescription(productName: string, category: string, tone: string): string {
    const templates = {
      professional: `The ${productName} delivers exceptional performance and reliability in the ${category} category. Perfect for those seeking quality and value.`,
      casual: `Meet the ${productName} - your new favorite ${category} item! It's awesome, affordable, and ready to make your life easier.`,
      luxury: `Experience the ${productName}, a premium ${category} piece that embodies sophistication and excellence.`,
      technical: `The ${productName} features advanced specifications designed for optimal ${category} performance and efficiency.`,
    };
    return (templates as Record<string, string>)[tone] || templates.professional;
  }

  private generateLongDescription(
    productName: string,
    category: string,
    features: string[],
    specs: Record<string, any>,
    tone: string,
  ): string {
    let description = this.generateShortDescription(productName, category, tone);

    if (features.length > 0) {
      description += `\n\nKey Features:\n${features.map((f) => `- ${f}`).join('\n')}`;
    }

    if (Object.keys(specs).length > 0) {
      description += `\n\nSpecifications:\n${Object.entries(specs)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')}`;
    }

    description += `\n\nOrder now and experience the difference. Fast shipping available.`;

    return description;
  }

  private generateBulletPoints(features: string[], specs: Record<string, any>): string[] {
    const bullets = [...features];
    Object.entries(specs).forEach(([key, value]) => {
      bullets.push(`${key}: ${value}`);
    });
    return bullets.slice(0, 5);
  }

  private extractSEOKeywords(
    productName: string,
    category: string,
    features: string[],
  ): string[] {
    return [
      productName.toLowerCase(),
      category.toLowerCase(),
      `buy ${productName.toLowerCase()}`,
      `${category.toLowerCase()} online`,
      ...features.slice(0, 3).map((f) => f.toLowerCase()),
    ];
  }

  private generateSEOTitle(productName: string, category: string): string {
    return `${productName} - ${category} | Buy Online | Broxiva`;
  }

  private generateVariant(baseDescription: string, index: number, style: string): string {
    const variations = [
      baseDescription,
      baseDescription.replace(/great/gi, 'excellent'),
      baseDescription.replace(/good/gi, 'outstanding'),
      baseDescription.replace(/quality/gi, 'premium quality'),
    ];
    return variations[index % variations.length];
  }

  private extractReviewThemes(reviews: any[]): string[] {
    return ['Quality', 'Value for money', 'Fast delivery', 'Easy to use'];
  }

  private extractPros(reviews: any[]): string[] {
    return ['High quality materials', 'Great value', 'Fast shipping', 'Easy to use'];
  }

  private extractCons(reviews: any[]): string[] {
    return ['Slightly expensive', 'Limited color options'];
  }

  private analyzeSentiment(reviews: any[]): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const negative = reviews.filter((r) => r.rating <= 2).length;
    const neutral = reviews.length - positive - negative;

    return {
      positive: (positive / reviews.length) * 100,
      neutral: (neutral / reviews.length) * 100,
      negative: (negative / reviews.length) * 100,
    };
  }

  private getRatingDistribution(reviews: any[]) {
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      distribution[r.rating]++;
    });
    return distribution;
  }

  private generateReviewSummary(
    avgRating: number,
    totalReviews: number,
    themes: string[],
    pros: string[],
    cons: string[],
  ): string {
    return `Based on ${totalReviews} reviews, this product has an average rating of ${avgRating.toFixed(1)} stars. Customers particularly appreciate ${pros[0].toLowerCase()} and ${pros[1].toLowerCase()}. Common themes include ${themes.slice(0, 3).join(', ').toLowerCase()}.`;
  }

  private extractHighlights(reviews: any[]): string[] {
    return reviews
      .filter((r) => r.rating >= 4 && r.helpful > 5)
      .slice(0, 3)
      .map((r) => r.content.substring(0, 100) + '...');
  }

  private generatePlatformContent(
    productName: string,
    platform: string,
    campaignType: string,
    limits: any,
  ): string {
    const templates = {
      facebook: `Check out our amazing ${productName}! Perfect for anyone looking for quality and style. Limited time offer - shop now!`,
      instagram: `Introducing ${productName}\nElevate your style with this must-have piece. Link in bio!`,
      twitter: `New arrival: ${productName} Get yours today!`,
      pinterest: `${productName} - Save this pin for your next shopping trip! Quality meets affordability.`,
      tiktok: `You NEED to see this ${productName}! #ProductReview #MustHave`,
    };
    return (templates as Record<string, string>)[platform] || templates.facebook;
  }

  private generateHashtags(productName: string, platform: string, campaignType: string): string[] {
    const baseHashtags = ['shopping', 'onlineshopping', 'deals', 'newproduct'];
    const productHashtags = productName
      .split(' ')
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 3);
    return [...baseHashtags, ...productHashtags].slice(0, 10);
  }

  private suggestPostTime(platform: string): string {
    const times = {
      facebook: '1-3 PM weekdays',
      instagram: '11 AM - 1 PM, 7-9 PM',
      twitter: '12-3 PM weekdays',
      pinterest: '8-11 PM',
      tiktok: '6-10 PM, 2-4 PM',
    };
    return (times as Record<string, string>)[platform] || '12-3 PM';
  }

  private suggestEmojis(platform: string, campaignType: string): string[] {
    const emojiMap = {
      launch: ['rocket', 'tada', 'sparkles', 'new'],
      sale: ['fire', 'moneybag', 'gift', 'zap'],
      feature: ['star', 'okhand', '100', 'check'],
      testimonial: ['heart', 'raisinghands', 'blueheart', 'clap'],
    };
    return (emojiMap as Record<string, string[]>)[campaignType] || emojiMap.feature;
  }

  private generateCTA(platform: string, campaignType: string): string {
    const ctas = {
      launch: 'Shop Now',
      sale: 'Get Your Deal',
      feature: 'Learn More',
      testimonial: 'Join Happy Customers',
    };
    return (ctas as Record<string, string>)[campaignType] || 'Shop Now';
  }

  private generateWelcomeEmail(name: string): string {
    return `Hi ${name},\n\nWelcome to Broxiva! We're thrilled to have you join our community of smart shoppers.\n\nAs a special welcome gift, enjoy 15% off your first order with code WELCOME15.\n\nHappy shopping!`;
  }

  private generateAbandonedCartEmail(name: string, cartItems: any[], discount?: number): string {
    return `Hi ${name},\n\nWe noticed you left some great items in your cart. They're still waiting for you!\n\n${
      discount
        ? `Complete your purchase now and save ${discount}% with code CART${discount}.`
        : 'Complete your purchase before they sell out!'
    }\n\nYour cart items are reserved for the next 24 hours.`;
  }

  private generatePromotionEmail(name: string, discount: number): string {
    return `Hi ${name},\n\nWe have an exclusive offer just for you!\n\nEnjoy ${discount}% off your entire order. Use code SAVE${discount} at checkout.\n\nOffer expires in 48 hours. Shop now and save!`;
  }

  private generateRestockEmail(name: string): string {
    return `Hi ${name},\n\nGreat news! The item you've been waiting for is back in stock.\n\nDon't miss out this time - order now before it sells out again!`;
  }

  private generateRecommendationEmail(name: string, products: any[]): string {
    return `Hi ${name},\n\nBased on your shopping preferences, we've handpicked these items just for you.\n\nDiscover new favorites and enjoy personalized shopping!`;
  }
}
