import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  KeywordDto,
  KeywordDifficulty,
  KeywordResearchDto,
  KeywordResearchResultDto,
  ContentOptimizationDto,
  ContentOptimizationResultDto,
  InternalLinkDto,
  InternalLinkRecommendationDto,
  InternalLinkingAnalysisDto,
  ContentFreshnessDto,
  ContentFreshnessStatus,
  ContentFreshnessReportDto,
  QueryContentFreshnessDto,
  LinkType,
} from '../dto/content-seo.dto';

@Injectable()
export class ContentSeoService {
  private readonly logger = new Logger(ContentSeoService.name);
  private readonly baseUrl: string;
  private readonly cachePrefix = 'seo:content:';

  // Common stop words to exclude from keyword analysis
  private readonly stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
    'too', 'very', 'just', 'also', 'now', 'here', 'there',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://example.com';
  }

  /**
   * Perform keyword research
   */
  async researchKeywords(dto: KeywordResearchDto): Promise<KeywordResearchResultDto> {
    const cacheKey = `${this.cachePrefix}keywords:${dto.keyword}:${dto.country || 'us'}`;

    const cached = await this.cacheService.get<KeywordResearchResultDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would call keyword research APIs like
    // Google Keyword Planner, Ahrefs, SEMrush, etc.
    // For now, we'll simulate realistic keyword data

    const seedKeyword = dto.keyword.toLowerCase();
    const limit = dto.limit || 50;

    // Generate primary keyword variations
    const primaryKeywords: KeywordDto[] = this.generateKeywordVariations(seedKeyword, 'primary', limit / 3);

    // Generate long-tail variations
    const longTailKeywords: KeywordDto[] = dto.includeLongTail !== false
      ? this.generateKeywordVariations(seedKeyword, 'longtail', limit / 3)
      : [];

    // Generate question keywords
    const questionKeywords: KeywordDto[] = dto.includeQuestions !== false
      ? this.generateQuestionKeywords(seedKeyword, limit / 3)
      : [];

    // Analyze search intent
    const searchIntent = this.analyzeSearchIntent(seedKeyword);

    // Generate related topics
    const relatedTopics = this.generateRelatedTopics(seedKeyword);

    const result: KeywordResearchResultDto = {
      seedKeyword,
      primaryKeywords,
      longTailKeywords,
      questionKeywords,
      relatedTopics,
      searchIntent,
    };

    await this.cacheService.set(cacheKey, result, { ttl: CacheTTL.DAY });

    return result;
  }

  /**
   * Optimize content
   */
  async optimizeContent(dto: ContentOptimizationDto): Promise<ContentOptimizationResultDto> {
    const content = dto.content;
    const targetKeyword = dto.targetKeyword?.toLowerCase();
    const title = dto.title || '';
    const metaDescription = dto.metaDescription || '';

    // Analyze content
    const words = this.tokenize(content);
    const wordCount = words.length;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim());

    // Calculate keyword density
    let keywordDensity = 0;
    if (targetKeyword) {
      const keywordCount = words.filter((w) => w.includes(targetKeyword)).length;
      keywordDensity = (keywordCount / wordCount) * 100;
    }

    // Calculate readability (Flesch-Kincaid simplified)
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    const avgSyllables = this.estimateAvgSyllables(words);
    const readabilityScore = Math.max(0, Math.min(100,
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllables / Math.max(wordCount, 1))
    ));

    // Analyze title
    const titleAnalysis = {
      length: title.length,
      hasKeyword: targetKeyword ? title.toLowerCase().includes(targetKeyword) : false,
      isOptimalLength: title.length >= 50 && title.length <= 60,
      suggestions: [] as string[],
    };

    if (title.length < 30) {
      titleAnalysis.suggestions.push('Title is too short. Aim for 50-60 characters.');
    } else if (title.length > 60) {
      titleAnalysis.suggestions.push('Title may be truncated. Keep it under 60 characters.');
    }
    if (targetKeyword && !titleAnalysis.hasKeyword) {
      titleAnalysis.suggestions.push(`Include the target keyword "${targetKeyword}" in the title.`);
    }

    // Analyze meta description
    const metaDescriptionAnalysis = {
      length: metaDescription.length,
      hasKeyword: targetKeyword ? metaDescription.toLowerCase().includes(targetKeyword) : false,
      isOptimalLength: metaDescription.length >= 150 && metaDescription.length <= 160,
      suggestions: [] as string[],
    };

    if (metaDescription.length < 120) {
      metaDescriptionAnalysis.suggestions.push('Meta description is too short. Aim for 150-160 characters.');
    } else if (metaDescription.length > 160) {
      metaDescriptionAnalysis.suggestions.push('Meta description may be truncated. Keep it under 160 characters.');
    }
    if (targetKeyword && !metaDescriptionAnalysis.hasKeyword) {
      metaDescriptionAnalysis.suggestions.push(`Include the target keyword "${targetKeyword}" in the meta description.`);
    }

    // Analyze headings
    const h1Matches = content.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
    const h2Matches = content.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
    const h3Matches = content.match(/<h3[^>]*>.*?<\/h3>/gi) || [];

    const headingAnalysis = {
      hasH1: h1Matches.length > 0,
      h1Count: h1Matches.length,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      hasKeywordInHeadings: false,
      suggestions: [] as string[],
    };

    if (targetKeyword) {
      const allHeadings = [...h1Matches, ...h2Matches, ...h3Matches].join(' ').toLowerCase();
      headingAnalysis.hasKeywordInHeadings = allHeadings.includes(targetKeyword);
    }

    if (!headingAnalysis.hasH1) {
      headingAnalysis.suggestions.push('Add an H1 heading to the content.');
    }
    if (headingAnalysis.h1Count > 1) {
      headingAnalysis.suggestions.push('Use only one H1 heading per page.');
    }
    if (headingAnalysis.h2Count < 2 && wordCount > 500) {
      headingAnalysis.suggestions.push('Add more H2 subheadings to structure the content.');
    }

    // Generate suggestions
    const suggestions: ContentOptimizationResultDto['suggestions'] = [];

    if (wordCount < 300) {
      suggestions.push({
        category: 'content',
        priority: 'high',
        message: 'Content is too thin. Aim for at least 300 words for better SEO.',
        currentValue: `${wordCount} words`,
        recommendedValue: '300+ words',
      });
    }

    if (keywordDensity < 0.5 && targetKeyword) {
      suggestions.push({
        category: 'keywords',
        priority: 'medium',
        message: 'Keyword density is low. Include the target keyword more naturally.',
        currentValue: `${keywordDensity.toFixed(2)}%`,
        recommendedValue: '1-2%',
      });
    } else if (keywordDensity > 3 && targetKeyword) {
      suggestions.push({
        category: 'keywords',
        priority: 'high',
        message: 'Keyword stuffing detected. Reduce keyword usage to avoid penalties.',
        currentValue: `${keywordDensity.toFixed(2)}%`,
        recommendedValue: '1-2%',
      });
    }

    if (readabilityScore < 50) {
      suggestions.push({
        category: 'readability',
        priority: 'medium',
        message: 'Content is difficult to read. Use shorter sentences and simpler words.',
        currentValue: `Score: ${Math.round(readabilityScore)}`,
        recommendedValue: 'Score: 60+',
      });
    }

    // Generate LSI keywords
    const lsiKeywords = targetKeyword
      ? this.generateLSIKeywords(targetKeyword, words)
      : [];

    // Calculate SEO score
    let seoScore = 50;
    if (titleAnalysis.hasKeyword) seoScore += 10;
    if (titleAnalysis.isOptimalLength) seoScore += 5;
    if (metaDescriptionAnalysis.hasKeyword) seoScore += 10;
    if (metaDescriptionAnalysis.isOptimalLength) seoScore += 5;
    if (headingAnalysis.hasH1) seoScore += 5;
    if (headingAnalysis.hasKeywordInHeadings) seoScore += 5;
    if (wordCount >= 300) seoScore += 5;
    if (keywordDensity >= 0.5 && keywordDensity <= 3) seoScore += 5;

    return {
      seoScore: Math.min(100, seoScore),
      readabilityScore: Math.round(readabilityScore),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      wordCount,
      titleAnalysis,
      metaDescriptionAnalysis,
      headingAnalysis,
      suggestions,
      lsiKeywords,
    };
  }

  /**
   * Analyze internal linking
   */
  async analyzeInternalLinks(): Promise<InternalLinkingAnalysisDto> {
    // Get all products and categories
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, categoryId: true, description: true },
      }),
      this.prisma.category.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true, slug: true, name: true },
      }),
    ]);

    const totalPages = products.length + categories.length;
    const links: InternalLinkDto[] = [];

    // Simulate internal link analysis
    // In reality, this would crawl pages and extract links
    for (const product of products) {
      const productUrl = `${this.baseUrl}/products/${product.slug}`;
      const category = categories.find((c) => c.id === product.categoryId);

      if (category) {
        links.push({
          sourceUrl: productUrl,
          targetUrl: `${this.baseUrl}/categories/${category.slug}`,
          anchorText: category.name,
          linkType: LinkType.INTERNAL,
          isDofollow: true,
        });
      }

      // Simulate related product links
      const relatedProducts = products
        .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
        .slice(0, 3);

      for (const related of relatedProducts) {
        links.push({
          sourceUrl: productUrl,
          targetUrl: `${this.baseUrl}/products/${related.slug}`,
          anchorText: related.name,
          linkType: LinkType.INTERNAL,
          isDofollow: true,
        });
      }
    }

    // Find orphan pages (no incoming links)
    const linkedToUrls = new Set(links.map((l) => l.targetUrl));
    const allUrls = [
      ...products.map((p) => `${this.baseUrl}/products/${p.slug}`),
      ...categories.map((c) => `${this.baseUrl}/categories/${c.slug}`),
    ];
    const orphanPages = allUrls.filter((url) => !linkedToUrls.has(url));

    // Calculate links per page
    const linksBySource = new Map<string, number>();
    const linksByTarget = new Map<string, number>();

    for (const link of links) {
      linksBySource.set(link.sourceUrl, (linksBySource.get(link.sourceUrl) || 0) + 1);
      linksByTarget.set(link.targetUrl, (linksByTarget.get(link.targetUrl) || 0) + 1);
    }

    // Find underlinked pages
    const underlinkedPages = Array.from(linksByTarget.entries())
      .filter(([, count]) => count < 3)
      .map(([url, count]) => ({
        url,
        incomingLinks: count,
        outgoingLinks: linksBySource.get(url) || 0,
      }));

    // Find overlinked pages
    const overlinkedPages = Array.from(linksBySource.entries())
      .filter(([, count]) => count > 50)
      .map(([url, count]) => ({
        url,
        outgoingLinks: count,
      }));

    // Generate recommendations
    const recommendations: InternalLinkRecommendationDto[] = [];

    for (const orphan of orphanPages.slice(0, 10)) {
      // Find related pages that could link to this orphan
      const slug = orphan.split('/').pop() || '';
      const relatedPages = products
        .filter((p) => p.slug !== slug && p.description?.toLowerCase().includes(slug.split('-')[0]))
        .slice(0, 3);

      for (const related of relatedPages) {
        recommendations.push({
          sourceUrl: `${this.baseUrl}/products/${related.slug}`,
          targetUrl: orphan,
          suggestedAnchorText: slug.replace(/-/g, ' '),
          relevanceScore: 75 + Math.random() * 25,
          reason: 'Page has no incoming links (orphan page)',
        });
      }
    }

    return {
      totalInternalLinks: links.length,
      totalPages,
      averageLinksPerPage: links.length / Math.max(totalPages, 1),
      orphanPages: orphanPages.slice(0, 20),
      underlinkedPages: underlinkedPages.slice(0, 20),
      overlinkedPages: overlinkedPages.slice(0, 10),
      recommendations: recommendations.slice(0, 20),
      linkEquityDistribution: {
        highAuthority: allUrls.filter((url) => (linksByTarget.get(url) || 0) >= 10).slice(0, 10),
        mediumAuthority: allUrls.filter((url) => {
          const count = linksByTarget.get(url) || 0;
          return count >= 3 && count < 10;
        }).slice(0, 20),
        lowAuthority: allUrls.filter((url) => (linksByTarget.get(url) || 0) < 3).slice(0, 20),
      },
    };
  }

  /**
   * Get content freshness report
   */
  async getContentFreshness(query?: QueryContentFreshnessDto): Promise<ContentFreshnessReportDto> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        updatedAt: true,
      },
      take: query?.limit || 100,
      skip: ((query?.page || 1) - 1) * (query?.limit || 100),
    });

    const now = new Date();
    const items: ContentFreshnessDto[] = [];

    for (const product of products) {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - product.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: ContentFreshnessStatus;
      let priorityScore = 0;

      if (daysSinceUpdate <= 30) {
        status = ContentFreshnessStatus.FRESH;
        priorityScore = 10;
      } else if (daysSinceUpdate <= 90) {
        status = ContentFreshnessStatus.NEEDS_UPDATE;
        priorityScore = 50;
      } else if (daysSinceUpdate <= 180) {
        status = ContentFreshnessStatus.STALE;
        priorityScore = 75;
      } else {
        status = ContentFreshnessStatus.OUTDATED;
        priorityScore = 100;
      }

      // Apply filters
      if (query?.status && status !== query.status) continue;
      if (query?.minDaysSinceUpdate && daysSinceUpdate < query.minDaysSinceUpdate) continue;
      if (query?.maxDaysSinceUpdate && daysSinceUpdate > query.maxDaysSinceUpdate) continue;

      const recommendations: string[] = [];
      if (status !== ContentFreshnessStatus.FRESH) {
        recommendations.push('Update product description with current information');
        recommendations.push('Refresh images if product appearance has changed');
        recommendations.push('Verify pricing and availability are accurate');
        if (status === ContentFreshnessStatus.OUTDATED) {
          recommendations.push('Consider adding new features or use cases');
        }
      }

      items.push({
        url: `${this.baseUrl}/products/${product.slug}`,
        title: product.name,
        lastModified: product.updatedAt.toISOString(),
        daysSinceUpdate,
        status,
        trafficTrend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)] as any,
        rankingTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
        recommendations,
        priorityScore,
      });
    }

    // Sort by priority or custom sort
    if (query?.sortBy) {
      items.sort((a, b) => {
        const aVal = a[query.sortBy as keyof ContentFreshnessDto];
        const bVal = b[query.sortBy as keyof ContentFreshnessDto];
        if (aVal === undefined || bVal === undefined) return 0;
        if (query.sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        }
        return aVal > bVal ? 1 : -1;
      });
    } else {
      items.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
    }

    const freshCount = items.filter((i) => i.status === ContentFreshnessStatus.FRESH).length;
    const needsUpdateCount = items.filter((i) => i.status === ContentFreshnessStatus.NEEDS_UPDATE).length;
    const staleCount = items.filter((i) => i.status === ContentFreshnessStatus.STALE).length;
    const outdatedCount = items.filter((i) => i.status === ContentFreshnessStatus.OUTDATED).length;

    return {
      totalContent: items.length,
      freshCount,
      needsUpdateCount,
      staleCount,
      outdatedCount,
      items,
      topPriorityUpdates: items
        .filter((i) => i.status !== ContentFreshnessStatus.FRESH)
        .slice(0, 10),
    };
  }

  // Helper methods

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.stopWords.has(word));
  }

  private estimateAvgSyllables(words: string[]): number {
    // Simple syllable estimation
    const totalSyllables = words.reduce((sum, word) => {
      const syllables = word.match(/[aeiouy]+/gi) || [];
      return sum + Math.max(1, syllables.length);
    }, 0);
    return totalSyllables / Math.max(words.length, 1);
  }

  private generateKeywordVariations(seed: string, type: string, count: number): KeywordDto[] {
    const variations: KeywordDto[] = [];
    const prefixes = ['best', 'top', 'cheap', 'affordable', 'quality', 'premium'];
    const suffixes = ['online', 'near me', 'for sale', 'deals', 'reviews', 'comparison'];

    for (let i = 0; i < count; i++) {
      let keyword: string;
      let volume: number;
      let difficulty: KeywordDifficulty;

      if (type === 'longtail') {
        const prefix = prefixes[i % prefixes.length];
        const suffix = suffixes[i % suffixes.length];
        keyword = `${prefix} ${seed} ${suffix}`;
        volume = Math.floor(Math.random() * 1000) + 100;
        difficulty = KeywordDifficulty.EASY;
      } else {
        keyword = i === 0 ? seed : `${seed} ${suffixes[i % suffixes.length]}`;
        volume = Math.floor(Math.random() * 10000) + 1000;
        difficulty = volume > 5000 ? KeywordDifficulty.HARD : KeywordDifficulty.MEDIUM;
      }

      variations.push({
        keyword,
        searchVolume: volume,
        difficulty,
        cpc: Math.random() * 5 + 0.5,
        competition: Math.random(),
        trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
      });
    }

    return variations;
  }

  private generateQuestionKeywords(seed: string, count: number): KeywordDto[] {
    const questions = [
      `what is ${seed}`,
      `how to use ${seed}`,
      `where to buy ${seed}`,
      `why choose ${seed}`,
      `when to use ${seed}`,
      `which ${seed} is best`,
      `how much does ${seed} cost`,
      `is ${seed} worth it`,
      `can I get ${seed} online`,
      `does ${seed} work`,
    ];

    return questions.slice(0, count).map((q) => ({
      keyword: q,
      searchVolume: Math.floor(Math.random() * 500) + 50,
      difficulty: KeywordDifficulty.EASY,
      cpc: Math.random() * 2 + 0.2,
      competition: Math.random() * 0.5,
      trend: 'stable' as any,
    }));
  }

  private analyzeSearchIntent(keyword: string): {
    informational: number;
    navigational: number;
    transactional: number;
    commercial: number;
  } {
    const words = keyword.toLowerCase().split(' ');

    let informational = 0.25;
    let navigational = 0.25;
    let transactional = 0.25;
    let commercial = 0.25;

    // Transactional signals
    if (words.some((w) => ['buy', 'order', 'purchase', 'price', 'cheap', 'deal'].includes(w))) {
      transactional = 0.5;
      commercial = 0.3;
      informational = 0.1;
      navigational = 0.1;
    }
    // Informational signals
    else if (words.some((w) => ['what', 'how', 'why', 'when', 'guide', 'tutorial'].includes(w))) {
      informational = 0.6;
      commercial = 0.2;
      transactional = 0.1;
      navigational = 0.1;
    }
    // Commercial signals
    else if (words.some((w) => ['best', 'top', 'review', 'compare', 'vs'].includes(w))) {
      commercial = 0.5;
      transactional = 0.3;
      informational = 0.15;
      navigational = 0.05;
    }

    return { informational, navigational, transactional, commercial };
  }

  private generateRelatedTopics(seed: string): string[] {
    return [
      `${seed} alternatives`,
      `${seed} benefits`,
      `${seed} features`,
      `${seed} pricing`,
      `${seed} tips`,
      `${seed} trends`,
      `${seed} guide`,
      `${seed} examples`,
    ];
  }

  private generateLSIKeywords(targetKeyword: string, words: string[]): string[] {
    // Find frequently occurring words that could be LSI keywords
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3 && !word.includes(targetKeyword)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .filter(([, freq]) => freq >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}
