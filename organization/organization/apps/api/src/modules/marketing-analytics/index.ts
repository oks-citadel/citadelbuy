// Main module
export { MarketingAnalyticsModule } from './marketing-analytics.module';

// Constants
export { MarketingEventType, EventCategory, EVENT_CATEGORY_MAP, EVENT_SCHEMAS, DEFAULT_SAMPLING_RATES } from './constants/event-types';

// Events
export { EventsModule } from './events/events.module';
export { EventsService, MARKETING_ANALYTICS_QUEUE, AnalyticsJobType } from './events/events.service';
export { EventsController } from './events/events.controller';
export {
  IngestEventDto,
  BatchIngestEventsDto,
  ValidateEventDto,
  EventQueryDto,
  BatchIngestResultDto,
  IngestResultDto,
  EventSchemaResponseDto,
} from './events/dto/event.dto';

// Funnels
export { FunnelsModule } from './funnels/funnels.module';
export { FunnelsService } from './funnels/funnels.service';
export { FunnelsController } from './funnels/funnels.controller';
export {
  CreateFunnelDto,
  UpdateFunnelDto,
  FunnelQueryDto,
  FunnelResponseDto,
  FunnelAnalysisResultDto,
  FunnelStepResultDto,
} from './funnels/dto/funnel.dto';

// Cohorts
export { CohortsModule } from './cohorts/cohorts.module';
export { CohortsService } from './cohorts/cohorts.service';
export { CohortsController } from './cohorts/cohorts.controller';
export {
  CreateCohortDto,
  CohortQueryDto,
  RetentionQueryDto,
  LtvQueryDto,
  ChurnQueryDto,
  CohortResponseDto,
  RetentionAnalysisDto,
  LtvAnalysisDto,
  ChurnAnalysisDto,
  CohortType,
  RetentionMetric,
} from './cohorts/dto/cohort.dto';

// Attribution
export { AttributionModule } from './attribution/attribution.module';
export { AttributionService } from './attribution/attribution.service';
export { AttributionController } from './attribution/attribution.controller';
export {
  AttributionQueryDto,
  JourneyQueryDto,
  TouchpointQueryDto,
  AttributionModel,
  AttributionModelDto,
  AttributionReportDto,
  JourneyMappingDto,
  CustomerJourneyDto,
  TouchpointAnalysisDto,
} from './attribution/dto/attribution.dto';

// Sessions
export { SessionsModule } from './sessions/sessions.module';
export { SessionsService } from './sessions/sessions.service';
export { SessionsController } from './sessions/sessions.controller';
export {
  SessionQueryDto,
  SessionDetailDto,
  SessionMetricsDto,
  SessionsListResponseDto,
  SessionEventsResponseDto,
} from './sessions/dto/session.dto';

// Behavior
export { BehaviorModule } from './behavior/behavior.module';
export { BehaviorService } from './behavior/behavior.service';
export { BehaviorController } from './behavior/behavior.controller';
export {
  BehaviorQueryDto,
  HeatmapDataDto,
  ClickmapDataDto,
  ScrollmapDataDto,
  RecordingsQueryDto,
  RecordingsListDto,
  BehaviorSummaryDto,
} from './behavior/dto/behavior.dto';

// Realtime
export { RealtimeModule } from './realtime/realtime.module';
export { RealtimeService } from './realtime/realtime.service';
export { RealtimeGateway } from './realtime/realtime.gateway';
export { RealtimeController } from './realtime/realtime.controller';
export {
  RealtimeUsersQueryDto,
  RealtimeEventsQueryDto,
  RealtimeUsersDto,
  RealtimeEventsDto,
  RealtimeMetricsDto,
  WsMessageType,
  WsMessageDto,
} from './realtime/dto/realtime.dto';
