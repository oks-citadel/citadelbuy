/**
 * Recommendation Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface RecommendationRequest {
  userId: string;
  productId?: string;
  category?: string;
  limit?: number;
  strategy?: 'collaborative' | 'content' | 'hybrid';
}

export interface ProductRecommendation {
  productId: string;
  score: number;
  reason: string;
  category: string;
}

export interface RecommendationResponse {
  userId: string;
  recommendations: ProductRecommendation[];
  strategyUsed: string;
  modelVersion: string;
}

export class RecommendationClient {
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/recommendation`,
      timeout: config.timeout || 10000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Get personalized product recommendations for a user
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const response = await this.client.post<RecommendationResponse>('/recommend', {
      user_id: request.userId,
      product_id: request.productId,
      category: request.category,
      limit: request.limit || 10,
      strategy: request.strategy || 'hybrid',
    });
    return response.data;
  }

  /**
   * Get products similar to a given product
   */
  async getSimilarProducts(productId: string, limit: number = 10): Promise<ProductRecommendation[]> {
    const response = await this.client.post<{ similar_products: ProductRecommendation[] }>(
      '/similar-products',
      { product_id: productId, limit }
    );
    return response.data.similar_products;
  }

  /**
   * Get trending products
   */
  async getTrending(category?: string, limit: number = 20): Promise<ProductRecommendation[]> {
    const response = await this.client.post<{ trending: ProductRecommendation[] }>(
      '/trending',
      { category, limit }
    );
    return response.data.trending;
  }

  /**
   * Get personalized homepage feed
   */
  async getPersonalizedFeed(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ProductRecommendation[]> {
    const response = await this.client.post<{ feed: ProductRecommendation[] }>(
      '/personalized-feed',
      { user_id: userId, page, page_size: pageSize }
    );
    return response.data.feed;
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
