export * from './lifecycle.module';
export * from './lifecycle.controller';
export * from './lifecycle.service';
export * from './dto';
// Note: interfaces are exported separately to avoid duplicate export conflicts with dto enums
export type {
  ILifecycleService,
  EmailList,
  CreateListInput,
  Subscriber,
  AddSubscriberInput,
  SubscriberQuery,
  PaginatedSubscribers,
  Segment,
  SegmentCondition,
  CreateSegmentInput,
  SegmentEvaluation,
  BehavioralTrigger,
  TriggerAction,
  CreateTriggerInput,
  NurtureFlow,
  FlowStep,
  CreateFlowInput,
  FlowEnrollment,
  LifecycleEvent,
  TrackEventInput,
  EventQueryOptions,
  UserLifecycle,
  UserLifecycleMetrics,
  LifecycleMetrics,
  LifecycleTransition,
} from './interfaces/lifecycle.interface';
