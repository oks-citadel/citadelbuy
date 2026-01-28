import { Injectable, Logger } from '@nestjs/common';

interface Suggestion {
  text: string;
  score: number;
  type: 'product' | 'category' | 'brand' | 'query';
  metadata?: any;
}

@Injectable()
export class AutocompleteService {
  private readonly logger = new Logger(AutocompleteService.name);

  // In production: Use Redis or Elasticsearch for fast lookups
  private readonly suggestionIndex: Map<string, Suggestion[]> = new Map();
  private readonly userHistory: Map<string, string[]> = new Map();

  constructor() {
    this.buildSuggestionIndex();
  }

  private buildSuggestionIndex() {
    // Build a simple trie-like structure for fast prefix matching
    const suggestions: Suggestion[] = [
      // Products
      { text: 'wireless headphones', score: 1000, type: 'product' },
      { text: 'wireless mouse', score: 850, type: 'product' },
      { text: 'winter jacket', score: 950, type: 'product' },
      { text: 'running shoes', score: 1200, type: 'product' },
      { text: 'laptop bag', score: 700, type: 'product' },
      { text: 'laptop stand', score: 600, type: 'product' },

      // Categories
      { text: 'electronics', score: 2000, type: 'category' },
      { text: 'clothing', score: 1800, type: 'category' },
      { text: 'shoes', score: 1600, type: 'category' },

      // Brands
      { text: 'apple products', score: 1500, type: 'brand', metadata: { brand: 'Apple' } },
      { text: 'nike shoes', score: 1300, type: 'brand', metadata: { brand: 'Nike' } },
      { text: 'samsung phones', score: 1100, type: 'brand', metadata: { brand: 'Samsung' } },

      // Popular queries
      { text: 'best wireless headphones under $100', score: 900, type: 'query' },
      { text: 'cheap laptops for students', score: 800, type: 'query' },
      { text: 'comfortable running shoes for wide feet', score: 750, type: 'query' },
    ];

    // Index by prefix
    suggestions.forEach(suggestion => {
      for (let i = 1; i <= suggestion.text.length; i++) {
        const prefix = suggestion.text.substring(0, i).toLowerCase();
        const existing = this.suggestionIndex.get(prefix) || [];
        existing.push(suggestion);
        this.suggestionIndex.set(prefix, existing);
      }
    });
  }

  async getSuggestions(query: string, userId?: string): Promise<any> {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          suggestions: [],
          message: 'Query too short',
        };
      }

      const normalized = query.toLowerCase().trim();

      // Get prefix matches
      const prefixMatches = this.getPrefixMatches(normalized);

      // Get personalized suggestions if userId provided
      const personalizedSuggestions = userId
        ? await this.getPersonalizedSuggestions(normalized, userId)
        : [];

      // Get trending suggestions
      const trendingSuggestions = this.getTrendingSuggestions(normalized);

      // Combine and rank suggestions
      const allSuggestions = [
        ...personalizedSuggestions,
        ...prefixMatches,
        ...trendingSuggestions,
      ];

      // Remove duplicates and sort by score
      const uniqueSuggestions = this.deduplicateAndRank(allSuggestions);

      // Apply intelligent re-ranking based on user context
      const rankedSuggestions = this.rerank(uniqueSuggestions, normalized, userId);

      return {
        success: true,
        query,
        suggestions: rankedSuggestions.slice(0, 10),
        metadata: {
          totalMatches: allSuggestions.length,
          personalized: personalizedSuggestions.length > 0,
        },
      };
    } catch (error) {
      this.logger.error('Autocomplete failed', error);
      throw error;
    }
  }

  private getPrefixMatches(prefix: string): Suggestion[] {
    const matches = this.suggestionIndex.get(prefix) || [];
    return matches.sort((a, b) => b.score - a.score);
  }

  private async getPersonalizedSuggestions(query: string, userId: string): Promise<Suggestion[]> {
    const history = this.userHistory.get(userId) || [];

    // Find historical queries that match
    const matchingHistory = history
      .filter(histQuery => histQuery.toLowerCase().includes(query))
      .map(text => ({
        text,
        score: 2000, // Boost historical queries
        type: 'query' as const,
        metadata: { personalized: true },
      }));

    return matchingHistory;
  }

  private getTrendingSuggestions(query: string): Suggestion[] {
    // Simplified trending logic
    const trending = [
      { text: 'black friday deals', score: 3000, type: 'query' as const },
      { text: 'cyber monday sale', score: 2800, type: 'query' as const },
      { text: 'new arrivals', score: 2500, type: 'query' as const },
    ];

    return trending.filter(item =>
      item.text.toLowerCase().includes(query.toLowerCase())
    );
  }

  private deduplicateAndRank(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    const unique: Suggestion[] = [];

    for (const suggestion of suggestions) {
      const key = suggestion.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    return unique.sort((a, b) => b.score - a.score);
  }

  private rerank(suggestions: Suggestion[], query: string, userId?: string): Suggestion[] {
    // Apply intelligent re-ranking
    return suggestions.map(suggestion => {
      let score = suggestion.score;

      // Boost exact prefix matches
      if (suggestion.text.toLowerCase().startsWith(query.toLowerCase())) {
        score += 500;
      }

      // Boost popular products
      if (suggestion.type === 'product') {
        score += 200;
      }

      // Boost personalized suggestions
      if (suggestion.metadata?.personalized) {
        score += 1000;
      }

      return {
        ...suggestion,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }

  async trackSelection(query: string, selectedSuggestion: string, userId?: string) {
    try {
      // Store for improving future suggestions
      if (userId) {
        const history = this.userHistory.get(userId) || [];
        history.push(selectedSuggestion);
        // Keep last 50 queries
        if (history.length > 50) {
          history.shift();
        }
        this.userHistory.set(userId, history);
      }

      return {
        success: true,
        tracked: true,
      };
    } catch (error) {
      this.logger.error('Failed to track selection', error);
      throw error;
    }
  }
}
