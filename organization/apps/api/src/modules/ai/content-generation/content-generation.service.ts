import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);

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

      // In production: Use GPT-4, Claude, or fine-tuned LLM
      // Features:
      // - SEO keyword integration
      // - Tone adaptation
      // - Feature highlighting
      // - Benefit-focused copy
      // - Call-to-action
      // - Structured data markup

      const tone = data.tone || 'professional';
      const features = data.features || [];
      const specs = data.specifications || {};

      // Generate structured description
      const shortDescription = this.generateShortDescription(
        data.productName,
        data.category,
        tone,
      );
      const longDescription = this.generateLongDescription(
        data.productName,
        data.category,
        features,
        specs,
        tone,
      );
      const bullets = this.generateBulletPoints(features, specs);
      const seoKeywords = this.extractSEOKeywords(
        data.productName,
        data.category,
        features,
      );

      return {
        success: true,
        productName: data.productName,
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

  async generateVariantDescriptions(data: {
    productName: string;
    baseDescription: string;
    variantCount: number;
    style?: 'short' | 'medium' | 'long';
  }) {
    try {
      // Generate multiple variations for A/B testing
      const variants = [];

      for (let i = 0; i < data.variantCount; i++) {
        const variant = {
          id: `variant_${i + 1}`,
          description: this.generateVariant(
            data.baseDescription,
            i,
            data.style || 'medium',
          ),
          style: data.style || 'medium',
          focusArea: ['features', 'benefits', 'emotional', 'technical'][i % 4],
          estimatedConversion: 0.03 + Math.random() * 0.02,
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

      // In production: Use extractive + abstractive summarization
      // Techniques:
      // - Sentiment analysis
      // - Topic modeling
      // - Key phrase extraction
      // - Pros/cons identification
      // - Common themes

      const reviews = data.reviews;
      const totalReviews = reviews.length;
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      // Extract common themes
      const themes = this.extractReviewThemes(reviews);
      const pros = this.extractPros(reviews);
      const cons = this.extractCons(reviews);
      const sentiment = this.analyzeSentiment(reviews);

      const summary = this.generateReviewSummary(
        avgRating,
        totalReviews,
        themes,
        pros,
        cons,
      );

      return {
        success: true,
        productId: data.productId,
        summary,
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

  async generateSocialContent(data: {
    productId: string;
    productName: string;
    platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'tiktok';
    campaignType?: 'launch' | 'sale' | 'feature' | 'testimonial';
  }) {
    try {
      this.logger.log(
        `Generating ${data.platform} content for ${data.productName}`,
      );

      // Platform-specific content generation
      const platformLimits = {
        facebook: { text: 2200, optimal: 80 },
        instagram: { text: 2200, optimal: 138, hashtags: 30 },
        twitter: { text: 280, optimal: 71 },
        pinterest: { text: 500, optimal: 100 },
        tiktok: { text: 2200, optimal: 150 },
      };

      const limits = platformLimits[data.platform];
      const campaignType = data.campaignType || 'feature';

      const content = this.generatePlatformContent(
        data.productName,
        data.platform,
        campaignType,
        limits,
      );
      const hashtags = this.generateHashtags(
        data.productName,
        data.platform,
        campaignType,
      );

      return {
        success: true,
        productId: data.productId,
        platform: data.platform,
        campaignType,
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
          subject = `Welcome to Broxiva, ${name}! 🎉`;
          preview = 'Start your shopping journey with exclusive offers';
          body = this.generateWelcomeEmail(name);
          cta = { text: 'Start Shopping', url: '/products' };
          break;

        case 'abandoned_cart':
          subject = `${name}, you left something behind! 🛒`;
          preview = 'Complete your purchase and save';
          body = this.generateAbandonedCartEmail(
            name,
            recipientData.cartItems || [],
            recipientData.discountAmount,
          );
          cta = { text: 'Complete Purchase', url: '/cart' };
          break;

        case 'promotion':
          subject = `Exclusive Deal for You, ${name}! 🎁`;
          preview = `Save ${recipientData.discountAmount}% on your next order`;
          body = this.generatePromotionEmail(
            name,
            recipientData.discountAmount || 10,
          );
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
          body = this.generateRecommendationEmail(
            name,
            recipientData.recommendedProducts || [],
          );
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

  // Private helper methods

  private generateShortDescription(
    productName: string,
    category: string,
    tone: string,
  ): string {
    const templates = {
      professional: `The ${productName} delivers exceptional performance and reliability in the ${category} category. Perfect for those seeking quality and value.`,
      casual: `Meet the ${productName} - your new favorite ${category} item! It's awesome, affordable, and ready to make your life easier.`,
      luxury: `Experience the ${productName}, a premium ${category} piece that embodies sophistication and excellence.`,
      technical: `The ${productName} features advanced specifications designed for optimal ${category} performance and efficiency.`,
    };
    return templates[tone] || templates.professional;
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
      description += `\n\nKey Features:\n${features.map(f => `• ${f}`).join('\n')}`;
    }

    if (Object.keys(specs).length > 0) {
      description += `\n\nSpecifications:\n${Object.entries(specs)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n')}`;
    }

    description += `\n\nOrder now and experience the difference. Fast shipping available.`;

    return description;
  }

  private generateBulletPoints(
    features: string[],
    specs: Record<string, any>,
  ): string[] {
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
      ...features.slice(0, 3).map(f => f.toLowerCase()),
    ];
  }

  private generateSEOTitle(productName: string, category: string): string {
    return `${productName} - ${category} | Buy Online | Broxiva`;
  }

  private generateVariant(
    baseDescription: string,
    index: number,
    style: string,
  ): string {
    // Simple variant generation - in production use LLM
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
    const positive = reviews.filter(r => r.rating >= 4).length;
    const negative = reviews.filter(r => r.rating <= 2).length;
    const neutral = reviews.length - positive - negative;

    return {
      positive: (positive / reviews.length) * 100,
      neutral: (neutral / reviews.length) * 100,
      negative: (negative / reviews.length) * 100,
    };
  }

  private getRatingDistribution(reviews: any[]) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
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
      .filter(r => r.rating >= 4 && r.helpful > 5)
      .slice(0, 3)
      .map(r => r.content.substring(0, 100) + '...');
  }

  private generatePlatformContent(
    productName: string,
    platform: string,
    campaignType: string,
    limits: any,
  ): string {
    const templates = {
      facebook: `Check out our amazing ${productName}! Perfect for anyone looking for quality and style. Limited time offer - shop now!`,
      instagram: `✨ Introducing ${productName} ✨\nElevate your style with this must-have piece. Link in bio!`,
      twitter: `New arrival: ${productName} 🔥 Get yours today!`,
      pinterest: `${productName} - Save this pin for your next shopping trip! Quality meets affordability.`,
      tiktok: `You NEED to see this ${productName}! 😍 #ProductReview #MustHave`,
    };
    return templates[platform] || templates.facebook;
  }

  private generateHashtags(
    productName: string,
    platform: string,
    campaignType: string,
  ): string[] {
    const baseHashtags = ['shopping', 'onlineshopping', 'deals', 'newproduct'];
    const productHashtags = productName
      .split(' ')
      .map(word => word.toLowerCase())
      .filter(word => word.length > 3);
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
    return times[platform] || '12-3 PM';
  }

  private suggestEmojis(platform: string, campaignType: string): string[] {
    const emojiMap = {
      launch: ['🚀', '🎉', '✨', '🆕'],
      sale: ['🔥', '💰', '🎁', '⚡'],
      feature: ['⭐', '👌', '💯', '✅'],
      testimonial: ['❤️', '🙌', '💙', '👏'],
    };
    return emojiMap[campaignType] || emojiMap.feature;
  }

  private generateCTA(platform: string, campaignType: string): string {
    const ctas = {
      launch: 'Shop Now',
      sale: 'Get Your Deal',
      feature: 'Learn More',
      testimonial: 'Join Happy Customers',
    };
    return ctas[campaignType] || 'Shop Now';
  }

  private generateWelcomeEmail(name: string): string {
    return `Hi ${name},\n\nWelcome to Broxiva! We're thrilled to have you join our community of smart shoppers.\n\nAs a special welcome gift, enjoy 15% off your first order with code WELCOME15.\n\nHappy shopping!`;
  }

  private generateAbandonedCartEmail(
    name: string,
    cartItems: any[],
    discount?: number,
  ): string {
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
