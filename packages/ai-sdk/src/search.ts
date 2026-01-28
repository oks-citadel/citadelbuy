/**
 * Search Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface SearchRequest {
  query: string;
  userId?: string;
  category?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  searchType?: 'keyword' | 'semantic' | 'hybrid';
}

export interface SearchResult {
  productId: string;
  name: string;
  description: string;
  price: number;
  score: number;
  highlights: string[];
  category: string;
  imageUrl?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  suggestions: string[];
  facets: Record<string, unknown>;
}

export interface VisualSearchResult {
  results: SearchResult[];
  total: number;
  searchType: 'visual';
}

export interface VoiceSearchResult {
  transcription: {
    text: string;
    confidence: number;
    language: string;
  };
  results: SearchResult[];
  total: number;
  searchType: 'voice';
}

export class SearchClient {
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/search`,
      timeout: config.timeout || 10000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Search products with AI-powered semantic search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search', {
      query: request.query,
      user_id: request.userId,
      category: request.category,
      filters: request.filters,
      page: request.page || 1,
      page_size: request.pageSize || 20,
      search_type: request.searchType || 'semantic',
    });
    return response.data;
  }

  /**
   * Search products using an image
   */
  async visualSearch(
    imageFile: File | Blob,
    options?: { category?: string; limit?: number }
  ): Promise<VisualSearchResult> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (options?.category) formData.append('category', options.category);
    if (options?.limit) formData.append('limit', String(options.limit));

    const response = await this.client.post<VisualSearchResult>('/visual-search', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Search products using voice input
   */
  async voiceSearch(
    audioFile: File | Blob,
    options?: { language?: string }
  ): Promise<VoiceSearchResult> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (options?.language) formData.append('language', options.language);

    const response = await this.client.post<VoiceSearchResult>('/voice-search', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query: string, limit: number = 10): Promise<string[]> {
    const response = await this.client.post<{ suggestions: string[] }>(
      '/autocomplete',
      { query, limit }
    );
    return response.data.suggestions;
  }

  /**
   * Get spelling correction
   */
  async spellCorrect(query: string): Promise<string> {
    const response = await this.client.post<{ corrected: string }>(
      '/spell-correct',
      { query }
    );
    return response.data.corrected;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
