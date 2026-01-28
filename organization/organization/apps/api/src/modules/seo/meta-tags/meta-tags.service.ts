import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  MetaTagDto,
  CreateMetaTagDto,
  UpdateMetaTagDto,
  MetaTagQueryDto,
  BulkUpdateMetaTagsDto,
  MetaTagTemplateDto,
  MetaTagAnalysisDto,
  MetaTagSuggestionDto,
  OpenGraphTagsDto,
  TwitterCardTagsDto,
} from '../dto/meta-tags.dto';

@Injectable()
export class MetaTagsService {
  private readonly logger = new Logger(MetaTagsService.name);
  private readonly cachePrefix = 'seo:meta:';

  // In-memory storage (in production, use database table)
  private metaTags: Map<string, MetaTagDto> = new Map();
  private templates: Map<string, MetaTagTemplateDto> = new Map();

  // SEO best practices
  private readonly TITLE_MIN_LENGTH = 30;
  private readonly TITLE_MAX_LENGTH = 60;
  private readonly DESCRIPTION_MIN_LENGTH = 120;
  private readonly DESCRIPTION_MAX_LENGTH = 160;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default meta tag templates
   */
  private initializeDefaultTemplates(): void {
    this.templates.set('product', {
      id: 'tpl_product',
      name: 'Product Page Template',
      titleTemplate: '{productName} - Buy Online | {siteName}',
      descriptionTemplate: 'Shop {productName} at the best price. {shortDescription} Free shipping on orders over $50. {siteName}',
      variables: ['productName', 'shortDescription', 'siteName', 'price', 'brand'],
      openGraph: {
        type: 'product',
        titleTemplate: '{productName} - {price}',
        descriptionTemplate: '{shortDescription}',
      },
      twitterCard: {
        card: 'summary_large_image',
        titleTemplate: '{productName}',
        descriptionTemplate: '{shortDescription}',
      },
    });

    this.templates.set('category', {
      id: 'tpl_category',
      name: 'Category Page Template',
      titleTemplate: '{categoryName} - Shop {itemCount}+ Products | {siteName}',
      descriptionTemplate: 'Browse our collection of {categoryName}. {itemCount}+ products available. Find the best deals on {categoryName} at {siteName}.',
      variables: ['categoryName', 'itemCount', 'siteName'],
      openGraph: {
        type: 'website',
        titleTemplate: '{categoryName} Collection',
        descriptionTemplate: 'Shop {itemCount}+ {categoryName} products',
      },
    });

    this.templates.set('blog', {
      id: 'tpl_blog',
      name: 'Blog Post Template',
      titleTemplate: '{postTitle} | {siteName} Blog',
      descriptionTemplate: '{excerpt}',
      variables: ['postTitle', 'excerpt', 'author', 'siteName', 'publishDate'],
      openGraph: {
        type: 'article',
        titleTemplate: '{postTitle}',
        descriptionTemplate: '{excerpt}',
      },
      twitterCard: {
        card: 'summary_large_image',
        titleTemplate: '{postTitle}',
        descriptionTemplate: '{excerpt}',
      },
    });

    this.templates.set('default', {
      id: 'tpl_default',
      name: 'Default Page Template',
      titleTemplate: '{pageTitle} | {siteName}',
      descriptionTemplate: '{pageDescription}',
      variables: ['pageTitle', 'pageDescription', 'siteName'],
      openGraph: {
        type: 'website',
        titleTemplate: '{pageTitle}',
        descriptionTemplate: '{pageDescription}',
      },
    });
  }

  /**
   * Get all meta tags with filtering
   */
  async getMetaTags(query: MetaTagQueryDto): Promise<{
    metaTags: MetaTagDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    let tags = Array.from(this.metaTags.values());

    // Filter by URL pattern
    if (query.urlPattern) {
      const pattern = new RegExp(query.urlPattern, 'i');
      tags = tags.filter(t => pattern.test(t.url));
    }

    // Filter by page type
    if (query.pageType) {
      tags = tags.filter(t => t.pageType === query.pageType);
    }

    // Filter by issues
    if (query.hasIssues) {
      tags = tags.filter(t => t.issues && t.issues.length > 0);
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 50;
    const total = tags.length;
    const start = (page - 1) * limit;
    const paginatedTags = tags.slice(start, start + limit);

    return {
      metaTags: paginatedTags,
      total,
      page,
      limit,
    };
  }

  /**
   * Get meta tags for a specific URL
   */
  async getMetaTagsByUrl(url: string): Promise<MetaTagDto | null> {
    const cacheKey = `${this.cachePrefix}url:${url}`;
    const cached = await this.cacheService.get<MetaTagDto>(cacheKey);
    if (cached) return cached;

    for (const [, tag] of this.metaTags) {
      if (tag.url === url) {
        await this.cacheService.set(cacheKey, tag, { ttl: CacheTTL.MEDIUM });
        return tag;
      }
    }

    return null;
  }

  /**
   * Create or update meta tags for a URL
   */
  async upsertMetaTags(dto: CreateMetaTagDto): Promise<MetaTagDto> {
    const existing = await this.getMetaTagsByUrl(dto.url);

    if (existing) {
      return this.updateMetaTags(existing.id, dto);
    }

    const id = this.generateId();
    const analysis = this.analyzeMetaTags(dto);

    const metaTag: MetaTagDto = {
      id,
      url: dto.url,
      pageType: dto.pageType || 'default',
      title: dto.title,
      description: dto.description,
      keywords: dto.keywords,
      canonicalUrl: dto.canonicalUrl || dto.url,
      robots: dto.robots || 'index, follow',
      openGraph: dto.openGraph,
      twitterCard: dto.twitterCard,
      customTags: dto.customTags,
      issues: analysis.issues,
      score: analysis.score,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.metaTags.set(id, metaTag);
    await this.invalidateCache(dto.url);

    this.logger.log(`Created meta tags for: ${dto.url}`);

    return metaTag;
  }

  /**
   * Update meta tags
   */
  async updateMetaTags(id: string, dto: UpdateMetaTagDto): Promise<MetaTagDto> {
    const existing = this.metaTags.get(id);
    if (!existing) {
      throw new NotFoundException(`Meta tags with ID ${id} not found`);
    }

    const updated: MetaTagDto = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    // Re-analyze
    const analysis = this.analyzeMetaTags(updated);
    updated.issues = analysis.issues;
    updated.score = analysis.score;

    this.metaTags.set(id, updated);
    await this.invalidateCache(existing.url);

    return updated;
  }

  /**
   * Delete meta tags
   */
  async deleteMetaTags(id: string): Promise<void> {
    const existing = this.metaTags.get(id);
    if (!existing) {
      throw new NotFoundException(`Meta tags with ID ${id} not found`);
    }

    this.metaTags.delete(id);
    await this.invalidateCache(existing.url);
  }

  /**
   * Bulk update meta tags
   */
  async bulkUpdateMetaTags(dto: BulkUpdateMetaTagsDto): Promise<{
    updated: number;
    errors: string[];
  }> {
    let updated = 0;
    const errors: string[] = [];

    for (const item of dto.items) {
      try {
        await this.upsertMetaTags(item);
        updated++;
      } catch (error) {
        errors.push(`${item.url}: ${(error as Error).message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<MetaTagTemplateDto[]> {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<MetaTagTemplateDto> {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  /**
   * Apply template to generate meta tags
   */
  async applyTemplate(
    templateId: string,
    variables: Record<string, string>,
    url: string,
  ): Promise<MetaTagDto> {
    const template = await this.getTemplate(templateId);

    // Replace variables in templates
    const title = this.replaceVariables(template.titleTemplate, variables);
    const description = this.replaceVariables(template.descriptionTemplate, variables);

    let openGraph: OpenGraphTagsDto | undefined;
    if (template.openGraph) {
      openGraph = {
        title: this.replaceVariables(template.openGraph.titleTemplate || '', variables),
        description: this.replaceVariables(template.openGraph.descriptionTemplate || '', variables),
        type: template.openGraph.type,
        image: variables.image,
        url,
      };
    }

    let twitterCard: TwitterCardTagsDto | undefined;
    if (template.twitterCard) {
      twitterCard = {
        card: template.twitterCard.card as 'summary' | 'summary_large_image' | 'app' | 'player' | undefined,
        title: this.replaceVariables(template.twitterCard.titleTemplate || '', variables),
        description: this.replaceVariables(template.twitterCard.descriptionTemplate || '', variables),
        image: variables.image,
      };
    }

    return this.upsertMetaTags({
      url,
      pageType: templateId.replace('tpl_', ''),
      title,
      description,
      openGraph,
      twitterCard,
    });
  }

  /**
   * Analyze meta tags for SEO issues
   */
  analyzeMetaTags(dto: Partial<MetaTagDto>): MetaTagAnalysisDto {
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Title analysis
    if (!dto.title) {
      issues.push('Missing title tag');
      score -= 20;
    } else {
      if (dto.title.length < this.TITLE_MIN_LENGTH) {
        warnings.push(`Title is too short (${dto.title.length} chars). Aim for ${this.TITLE_MIN_LENGTH}-${this.TITLE_MAX_LENGTH} characters.`);
        score -= 5;
      }
      if (dto.title.length > this.TITLE_MAX_LENGTH) {
        warnings.push(`Title is too long (${dto.title.length} chars). It may be truncated in search results.`);
        score -= 5;
      }
    }

    // Description analysis
    if (!dto.description) {
      issues.push('Missing meta description');
      score -= 15;
    } else {
      if (dto.description.length < this.DESCRIPTION_MIN_LENGTH) {
        warnings.push(`Description is too short (${dto.description.length} chars). Aim for ${this.DESCRIPTION_MIN_LENGTH}-${this.DESCRIPTION_MAX_LENGTH} characters.`);
        score -= 5;
      }
      if (dto.description.length > this.DESCRIPTION_MAX_LENGTH) {
        warnings.push(`Description is too long (${dto.description.length} chars). It may be truncated in search results.`);
        score -= 5;
      }
    }

    // Canonical URL
    if (!dto.canonicalUrl) {
      warnings.push('No canonical URL specified. This can lead to duplicate content issues.');
      score -= 5;
    }

    // Open Graph
    if (!dto.openGraph) {
      suggestions.push('Add Open Graph tags for better social media sharing.');
      score -= 5;
    } else {
      if (!dto.openGraph.image) {
        warnings.push('Open Graph image is missing. Social shares will have less engagement.');
        score -= 3;
      }
    }

    // Twitter Card
    if (!dto.twitterCard) {
      suggestions.push('Add Twitter Card tags for better Twitter sharing.');
      score -= 3;
    }

    // Robots
    if (dto.robots && dto.robots.includes('noindex')) {
      warnings.push('Page is set to noindex. It will not appear in search results.');
    }

    return {
      score: Math.max(0, score),
      issues: issues.length > 0 ? issues : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      titleLength: dto.title?.length,
      descriptionLength: dto.description?.length,
    };
  }

  /**
   * Get SEO suggestions for content
   */
  async getSuggestions(
    content: string,
    targetKeywords?: string[],
  ): Promise<MetaTagSuggestionDto> {
    // Simple content analysis
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Extract potential keywords (most frequent meaningful words)
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'yet', 'both', 'either', 'neither', 'this', 'that', 'these', 'those', 'it', 'its']);

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    const topKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Generate title suggestion
    const firstSentence = content.split(/[.!?]/)[0] || '';
    let suggestedTitle = firstSentence.slice(0, 60);
    if (suggestedTitle.length > 50) {
      suggestedTitle = suggestedTitle.slice(0, suggestedTitle.lastIndexOf(' '));
    }

    // Generate description suggestion
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
    let suggestedDescription = sentences.slice(0, 2).join('. ').trim();
    if (suggestedDescription.length > 160) {
      suggestedDescription = suggestedDescription.slice(0, 157) + '...';
    } else if (suggestedDescription.length < 120 && sentences[2]) {
      suggestedDescription += '. ' + sentences[2].trim();
      if (suggestedDescription.length > 160) {
        suggestedDescription = suggestedDescription.slice(0, 157) + '...';
      }
    }

    // Keyword density analysis
    const keywordDensity: Record<string, number> = {};
    for (const keyword of targetKeywords || topKeywords.slice(0, 5)) {
      const count = words.filter(w => w.includes(keyword.toLowerCase())).length;
      keywordDensity[keyword] = (count / wordCount) * 100;
    }

    return {
      suggestedTitle,
      suggestedDescription,
      extractedKeywords: topKeywords,
      keywordDensity,
      contentWordCount: wordCount,
      readabilityScore: this.calculateReadabilityScore(content),
    };
  }

  /**
   * Generate meta tags for product
   */
  async generateProductMeta(productId: string): Promise<MetaTagDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const variables = {
      productName: product.name,
      shortDescription: product.description?.slice(0, 100) || '',
      siteName: 'Broxiva',
      price: product.price?.toFixed(2) || '',
      brand: '',
    };

    return this.applyTemplate('product', variables, `/products/${product.slug}`);
  }

  /**
   * Generate meta tags for category
   */
  async generateCategoryMeta(categoryId: string): Promise<MetaTagDto> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    const variables = {
      categoryName: category.name,
      itemCount: category._count.products.toString(),
      siteName: 'Broxiva',
    };

    return this.applyTemplate('category', variables, `/categories/${category.slug}`);
  }

  // Helper methods

  private generateId(): string {
    return 'meta_' + Math.random().toString(36).substring(2, 15);
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }
    return result.trim();
  }

  private calculateReadabilityScore(text: string): number {
    // Simplified Flesch Reading Ease calculation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private async invalidateCache(url: string): Promise<void> {
    await this.cacheService.deletePattern(`${this.cachePrefix}*`);
  }
}
