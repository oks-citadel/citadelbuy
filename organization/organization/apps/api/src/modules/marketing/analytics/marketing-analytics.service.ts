import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  IMarketingAnalyticsService,
  Funnel,
  CreateFunnelInput,
  FunnelQuery,
  FunnelAnalysis,
  CohortQuery,
  CohortAnalysis,
  AttributionQuery,
  AttributionAnalysis,
  CompareAttributionQuery,
  AttributionComparison,
  RecordSessionInput,
  Session,
  RecordEventInput,
  HeatmapQuery,
  HeatmapData,
  RecordingQuery,
  PaginatedRecordings,
  SessionRecording,
} from './interfaces/analytics.interface';

@Injectable()
export class MarketingAnalyticsService implements IMarketingAnalyticsService {
  private readonly logger = new Logger(MarketingAnalyticsService.name);

  // In-memory storage
  private funnels: Map<string, Funnel> = new Map();
  private sessions: Map<string, Session> = new Map();
  private sessionEvents: Map<string, any[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // Funnel Analysis
  async createFunnel(data: CreateFunnelInput): Promise<Funnel> {
    this.logger.log(`Creating funnel: ${data.name}`);

    const id = `funnel-${Date.now()}`;

    const funnel: Funnel = {
      id,
      name: data.name,
      organizationId: data.organizationId,
      steps: data.steps,
      conversionWindowDays: data.conversionWindowDays || 30,
      createdAt: new Date(),
    };

    this.funnels.set(id, funnel);
    return funnel;
  }

  async getFunnels(organizationId: string): Promise<Funnel[]> {
    return Array.from(this.funnels.values()).filter((f) => f.organizationId === organizationId);
  }

  async analyzeFunnel(query: FunnelQuery): Promise<FunnelAnalysis> {
    const funnel = this.funnels.get(query.funnelId);
    if (!funnel) {
      throw new NotFoundException(`Funnel ${query.funnelId} not found`);
    }

    // Mock analysis data
    const totalEntries = Math.floor(Math.random() * 10000) + 1000;
    let remaining = totalEntries;

    const steps = funnel.steps.map((step, index) => {
      const dropoff = index === 0 ? 0 : Math.random() * 0.3;
      const count = Math.floor(remaining * (1 - dropoff));
      remaining = count;

      return {
        name: step.name,
        count,
        conversionRate: (count / totalEntries) * 100,
        dropoffRate: dropoff * 100,
        averageTimeFromPrevious: index > 0 ? Math.random() * 3600 : undefined,
      };
    });

    return {
      funnelId: query.funnelId,
      totalEntries,
      steps,
      overallConversionRate: (remaining / totalEntries) * 100,
      averageTimeToConvert: Math.random() * 86400,
    };
  }

  // Cohort Analysis
  async analyzeCohort(query: CohortQuery): Promise<CohortAnalysis> {
    this.logger.log(`Analyzing cohort: ${query.cohortType} - ${query.metric}`);

    const periods = query.periods || 8;
    const cohorts: Array<{ period: string; size: number; values: (number | null)[] }> = [];

    // Generate mock cohort data
    for (let i = 0; i < 6; i++) {
      const cohortDate = new Date(query.startDate);
      cohortDate.setMonth(cohortDate.getMonth() + i);

      const size = Math.floor(Math.random() * 500) + 100;
      const values: (number | null)[] = [];

      for (let p = 0; p < periods; p++) {
        if (p <= 6 - i) {
          // Retention decay
          const baseRetention = query.metric === 'RETENTION' ? 100 : Math.random() * 1000;
          const decay = Math.pow(0.85, p);
          values.push(baseRetention * decay * (0.9 + Math.random() * 0.2));
        } else {
          values.push(null);
        }
      }

      cohorts.push({
        period: cohortDate.toISOString().slice(0, 7),
        size,
        values,
      });
    }

    // Calculate average retention
    const averageRetention: number[] = [];
    for (let p = 0; p < periods; p++) {
      const validValues = cohorts
        .map((c) => c.values[p])
        .filter((v): v is number => v !== null);
      averageRetention.push(
        validValues.length > 0
          ? validValues.reduce((a, b) => a + b, 0) / validValues.length
          : 0,
      );
    }

    return {
      cohorts,
      averageRetention,
      insights: [
        {
          type: 'improvement',
          message: 'Week 2 retention improved by 15% compared to previous month',
          cohort: cohorts[0]?.period,
          period: 2,
        },
        {
          type: 'decline',
          message: 'Week 4 drop-off is higher than average',
          period: 4,
        },
      ],
    };
  }

  // Attribution Analysis
  async analyzeAttribution(query: AttributionQuery): Promise<AttributionAnalysis> {
    this.logger.log(`Analyzing attribution: ${query.model}`);

    const channels = [
      'Organic Search',
      'Paid Search',
      'Social',
      'Email',
      'Direct',
      'Referral',
      'Display',
    ];

    const totalConversions = Math.floor(Math.random() * 5000) + 500;
    const totalRevenue = Math.floor(Math.random() * 500000) + 50000;

    const channelAttribution = channels.map((channel) => {
      const share = Math.random();
      return {
        channel,
        conversions: Math.floor(totalConversions * share * 0.3),
        revenue: Math.floor(totalRevenue * share * 0.3),
        share: share * 30,
        assistedConversions: Math.floor(Math.random() * 200),
        avgTouchpoints: 1 + Math.random() * 4,
      };
    });

    // Normalize shares
    const totalShare = channelAttribution.reduce((sum, c) => sum + c.share, 0);
    channelAttribution.forEach((c) => (c.share = (c.share / totalShare) * 100));

    return {
      model: query.model,
      channels: channelAttribution,
      totalConversions,
      totalRevenue,
      conversionPaths: [
        {
          path: ['Paid Search', 'Email', 'Direct'],
          conversions: 150,
          revenue: 15000,
          avgTimeToConvert: 86400 * 3,
        },
        {
          path: ['Organic Search', 'Direct'],
          conversions: 120,
          revenue: 12000,
          avgTimeToConvert: 86400 * 1,
        },
        {
          path: ['Social', 'Email', 'Paid Search', 'Direct'],
          conversions: 80,
          revenue: 8500,
          avgTimeToConvert: 86400 * 7,
        },
      ],
    };
  }

  async compareAttributionModels(query: CompareAttributionQuery): Promise<AttributionComparison> {
    this.logger.log(`Comparing attribution models: ${query.models.join(', ')}`);

    const models = await Promise.all(
      query.models.map(async (model) => ({
        model,
        channels: (
          await this.analyzeAttribution({
            ...query,
            model,
            startDate: query.startDate,
            endDate: query.endDate,
          })
        ).channels,
      })),
    );

    const channels = ['Organic Search', 'Paid Search', 'Social', 'Email', 'Direct'];
    const channelVariance = channels.map((channel) => {
      const shares = models.map(
        (m) => m.channels.find((c) => c.channel === channel)?.share || 0,
      );
      const variance =
        Math.max(...shares) - Math.min(...shares);

      return {
        channel,
        variance,
        recommendations:
          variance > 10
            ? [`Consider ${channel} for deeper analysis due to high model variance`]
            : [],
      };
    });

    return { models, channelVariance };
  }

  // Heatmaps/Recordings
  async recordSession(data: RecordSessionInput): Promise<Session> {
    this.logger.log(`Recording session: ${data.sessionId}`);

    const session: Session = {
      id: data.sessionId,
      userId: data.userId,
      pageUrl: data.pageUrl,
      viewport: {
        width: data.viewportWidth || 1920,
        height: data.viewportHeight || 1080,
      },
      deviceType: data.deviceType || 'desktop',
      startedAt: new Date(),
    };

    this.sessions.set(data.sessionId, session);
    this.sessionEvents.set(data.sessionId, []);
    return session;
  }

  async recordEvent(data: RecordEventInput): Promise<void> {
    const events = this.sessionEvents.get(data.sessionId) || [];
    events.push({
      type: data.eventType,
      timestamp: data.timestamp,
      x: data.x,
      y: data.y,
      scrollDepth: data.scrollDepth,
      targetSelector: data.targetSelector,
    });
    this.sessionEvents.set(data.sessionId, events);
  }

  async getHeatmap(query: HeatmapQuery): Promise<HeatmapData> {
    this.logger.log(`Getting heatmap for: ${query.pageUrl}`);

    // Generate mock heatmap data
    const points: Array<{ x: number; y: number; value: number; selector?: string }> = [];

    for (let i = 0; i < 100; i++) {
      points.push({
        x: Math.random() * 1920,
        y: Math.random() * 3000,
        value: Math.floor(Math.random() * 100),
      });
    }

    return {
      pageUrl: query.pageUrl,
      type: query.type,
      viewport: { width: 1920, height: 1080 },
      totalSessions: Math.floor(Math.random() * 1000) + 100,
      data: points,
      scrollDepthDistribution: {
        quartiles: [25, 50, 75, 90],
        averageDepth: 65,
        distribution: [
          { depth: 25, percentage: 95 },
          { depth: 50, percentage: 75 },
          { depth: 75, percentage: 50 },
          { depth: 100, percentage: 25 },
        ],
      },
    };
  }

  async getRecordings(query: RecordingQuery): Promise<PaginatedRecordings> {
    let items = Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      userId: session.userId,
      pageUrl: session.pageUrl,
      duration: Math.floor(Math.random() * 300),
      deviceType: session.deviceType,
      hasError: Math.random() > 0.9,
      startedAt: session.startedAt,
    }));

    if (query.pageUrl) {
      items = items.filter((s) => s.pageUrl === query.pageUrl);
    }
    if (query.userId) {
      items = items.filter((s) => s.userId === query.userId);
    }
    if (query.minDuration) {
      items = items.filter((s) => s.duration >= query.minDuration!);
    }
    if (query.hasError !== undefined) {
      items = items.filter((s) => s.hasError === query.hasError);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = items.length;

    items = items.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit };
  }

  async getRecording(sessionId: string): Promise<SessionRecording> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const events = this.sessionEvents.get(sessionId) || [];

    return {
      session,
      events: events.map((e) => ({
        type: e.type,
        timestamp: e.timestamp,
        data: { x: e.x, y: e.y, scrollDepth: e.scrollDepth, selector: e.targetSelector },
      })),
    };
  }
}
