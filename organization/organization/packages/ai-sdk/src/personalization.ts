/**
 * Personalization Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface UserProfile {
  userId: string;
  preferences: Record<string, unknown>;
  segments: string[];
  behaviorScore: number;
  lastUpdated: string;
}

export interface PersonalizedContent {
  userId: string;
  content: ContentItem[];
  personalizationScore: number;
}

export interface ContentItem {
  id: string;
  type: 'product' | 'banner' | 'category' | 'promotion';
  data: Record<string, unknown>;
  relevanceScore: number;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  criteria: Record<string, unknown>;
}

export class PersonalizationClient {
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/personalization`,
      timeout: config.timeout || 10000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Get user profile with preferences and segments
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>(`/profile/${userId}`);
    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>
  ): Promise<UserProfile> {
    const response = await this.client.put<UserProfile>(`/profile/${userId}/preferences`, preferences);
    return response.data;
  }

  /**
   * Get personalized homepage content
   */
  async getPersonalizedHomepage(userId: string): Promise<PersonalizedContent> {
    const response = await this.client.get<PersonalizedContent>(`/homepage/${userId}`);
    return response.data;
  }

  /**
   * Get personalized category page
   */
  async getPersonalizedCategory(
    userId: string,
    categoryId: string
  ): Promise<PersonalizedContent> {
    const response = await this.client.get<PersonalizedContent>(
      `/category/${categoryId}`,
      { params: { user_id: userId } }
    );
    return response.data;
  }

  /**
   * Get user segments
   */
  async getUserSegments(userId: string): Promise<UserSegment[]> {
    const response = await this.client.get<{ segments: UserSegment[] }>(
      `/segments/${userId}`
    );
    return response.data.segments;
  }

  /**
   * Track user behavior for personalization
   */
  async trackBehavior(
    userId: string,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.client.post('/track', {
      user_id: userId,
      event_type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get A/B test variant for user
   */
  async getExperimentVariant(
    userId: string,
    experimentId: string
  ): Promise<{ variant: string; config: Record<string, unknown> }> {
    const response = await this.client.get(`/experiment/${experimentId}/variant`, {
      params: { user_id: userId },
    });
    return response.data;
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
