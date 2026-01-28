import { ExperimentStatus, TargetingRuleOperator } from '../dto/experiment.dto';
import { FeatureFlagType } from '../dto/feature-flag.dto';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  status: ExperimentStatus;
  trafficAllocation: number;
  isExclusive: boolean;
  mutualExclusionGroupId?: string;
  primaryMetric?: string;
  secondaryMetrics?: string[];
  startedAt?: Date;
  pausedAt?: Date;
  concludedAt?: Date;
  winnerVariantId?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
  variants: Variant[];
  targetingRules: TargetingRule[];
  metrics: Metric[];
}

export interface Variant {
  id: string;
  experimentId: string;
  name: string;
  description?: string;
  weight: number;
  isControl: boolean;
  payload?: Record<string, any>;
}

export interface TargetingRule {
  id: string;
  experimentId?: string;
  flagId?: string;
  attribute: string;
  operator: TargetingRuleOperator;
  value: any;
  priority: number;
}

export interface Metric {
  id: string;
  experimentId: string;
  key: string;
  name: string;
  description?: string;
  eventName: string;
  aggregationType: string;
  minimumSampleSize: number;
  confidenceLevel: number;
  results?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  hashKey: string;
  context?: Record<string, any>;
  assignedAt: Date;
}

export interface ExperimentEvent {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  eventName: string;
  eventValue?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  enabled: boolean;
  defaultValue: any;
  percentageEnabled?: number;
  environments?: Record<string, boolean>;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
  rules: FlagRule[];
  segments: FlagSegment[];
}

export interface FlagRule {
  id: string;
  flagId: string;
  attribute: string;
  operator: TargetingRuleOperator;
  value: any;
  priority: number;
  enabled: boolean;
  returnValue: any;
}

export interface FlagSegment {
  id: string;
  flagId: string;
  segmentId: string;
  enabled: boolean;
  returnValue: any;
}

export interface UserContext {
  userId: string;
  country?: string;
  plan?: string;
  signupDate?: string;
  device?: string;
  browser?: string;
  os?: string;
  environment?: string;
  [key: string]: any;
}

export interface EvaluationResult {
  value: any;
  reason: EvaluationReason;
  matchedRuleId?: string;
  evaluatedAt: Date;
}

export enum EvaluationReason {
  FLAG_DISABLED = 'FLAG_DISABLED',
  DEFAULT_VALUE = 'DEFAULT_VALUE',
  TARGETING_MATCH = 'TARGETING_MATCH',
  SEGMENT_MATCH = 'SEGMENT_MATCH',
  PERCENTAGE_ROLLOUT = 'PERCENTAGE_ROLLOUT',
  ENVIRONMENT_MATCH = 'ENVIRONMENT_MATCH',
  USER_NOT_IN_ROLLOUT = 'USER_NOT_IN_ROLLOUT',
  ERROR = 'ERROR',
}

export interface StatisticalResult {
  mean: number;
  variance: number;
  standardDeviation: number;
  sampleSize: number;
  standardError: number;
}

export interface SignificanceResult {
  isSignificant: boolean;
  pValue: number;
  zScore: number;
  relativeLift: number;
  absoluteDifference: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface MutualExclusionGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSegment {
  id: string;
  key: string;
  name: string;
  description?: string;
  rules: TargetingRule[];
  memberCount: number;
  lastComputed?: Date;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}
