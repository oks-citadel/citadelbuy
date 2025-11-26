/**
 * Analytics Service Client
 */

import axios, { AxiosInstance } from 'axios';
import type { AIConfig } from './index';

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
  timestamp?: string;
}

export interface DashboardMetrics {
  period: {
    start: string;
    end: string;
  };
  metrics: Record<string, unknown>;
}

export interface RealtimeOverview {
  timestamp: string;
  activeUsers: number;
  activeSessions: number;
  ordersToday: number;
  revenueToday: number;
  cartValueAvg: number;
  conversionRate: number;
}

export interface Forecast {
  metric: string;
  forecast: Array<{ date: string; value: number }>;
  confidenceIntervals: Array<{ date: string; lower: number; upper: number }>;
  modelAccuracy: number;
  generatedAt: string;
}

export interface Anomaly {
  timestamp: string;
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CohortAnalysis {
  cohortType: string;
  metric: string;
  cohorts: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export interface FunnelAnalysis {
  funnel: string;
  stages: Array<{ name: string; count: number }>;
  conversionRates: Array<{ from: string; to: string; rate: number }>;
  dropOffPoints: Array<{ stage: string; dropOff: number }>;
  recommendations: string[];
}

export interface UserJourney {
  userId: string;
  touchpoints: Array<{
    timestamp: string;
    type: string;
    details: Record<string, unknown>;
  }>;
  journeyStage: string;
  engagementScore: number;
  likelihoodToConvert: number;
  recommendedActions: string[];
}

export class AnalyticsClient {
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/analytics`,
      timeout: config.timeout || 10000,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {},
    });
  }

  /**
   * Track a single event
   */
  async trackEvent(event: AnalyticsEvent): Promise<{ eventId: string }> {
    const response = await this.client.post<{ event_id: string }>('/events/track', {
      event_type: event.eventType,
      user_id: event.userId,
      session_id: event.sessionId,
      properties: event.properties,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    return { eventId: response.data.event_id };
  }

  /**
   * Track multiple events in batch
   */
  async trackBatch(events: AnalyticsEvent[]): Promise<{ count: number }> {
    const response = await this.client.post<{ count: number }>('/events/batch', events.map(e => ({
      event_type: e.eventType,
      user_id: e.userId,
      session_id: e.sessionId,
      properties: e.properties,
      timestamp: e.timestamp || new Date().toISOString(),
    })));
    return response.data;
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions?: string[],
    filters?: Record<string, unknown>
  ): Promise<DashboardMetrics> {
    const response = await this.client.post<DashboardMetrics>('/dashboard/metrics', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      metrics,
      dimensions,
      filters,
    });
    return response.data;
  }

  /**
   * Get real-time overview
   */
  async getRealtimeOverview(): Promise<RealtimeOverview> {
    const response = await this.client.get<{
      timestamp: string;
      active_users: number;
      active_sessions: number;
      orders_today: number;
      revenue_today: number;
      cart_value_avg: number;
      conversion_rate: number;
    }>('/realtime/overview');

    return {
      timestamp: response.data.timestamp,
      activeUsers: response.data.active_users,
      activeSessions: response.data.active_sessions,
      ordersToday: response.data.orders_today,
      revenueToday: response.data.revenue_today,
      cartValueAvg: response.data.cart_value_avg,
      conversionRate: response.data.conversion_rate,
    };
  }

  /**
   * Get metric forecast
   */
  async getForecast(
    metric: string,
    horizonDays: number = 30,
    granularity: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): Promise<Forecast> {
    const response = await this.client.post<Forecast>('/ml/forecast', {
      metric,
      horizon_days: horizonDays,
      granularity,
    });
    return response.data;
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(metric: string, lookbackHours: number = 24): Promise<Anomaly[]> {
    const response = await this.client.get<{ anomalies: Anomaly[] }>('/ml/anomalies', {
      params: { metric, lookback_hours: lookbackHours },
    });
    return response.data.anomalies;
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    startDate: Date,
    cohortType: string = 'acquisition_month',
    metric: string = 'retention'
  ): Promise<CohortAnalysis> {
    const response = await this.client.get<CohortAnalysis>('/cohort/analysis', {
      params: {
        start_date: startDate.toISOString(),
        cohort_type: cohortType,
        metric,
      },
    });
    return response.data;
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(
    funnelName: string,
    startDate: Date,
    endDate: Date
  ): Promise<FunnelAnalysis> {
    const response = await this.client.get<FunnelAnalysis>('/funnel/analysis', {
      params: {
        funnel_name: funnelName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  }

  /**
   * Get user journey analysis
   */
  async getUserJourney(userId: string, days: number = 30): Promise<UserJourney> {
    const response = await this.client.get<UserJourney>(`/user/${userId}/journey`, {
      params: { days },
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
