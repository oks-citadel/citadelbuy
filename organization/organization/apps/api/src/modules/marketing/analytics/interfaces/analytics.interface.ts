export interface IMarketingAnalyticsService {
  // Funnel Analysis
  createFunnel(data: CreateFunnelInput): Promise<Funnel>;
  getFunnels(organizationId: string): Promise<Funnel[]>;
  analyzeFunnel(query: FunnelQuery): Promise<FunnelAnalysis>;

  // Cohort Analysis
  analyzeCohort(query: CohortQuery): Promise<CohortAnalysis>;

  // Attribution
  analyzeAttribution(query: AttributionQuery): Promise<AttributionAnalysis>;
  compareAttributionModels(query: CompareAttributionQuery): Promise<AttributionComparison>;

  // Heatmaps/Recordings
  recordSession(data: RecordSessionInput): Promise<Session>;
  recordEvent(data: RecordEventInput): Promise<void>;
  getHeatmap(query: HeatmapQuery): Promise<HeatmapData>;
  getRecordings(query: RecordingQuery): Promise<PaginatedRecordings>;
  getRecording(sessionId: string): Promise<SessionRecording>;
}

// Funnel Types
export interface Funnel {
  id: string;
  name: string;
  organizationId?: string;
  steps: FunnelStep[];
  conversionWindowDays: number;
  createdAt: Date;
}

export interface FunnelStep {
  name: string;
  event: string;
  conditions?: Record<string, any>;
}

export interface CreateFunnelInput {
  name: string;
  organizationId?: string;
  steps: FunnelStep[];
  conversionWindowDays?: number;
}

export interface FunnelQuery {
  funnelId: string;
  startDate?: Date;
  endDate?: Date;
  segmentId?: string;
  groupBy?: string;
}

export interface FunnelAnalysis {
  funnelId: string;
  totalEntries: number;
  steps: FunnelStepAnalysis[];
  overallConversionRate: number;
  averageTimeToConvert: number;
  breakdown?: FunnelBreakdown[];
}

export interface FunnelStepAnalysis {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeFromPrevious?: number;
}

export interface FunnelBreakdown {
  dimension: string;
  value: string;
  steps: FunnelStepAnalysis[];
}

// Cohort Types
export type CohortType = 'FIRST_PURCHASE' | 'SIGNUP' | 'FIRST_VISIT' | 'CUSTOM_EVENT';
export type CohortMetric = 'RETENTION' | 'REVENUE' | 'ORDERS' | 'SESSIONS' | 'EVENTS';
export type CohortGranularity = 'DAY' | 'WEEK' | 'MONTH';

export interface CohortQuery {
  organizationId?: string;
  cohortType: CohortType;
  metric: CohortMetric;
  granularity?: CohortGranularity;
  startDate: Date;
  endDate: Date;
  periods?: number;
}

export interface CohortAnalysis {
  cohorts: Cohort[];
  averageRetention: number[];
  insights: CohortInsight[];
}

export interface Cohort {
  period: string;
  size: number;
  values: (number | null)[];
}

export interface CohortInsight {
  type: 'improvement' | 'decline' | 'anomaly';
  message: string;
  cohort?: string;
  period?: number;
}

// Attribution Types
export type AttributionModel =
  | 'FIRST_TOUCH'
  | 'LAST_TOUCH'
  | 'LINEAR'
  | 'TIME_DECAY'
  | 'POSITION_BASED'
  | 'DATA_DRIVEN';

export interface AttributionQuery {
  organizationId?: string;
  model: AttributionModel;
  startDate: Date;
  endDate: Date;
  lookbackDays?: number;
  conversionEvent?: string;
  channelGrouping?: string;
}

export interface AttributionAnalysis {
  model: AttributionModel;
  channels: ChannelAttribution[];
  totalConversions: number;
  totalRevenue: number;
  conversionPaths: ConversionPath[];
}

export interface ChannelAttribution {
  channel: string;
  conversions: number;
  revenue: number;
  share: number;
  assistedConversions?: number;
  avgTouchpoints?: number;
}

export interface ConversionPath {
  path: string[];
  conversions: number;
  revenue: number;
  avgTimeToConvert: number;
}

export interface CompareAttributionQuery {
  organizationId?: string;
  models: AttributionModel[];
  startDate: Date;
  endDate: Date;
}

export interface AttributionComparison {
  models: AttributionModelResult[];
  channelVariance: ChannelVariance[];
}

export interface AttributionModelResult {
  model: AttributionModel;
  channels: ChannelAttribution[];
}

export interface ChannelVariance {
  channel: string;
  variance: number;
  recommendations: string[];
}

// Heatmap/Recording Types
export type HeatmapType = 'CLICK' | 'SCROLL' | 'MOVE' | 'ATTENTION';

export interface RecordSessionInput {
  sessionId: string;
  userId: string;
  pageUrl: string;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceType?: string;
}

export interface RecordEventInput {
  sessionId: string;
  eventType: 'click' | 'scroll' | 'move' | 'input' | 'resize';
  timestamp: number;
  x?: number;
  y?: number;
  scrollDepth?: number;
  targetSelector?: string;
}

export interface Session {
  id: string;
  userId: string;
  pageUrl: string;
  viewport: { width: number; height: number };
  deviceType: string;
  startedAt: Date;
  duration?: number;
}

export interface HeatmapQuery {
  organizationId?: string;
  pageUrl: string;
  type: HeatmapType;
  startDate?: Date;
  endDate?: Date;
  deviceType?: string;
}

export interface HeatmapData {
  pageUrl: string;
  type: HeatmapType;
  viewport: { width: number; height: number };
  totalSessions: number;
  data: HeatmapPoint[];
  scrollDepthDistribution?: ScrollDepthData;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  selector?: string;
}

export interface ScrollDepthData {
  quartiles: number[];
  averageDepth: number;
  distribution: Array<{ depth: number; percentage: number }>;
}

export interface RecordingQuery {
  organizationId?: string;
  pageUrl?: string;
  userId?: string;
  minDuration?: number;
  hasError?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedRecordings {
  items: SessionSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface SessionSummary {
  id: string;
  userId: string;
  pageUrl: string;
  duration: number;
  deviceType: string;
  hasError: boolean;
  startedAt: Date;
}

export interface SessionRecording {
  session: Session;
  events: RecordedEvent[];
}

export interface RecordedEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}
