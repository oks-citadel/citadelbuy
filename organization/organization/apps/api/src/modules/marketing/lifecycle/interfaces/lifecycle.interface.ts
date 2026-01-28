export interface ILifecycleService {
  // Email Lists
  createList(data: CreateListInput): Promise<EmailList>;
  getLists(organizationId: string): Promise<EmailList[]>;
  addSubscriber(listId: string, data: AddSubscriberInput): Promise<Subscriber>;
  removeSubscriber(listId: string, email: string): Promise<void>;
  getSubscribers(listId: string, query?: SubscriberQuery): Promise<PaginatedSubscribers>;

  // Segments
  createSegment(data: CreateSegmentInput): Promise<Segment>;
  getSegments(organizationId: string): Promise<Segment[]>;
  evaluateSegment(segmentId: string): Promise<SegmentEvaluation>;

  // Behavioral Triggers
  createTrigger(data: CreateTriggerInput): Promise<BehavioralTrigger>;
  getTriggers(organizationId: string): Promise<BehavioralTrigger[]>;
  updateTrigger(id: string, data: Partial<CreateTriggerInput>): Promise<BehavioralTrigger>;
  fireTrigger(triggerId: string, userId: string, context?: Record<string, any>): Promise<void>;

  // Drip/Nurture Flows
  createFlow(data: CreateFlowInput): Promise<NurtureFlow>;
  getFlows(organizationId: string): Promise<NurtureFlow[]>;
  enrollInFlow(flowId: string, userId: string): Promise<FlowEnrollment>;
  getEnrollmentStatus(flowId: string, userId: string): Promise<FlowEnrollment | null>;

  // Lifecycle Events
  trackEvent(data: TrackEventInput): Promise<LifecycleEvent>;
  getEvents(userId: string, options?: EventQueryOptions): Promise<LifecycleEvent[]>;
  updateLifecycleStage(userId: string, stage: LifecycleStage, reason?: string): Promise<UserLifecycle>;
  getLifecycleStage(userId: string): Promise<UserLifecycle>;
  getLifecycleMetrics(organizationId: string): Promise<LifecycleMetrics>;
}

// Email List Types
export interface EmailList {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  type: 'marketing' | 'transactional' | 'newsletter';
  doubleOptIn: boolean;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListInput {
  name: string;
  description?: string;
  organizationId?: string;
  type?: 'marketing' | 'transactional' | 'newsletter';
  doubleOptIn?: boolean;
}

export interface Subscriber {
  id: string;
  listId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, any>;
  tags: string[];
  status: 'subscribed' | 'unsubscribed' | 'pending' | 'bounced' | 'complained';
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

export interface AddSubscriberInput {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, any>;
  tags?: string[];
}

export interface SubscriberQuery {
  status?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface PaginatedSubscribers {
  items: Subscriber[];
  total: number;
  page: number;
  limit: number;
}

// Segment Types
export interface Segment {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  conditions: SegmentCondition[];
  conditionLogic: 'AND' | 'OR';
  memberCount: number;
  lastEvaluated?: Date;
  createdAt: Date;
}

export interface SegmentCondition {
  field: string;
  operator: SegmentOperator;
  value: any;
}

export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists';

export interface CreateSegmentInput {
  name: string;
  description?: string;
  organizationId?: string;
  conditions: SegmentCondition[];
  conditionLogic?: 'AND' | 'OR';
}

export interface SegmentEvaluation {
  segmentId: string;
  memberCount: number;
  sampleMembers: string[];
  evaluatedAt: Date;
}

// Behavioral Trigger Types
export interface BehavioralTrigger {
  id: string;
  name: string;
  organizationId?: string;
  triggerType: TriggerType;
  conditions?: Record<string, any>;
  actions: TriggerAction[];
  isActive: boolean;
  timesTriggered: number;
  createdAt: Date;
}

export type TriggerType =
  | 'PAGE_VIEW'
  | 'PRODUCT_VIEW'
  | 'ADD_TO_CART'
  | 'ABANDON_CART'
  | 'PURCHASE'
  | 'SIGNUP'
  | 'INACTIVITY'
  | 'CUSTOM_EVENT';

export interface TriggerAction {
  type: TriggerActionType;
  config: Record<string, any>;
  delayMinutes?: number;
}

export type TriggerActionType =
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_PUSH'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'ADD_TO_LIST'
  | 'WEBHOOK';

export interface CreateTriggerInput {
  name: string;
  organizationId?: string;
  triggerType: TriggerType;
  conditions?: Record<string, any>;
  actions: TriggerAction[];
  isActive?: boolean;
}

// Nurture Flow Types
export interface NurtureFlow {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  entryTrigger: TriggerType;
  entryConditions?: Record<string, any>;
  steps: FlowStep[];
  exitConditions?: Record<string, any>;
  isActive: boolean;
  enrolledCount: number;
  completedCount: number;
  createdAt: Date;
}

export interface FlowStep {
  id: string;
  name: string;
  actionType: TriggerActionType;
  config: Record<string, any>;
  delayMinutes: number;
  condition?: Record<string, any>;
  order: number;
}

export interface CreateFlowInput {
  name: string;
  description?: string;
  organizationId?: string;
  entryTrigger: TriggerType;
  entryConditions?: Record<string, any>;
  steps: Omit<FlowStep, 'id' | 'order'>[];
  exitConditions?: Record<string, any>;
}

export interface FlowEnrollment {
  id: string;
  flowId: string;
  userId: string;
  currentStep: number;
  status: 'active' | 'completed' | 'exited' | 'paused';
  enrolledAt: Date;
  completedAt?: Date;
  exitedAt?: Date;
  exitReason?: string;
}

// Lifecycle Event Types
export interface LifecycleEvent {
  id: string;
  userId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface TrackEventInput {
  event: string;
  userId: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface EventQueryOptions {
  events?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export type LifecycleStage =
  | 'ANONYMOUS'
  | 'LEAD'
  | 'PROSPECT'
  | 'CUSTOMER'
  | 'REPEAT_CUSTOMER'
  | 'CHAMPION'
  | 'AT_RISK'
  | 'CHURNED';

export interface UserLifecycle {
  userId: string;
  stage: LifecycleStage;
  previousStage?: LifecycleStage;
  changedAt: Date;
  reason?: string;
  metrics: UserLifecycleMetrics;
}

export interface UserLifecycleMetrics {
  totalOrders: number;
  totalRevenue: number;
  daysSinceLastOrder: number;
  averageOrderValue: number;
  engagementScore: number;
}

export interface LifecycleMetrics {
  stageDistribution: Record<LifecycleStage, number>;
  transitions: LifecycleTransition[];
  churnRate: number;
  retentionRate: number;
  averageLifetimeValue: number;
}

export interface LifecycleTransition {
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  count: number;
  percentage: number;
}
