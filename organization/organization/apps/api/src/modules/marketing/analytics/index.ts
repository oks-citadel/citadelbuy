export * from './marketing-analytics.module';
export * from './marketing-analytics.controller';
export * from './marketing-analytics.service';
export * from './dto';
// Note: interfaces are exported separately to avoid duplicate export conflicts with dto enums
export type {
  IMarketingAnalyticsService,
  Funnel,
  FunnelStep,
  CreateFunnelInput,
  FunnelQuery,
  FunnelAnalysis,
  FunnelStepAnalysis,
  FunnelBreakdown,
  CohortQuery,
  CohortAnalysis,
  Cohort,
  CohortInsight,
  AttributionQuery,
  AttributionAnalysis,
  ChannelAttribution,
  ConversionPath,
  CompareAttributionQuery,
  AttributionComparison,
  AttributionModelResult,
  ChannelVariance,
  RecordSessionInput,
  RecordEventInput,
  Session,
  HeatmapQuery,
  HeatmapData,
  HeatmapPoint,
  ScrollDepthData,
  RecordingQuery,
  PaginatedRecordings,
  SessionSummary,
  SessionRecording,
  RecordedEvent,
} from './interfaces/analytics.interface';
