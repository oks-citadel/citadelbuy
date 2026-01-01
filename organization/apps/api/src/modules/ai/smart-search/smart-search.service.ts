import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import natural from 'natural';

export interface SearchQuery {
  original: string;
  corrected: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

export interface ProductResult {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  categoryId: string;
  categoryName: string;
  vendorId: string;
  vendorName: string;
  stock: number;
  avgRating: number | null;
  reviewCount: number;
  relevanceScore: number;
}

@Injectable()
export class SmartSearchService {
  private readonly logger = new Logger(SmartSearchService.name);
  private readonly tokenizer = new natural.WordTokenizer();
  private readonly stemmer = natural.PorterStemmer;
  private readonly spellCheck = new natural.Spellcheck(['product', 'shoes', 'shirt', 'pants', 'jacket', 'watch', 'phone', 'laptop', 'tablet', 'dress', 'electronics', 'clothing', 'accessories', 'furniture', 'beauty', 'sports', 'toys', 'books', 'food', 'drinks']);

  // In-memory caching with TTL for search history (use Redis in production)
  private searchHistory: Map<string, any[]> = new Map();
  private queryStats: Map<string, number> = new Map();
  private searchCache: Map<string, { results: ProductResult[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async search(query: string, userId?: string) {
    try {
      // Normalize and correct query
      const processedQuery = await this.processQuery(query);

      // Get search results
      const results = await this.executeSearch(processedQuery);

      // Track search
      await this.trackQuery({ query, userId, results: results.length });

      // Get related suggestions
      const suggestions = await this.getRelatedQueries(processedQuery.corrected);

      return {
        success: true,
        query: processedQuery,
        results,
        suggestions,
        metadata: {
          correctedQuery: processedQuery.corrected !== query,
          confidence: processedQuery.confidence,
          intent: processedQuery.intent,
        },
      };
    } catch (error) {
      this.logger.error('Smart search failed', error);
      throw error;
    }
  }

  async processQuery(query: string): Promise<SearchQuery> {
    const normalized = query.toLowerCase().trim();

    // Tokenize
    const tokens = this.tokenizer.tokenize(normalized);

    // Spell check and correction
    const correctedTokens = tokens.map(token => {
      const corrections = this.spellCheck.getCorrections(token, 1);
      return corrections.length > 0 ? corrections[0] : token;
    });

    const corrected = correctedTokens.join(' ');

    // Stem words for better matching
    const stemmedTokens = correctedTokens.map(token => this.stemmer.stem(token));

    // Detect intent
    const intent = this.detectIntent(normalized);

    // Extract entities (price, color, size, brand, etc.)
    const entities = this.extractEntities(normalized);

    return {
      original: query,
      corrected,
      intent,
      entities,
      confidence: corrected === normalized ? 1.0 : 0.85,
    };
  }

  private detectIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('cheap') || lowerQuery.includes('under') || lowerQuery.includes('budget')) {
      return 'price_conscious';
    }

    if (lowerQuery.includes('best') || lowerQuery.includes('top') || lowerQuery.includes('recommended')) {
      return 'quality_focused';
    }

    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('difference')) {
      return 'comparison';
    }

    if (lowerQuery.includes('review') || lowerQuery.includes('rating')) {
      return 'research';
    }

    return 'general_search';
  }

  private extractEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Price extraction
    const priceMatch = query.match(/(\$|under|below|less than)\s*(\d+)/i);
    if (priceMatch) {
      entities.maxPrice = parseInt(priceMatch[2]);
    }

    // Color extraction
    const colors = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
    colors.forEach(color => {
      if (query.toLowerCase().includes(color)) {
        entities.color = color;
      }
    });

    // Size extraction
    const sizeMatch = query.match(/\b(small|medium|large|xl|xxl|xs|s|m|l)\b/i);
    if (sizeMatch) {
      entities.size = sizeMatch[1].toUpperCase();
    }

    // Brand extraction (simplified - in production use NER)
    const brands = ['nike', 'adidas', 'apple', 'samsung', 'sony', 'lg', 'dell', 'hp'];
    brands.forEach(brand => {
      if (query.toLowerCase().includes(brand)) {
        entities.brand = brand;
      }
    });

    return entities;
  }

  private async executeSearch(processedQuery: SearchQuery): Promise<ProductResult[]> {
    const { corrected, entities } = processedQuery;

    // Check cache first
    const cacheKey = JSON.stringify({ query: corrected, entities });
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Cache hit for query: ${corrected}`);
      return cached.results;
    }

    // Build search conditions
    const searchTerms = corrected.split(' ').filter(term => term.length > 1);

    // Create OR conditions for name, description, and category name
    const searchConditions: any[] = searchTerms.map(term => ({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
        { vendor: { name: { contains: term, mode: 'insensitive' } } },
      ],
    }));

    // Build filter conditions from entities
    const filterConditions: any = {};

    if (entities.maxPrice) {
      filterConditions.price = { lte: entities.maxPrice };
    }

    if (entities.brand) {
      filterConditions.vendor = {
        name: { contains: entities.brand, mode: 'insensitive' }
      };
    }

    // Execute database query
    try {
      const products = await this.prisma.product.findMany({
        where: {
          AND: [
            { status: 'ACTIVE' },
            { OR: searchConditions.flatMap(c => c.OR) },
            ...Object.keys(filterConditions).length > 0 ? [filterConditions] : [],
          ],
        },
        include: {
          category: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
        },
        take: 50, // Limit to top 50 results for NLP scoring
        orderBy: [
          { stock: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Calculate relevance scores for each product
      const scoredResults: ProductResult[] = products.map(product => {
        const productReviews = product.reviews || [];
        const relevanceScore = this.calculateRelevanceScore(product, searchTerms, entities);
        const avgRating = productReviews.length > 0
          ? productReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / productReviews.length
          : null;

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          images: product.images,
          categoryId: product.category?.id ?? product.categoryId,
          categoryName: product.category?.name ?? '',
          vendorId: product.vendor?.id ?? product.vendorId,
          vendorName: product.vendor?.name ?? '',
          stock: product.stock,
          avgRating,
          reviewCount: productReviews.length,
          relevanceScore,
        };
      });

      // Sort by relevance score
      scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Take top 20 most relevant
      const topResults = scoredResults.slice(0, 20);

      // Cache results
      this.searchCache.set(cacheKey, { results: topResults, timestamp: Date.now() });

      this.logger.log(`Smart search for "${corrected}" returned ${topResults.length} results`);
      return topResults;
    } catch (error) {
      this.logger.error(`Database search failed: ${error.message}`);
      // Return empty results on database error
      return [];
    }
  }

  /**
   * Calculate relevance score based on term matching and entity alignment
   */
  private calculateRelevanceScore(
    product: any,
    searchTerms: string[],
    entities: Record<string, any>,
  ): number {
    let score = 0;
    const productName = product.name.toLowerCase();
    const productDesc = (product.description || '').toLowerCase();
    const categoryName = product.category.name.toLowerCase();
    const vendorName = product.vendor.name.toLowerCase();

    // Term matching in name (highest weight)
    for (const term of searchTerms) {
      const termLower = term.toLowerCase();
      if (productName.includes(termLower)) {
        score += 0.4;
        // Bonus for exact word match
        if (productName.split(/\s+/).some(word => word === termLower)) {
          score += 0.2;
        }
      }
      if (productDesc.includes(termLower)) {
        score += 0.15;
      }
      if (categoryName.includes(termLower)) {
        score += 0.2;
      }
      if (vendorName.includes(termLower)) {
        score += 0.1;
      }
    }

    // Entity alignment bonuses
    if (entities.brand && vendorName.includes(entities.brand.toLowerCase())) {
      score += 0.3;
    }
    if (entities.maxPrice && product.price <= entities.maxPrice) {
      score += 0.1;
    }
    if (entities.color && (productName.includes(entities.color) || productDesc.includes(entities.color))) {
      score += 0.2;
    }

    // Availability bonus
    if (product.stock > 0) {
      score += 0.1;
    }

    // Reviews/rating bonus
    if (product.reviews && product.reviews.length > 0) {
      const avgRating = product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.reviews.length;
      score += avgRating / 50; // Small bonus based on rating
    }

    // Normalize score to 0-1 range
    return Math.min(1, Math.max(0, score / (searchTerms.length || 1)));
  }

  async semanticSearch(query: string) {
    try {
      // Semantic understanding using embeddings
      // In production: Use sentence transformers or OpenAI embeddings

      const semanticIntent = this.getSemanticIntent(query);
      const relatedConcepts = this.getRelatedConcepts(query);

      return {
        success: true,
        query,
        semanticIntent,
        relatedConcepts,
        expandedQuery: this.expandQuery(query, relatedConcepts),
      };
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      throw error;
    }
  }

  private getSemanticIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Intent categories
    const intents = {
      purchase: ['buy', 'purchase', 'get', 'order', 'need'],
      research: ['review', 'compare', 'best', 'good', 'recommend'],
      specific: ['find', 'looking for', 'search', 'show me'],
      support: ['help', 'how to', 'problem', 'issue'],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return intent;
      }
    }

    return 'general';
  }

  private getRelatedConcepts(query: string): string[] {
    // Simplified concept expansion
    const conceptMap: Record<string, string[]> = {
      'phone': ['smartphone', 'mobile', 'cellphone', 'iphone', 'android'],
      'laptop': ['notebook', 'computer', 'macbook', 'chromebook'],
      'shoes': ['footwear', 'sneakers', 'boots', 'sandals'],
      'shirt': ['tshirt', 'blouse', 'top', 'polo'],
    };

    const lowerQuery = query.toLowerCase();
    const concepts: string[] = [];

    for (const [key, related] of Object.entries(conceptMap)) {
      if (lowerQuery.includes(key)) {
        concepts.push(...related);
      }
    }

    return concepts;
  }

  private expandQuery(query: string, concepts: string[]): string {
    if (concepts.length === 0) return query;
    return `${query} ${concepts.slice(0, 3).join(' ')}`;
  }

  async getTrendingQueries(limit: number = 10): Promise<any[]> {
    try {
      // Sort queries by frequency
      const sorted = Array.from(this.queryStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      return sorted.map(([query, count]) => ({
        query,
        count,
        trending: true,
      }));
    } catch (error) {
      this.logger.error('Failed to get trending queries', error);
      throw error;
    }
  }

  async trackQuery(data: { query: string; userId?: string; results: number }) {
    try {
      const { query, userId, results } = data;

      // Update query statistics
      const currentCount = this.queryStats.get(query) || 0;
      this.queryStats.set(query, currentCount + 1);

      // Store in user history
      if (userId) {
        const history = this.searchHistory.get(userId) || [];
        history.push({
          query,
          results,
          timestamp: new Date().toISOString(),
        });
        this.searchHistory.set(userId, history);
      }

      return {
        success: true,
        tracked: true,
      };
    } catch (error) {
      this.logger.error('Failed to track query', error);
      throw error;
    }
  }

  private async getRelatedQueries(query: string): Promise<string[]> {
    // Use TF-IDF or similar to find related queries
    // Simplified version
    const related = [
      `${query} reviews`,
      `best ${query}`,
      `${query} sale`,
      `cheap ${query}`,
    ];

    return related;
  }

  async getPopularSearches(category?: string): Promise<any[]> {
    // Return popular searches, optionally filtered by category
    const popular = [
      { query: 'wireless headphones', count: 1250, category: 'electronics' },
      { query: 'running shoes', count: 980, category: 'shoes' },
      { query: 'laptop bag', count: 875, category: 'accessories' },
      { query: 'winter jacket', count: 720, category: 'clothing' },
    ];

    if (category) {
      return popular.filter(item => item.category === category);
    }

    return popular;
  }
}
