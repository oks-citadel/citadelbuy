/**
 * AI Orchestrator Interfaces
 *
 * Provides type definitions for AI workflow orchestration,
 * enabling complex multi-service AI pipelines with conditional
 * branching, parallel execution, and error handling.
 */

export interface AIWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: AIWorkflowStep[];
  triggers?: WorkflowTrigger[];
  errorHandling?: ErrorHandlingConfig;
  timeout?: number; // milliseconds
  metadata?: Record<string, unknown>;
}

export interface AIWorkflowStep {
  id: string;
  name: string;
  service: AIServiceType;
  action: string;
  input?: StepInput;
  conditions?: StepCondition[];
  onSuccess?: string; // next step id
  onFailure?: string; // fallback step id
  parallel?: string[]; // step ids to execute in parallel
  retry?: RetryConfig;
  timeout?: number;
  cache?: CacheConfig;
}

export type AIServiceType =
  | 'personalization'
  | 'chatbot'
  | 'recommendations'
  | 'contentGeneration'
  | 'demandForecasting'
  | 'fraudDetection'
  | 'pricingEngine'
  | 'smartSearch'
  | 'visualSearch'
  | 'arTryon'
  | 'cartAbandonment'
  | 'conversational'
  | 'subscriptionIntelligence'
  | 'revenueOptimization';

export interface StepInput {
  static?: Record<string, unknown>;
  fromContext?: string; // reference to context value
  fromStep?: string; // reference to previous step output
  transform?: InputTransform;
}

export interface InputTransform {
  type: 'map' | 'filter' | 'reduce' | 'pick' | 'merge';
  config: Record<string, unknown>;
}

export interface StepCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'exists'
  | 'notExists'
  | 'in'
  | 'notIn';

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  keyPrefix?: string;
  invalidateOn?: string[];
}

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export type TriggerType =
  | 'event'
  | 'schedule'
  | 'api'
  | 'webhook'
  | 'featureFlag';

export interface ErrorHandlingConfig {
  defaultAction: 'fail' | 'skip' | 'retry' | 'fallback';
  fallbackWorkflow?: string;
  notifyOnError?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  userId?: string;
  sessionId?: string;
  organizationId?: string;
  startedAt: Date;
  input: Record<string, unknown>;
  stepResults: Map<string, StepResult>;
  variables: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: StepStatus;
  output?: unknown;
  error?: StepError;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  attempts?: number;
  cached?: boolean;
}

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface StepError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface WorkflowResult {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus;
  output?: unknown;
  stepResults: StepResult[];
  startedAt: Date;
  completedAt: Date;
  duration: number;
  error?: StepError;
}

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timedOut';

// Pre-defined workflow templates
export const WORKFLOW_TEMPLATES = {
  SHOPPING_ASSISTANT: 'shopping-assistant',
  CART_RECOVERY: 'cart-recovery',
  PRODUCT_DISCOVERY: 'product-discovery',
  PERSONALIZED_FEED: 'personalized-feed',
  PRICE_OPTIMIZATION: 'price-optimization',
  FRAUD_CHECK: 'fraud-check',
  CONTENT_PIPELINE: 'content-pipeline',
  DEMAND_FORECAST: 'demand-forecast',
} as const;

export type WorkflowTemplate = (typeof WORKFLOW_TEMPLATES)[keyof typeof WORKFLOW_TEMPLATES];

// Workflow execution options
export interface ExecutionOptions {
  dryRun?: boolean;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  async?: boolean;
  webhookUrl?: string;
  featureFlagContext?: Record<string, unknown>;
}
