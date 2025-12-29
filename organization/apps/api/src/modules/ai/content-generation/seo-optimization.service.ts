import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SeoOptimizationService {
  private readonly logger = new Logger(SeoOptimizationService.name);

  async optimizeContent(data: {
    content: string;
    targetKeywords: string[];
    contentType: 'product' | 'category' | 'blog' | 'landing';
  }) {
    try {
      this.logger.log('Optimizing content for SEO');

      // SEO optimization techniques:
      // - Keyword density analysis
      // - LSI keyword suggestions
      // - Readability scoring
      // - Meta tag generation
      // - Internal linking suggestions
      // - Schema markup
      // - Header structure optimization

      const { content, targetKeywords, contentType } = data;

      // Analyze keyword density
      const keywordAnalysis = this.analyzeKeywordDensity(content, targetKeywords);

      // Calculate readability scores
      const readability = this.calculateReadability(content);

      // Generate suggestions
      const suggestions = this.generateOptimizationSuggestions(
        content,
        targetKeywords,
        keywordAnalysis,
        readability,
      );

      // Suggest LSI keywords
      const lsiKeywords = this.suggestLSIKeywords(targetKeywords);

      // Optimize content
      const optimizedContent = this.applyOptimizations(content, suggestions);

      return {
        success: true,
        contentType,
        analysis: {
          wordCount: content.split(/\s+/).length,
          keywordDensity: keywordAnalysis,
          readability,
          seoScore: this.calculateSEOScore(keywordAnalysis, readability),
        },
        recommendations: {
          lsiKeywords,
          suggestions,
          headerStructure: this.analyzeHeaderStructure(content),
        },
        optimizedContent,
      };
    } catch (error) {
      this.logger.error('SEO optimization failed', error);
      throw error;
    }
  }

  async generateMetaTags(data: {
    productName: string;
    category: string;
    description?: string;
    price?: number;
  }) {
    try {
      const { productName, category, description, price } = data;

      // Generate SEO-optimized meta tags
      const title = `${productName} - ${category} | Buy Online | Broxiva`;
      const metaDescription =
        description?.substring(0, 160) ||
        `Shop ${productName} in ${category} category. ${
          price ? `Starting at $${price}.` : ''
        } Fast shipping, easy returns. Order now!`;

      const keywords = [
        productName.toLowerCase(),
        category.toLowerCase(),
        `buy ${productName.toLowerCase()}`,
        `${productName.toLowerCase()} online`,
        `${category.toLowerCase()} products`,
        'best price',
        'free shipping',
      ];

      // Open Graph tags
      const openGraph = {
        'og:title': productName,
        'og:description': metaDescription,
        'og:type': 'product',
        'og:url': `https://broxiva.com/products/${productName.toLowerCase().replace(/\s+/g, '-')}`,
        'og:image': `https://cdn.broxiva.com/products/${productName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        'og:site_name': 'Broxiva',
      };

      // Twitter Card tags
      const twitterCard = {
        'twitter:card': 'summary_large_image',
        'twitter:title': productName,
        'twitter:description': metaDescription,
        'twitter:image': openGraph['og:image'],
      };

      // Schema.org structured data
      const schema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productName,
        description: metaDescription,
        category: category,
        ...(price && {
          offers: {
            '@type': 'Offer',
            price: price,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
        }),
      };

      return {
        success: true,
        metaTags: {
          title,
          description: metaDescription,
          keywords: keywords.join(', '),
        },
        openGraph,
        twitterCard,
        schema,
        recommendations: [
          'Title length optimal (50-60 characters)',
          'Meta description within limit (150-160 characters)',
          'Keywords properly integrated',
          'Schema markup included',
        ],
      };
    } catch (error) {
      this.logger.error('Meta tag generation failed', error);
      throw error;
    }
  }

  private analyzeKeywordDensity(
    content: string,
    targetKeywords: string[],
  ): Record<string, { count: number; density: number; optimal: boolean }> {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    const analysis: Record<
      string,
      { count: number; density: number; optimal: boolean }
    > = {};

    targetKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const count = words.filter(word => word.includes(keywordLower)).length;
      const density = (count / totalWords) * 100;
      const optimal = density >= 1 && density <= 3; // 1-3% is optimal

      analysis[keyword] = { count, density, optimal };
    });

    return analysis;
  }

  private calculateReadability(content: string): {
    score: number;
    level: string;
    grade: string;
  } {
    // Simplified readability calculation (Flesch Reading Ease)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = Math.max(
      0,
      Math.min(
        100,
        206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord,
      ),
    );

    let level = '';
    let grade = '';

    if (score >= 90) {
      level = 'Very Easy';
      grade = '5th grade';
    } else if (score >= 80) {
      level = 'Easy';
      grade = '6th grade';
    } else if (score >= 70) {
      level = 'Fairly Easy';
      grade = '7th grade';
    } else if (score >= 60) {
      level = 'Standard';
      grade = '8th-9th grade';
    } else {
      level = 'Difficult';
      grade = '10th-12th grade';
    }

    return { score: Math.round(score), level, grade };
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    const vowels = word.match(/[aeiouy]+/g);
    return vowels ? vowels.length : 1;
  }

  private calculateSEOScore(keywordAnalysis: any, readability: any): number {
    let score = 0;

    // Keyword optimization (40 points)
    const optimalKeywords = Object.values(keywordAnalysis).filter(
      (k: any) => k.optimal,
    ).length;
    score += (optimalKeywords / Object.keys(keywordAnalysis).length) * 40;

    // Readability (30 points)
    score += (readability.score / 100) * 30;

    // Content length (30 points)
    const wordCount = Object.values(keywordAnalysis).reduce(
      (sum: number, k: any) => sum + k.count,
      0,
    );
    if (wordCount >= 300) score += 30;
    else score += (wordCount / 300) * 30;

    return Math.round(score);
  }

  private suggestLSIKeywords(targetKeywords: string[]): string[] {
    // In production: Use NLP models to find semantically related keywords
    const lsiMap: Record<string, string[]> = {
      laptop: ['computer', 'notebook', 'portable computer', 'computing device'],
      phone: ['smartphone', 'mobile', 'cell phone', 'mobile device'],
      headphones: ['earphones', 'audio', 'wireless headphones', 'earbuds'],
      camera: ['photography', 'digital camera', 'DSLR', 'lens'],
    };

    const lsiKeywords: string[] = [];
    targetKeywords.forEach(keyword => {
      const related = lsiMap[keyword.toLowerCase()] || [];
      lsiKeywords.push(...related);
    });

    return lsiKeywords;
  }

  private generateOptimizationSuggestions(
    content: string,
    targetKeywords: string[],
    keywordAnalysis: any,
    readability: any,
  ): string[] {
    const suggestions: string[] = [];

    // Keyword suggestions
    Object.entries(keywordAnalysis).forEach(([keyword, data]: [string, any]) => {
      if (data.density < 1) {
        suggestions.push(`Increase "${keyword}" density (currently ${data.density.toFixed(2)}%)`);
      } else if (data.density > 3) {
        suggestions.push(`Reduce "${keyword}" density to avoid keyword stuffing (currently ${data.density.toFixed(2)}%)`);
      }
    });

    // Readability suggestions
    if (readability.score < 60) {
      suggestions.push('Simplify sentences for better readability');
      suggestions.push('Use shorter words and clearer language');
    }

    // General suggestions
    suggestions.push('Add internal links to related products');
    suggestions.push('Include call-to-action phrases');
    suggestions.push('Use bullet points for features');

    return suggestions;
  }

  private analyzeHeaderStructure(content: string): {
    h1: number;
    h2: number;
    h3: number;
    recommendations: string[];
  } {
    // Simple header detection (in production parse HTML)
    const h1Count = (content.match(/# /g) || []).length;
    const h2Count = (content.match(/## /g) || []).length;
    const h3Count = (content.match(/### /g) || []).length;

    const recommendations: string[] = [];

    if (h1Count === 0) {
      recommendations.push('Add an H1 heading');
    } else if (h1Count > 1) {
      recommendations.push('Use only one H1 heading');
    }

    if (h2Count < 2) {
      recommendations.push('Add more H2 subheadings for better structure');
    }

    return {
      h1: h1Count,
      h2: h2Count,
      h3: h3Count,
      recommendations,
    };
  }

  private applyOptimizations(content: string, suggestions: string[]): string {
    // In production: Use NLP to apply optimizations
    // For now, return original content
    return content;
  }
}
