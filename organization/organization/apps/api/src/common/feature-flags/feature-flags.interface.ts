/**
 * Feature Flags System - Interfaces
 *
 * Provides type-safe feature flag management for gradual rollouts,
 * A/B testing, and feature gating.
 */

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetRules?: TargetRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TargetRule {
  id: string;
  attribute: TargetAttribute;
  operator: RuleOperator;
  value: string | string[] | number;
  enabled: boolean;
}

export type TargetAttribute =
  | 'userId'
  | 'email'
  | 'role'
  | 'organizationId'
  | 'country'
  | 'vendorId'
  | 'subscriptionTier'
  | 'accountAge'
  | 'totalOrders'
  | 'custom';

export type RuleOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'in'
  | 'notIn'
  | 'greaterThan'
  | 'lessThan'
  | 'matches'; // regex

export interface FlagContext {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  country?: string;
  vendorId?: string;
  subscriptionTier?: string;
  accountAge?: number;
  totalOrders?: number;
  custom?: Record<string, unknown>;
  sessionId?: string;
}

export interface FlagEvaluation {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  reason: EvaluationReason;
  context?: FlagContext;
  timestamp: Date;
}

export type EvaluationReason =
  | 'flag_disabled'
  | 'flag_not_found'
  | 'rule_match'
  | 'percentage_rollout'
  | 'default_variant'
  | 'forced_value';

export interface FeatureFlagConfig {
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  defaultEnabled: boolean;
  enableMetrics: boolean;
}

// Common feature flag keys for type safety
export const FEATURE_FLAGS = {
  // AI Features
  AI_SHOPPING_CONCIERGE: 'ai-shopping-concierge',
  AI_STYLE_ADVISOR: 'ai-style-advisor',
  AI_VENDOR_COPILOT: 'ai-vendor-copilot',
  PREDICTIVE_REPLENISHMENT: 'predictive-replenishment',
  AI_BUNDLE_CREATOR: 'ai-bundle-creator',
  REALTIME_PERSONALIZATION: 'realtime-personalization',

  // Social Commerce
  LIVE_SHOPPING: 'live-shopping',
  COLLABORATIVE_SHOPPING: 'collaborative-shopping',
  SOCIAL_PROOF_WIDGETS: 'social-proof-widgets',
  INFLUENCER_TOOLS: 'influencer-tools',

  // Voice & AR
  VOICE_COMMERCE: 'voice-commerce',
  AR_ROOM_PLANNER: 'ar-room-planner',

  // Sustainability
  SUSTAINABILITY_TRACKING: 'sustainability-tracking',
  CARBON_FOOTPRINT: 'carbon-footprint',

  // Blockchain
  BLOCKCHAIN_AUTHENTICITY: 'blockchain-authenticity',

  // Performance
  ENHANCED_ANIMATIONS: 'enhanced-animations',
  REDUCED_MOTION_AUTO: 'reduced-motion-auto',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
