/**
 * A/B Testing Framework
 * Client-side experiment management with server-side integration
 */

import { trackEvent } from './google-analytics';
import { fbTrackCustom } from './facebook-pixel';

const EXPERIMENTS_STORAGE_KEY = 'broxiva_experiments';
const EXPERIMENT_EXPOSURE_KEY = 'broxiva_experiment_exposures';

export interface Experiment {
  id: string;
  name: string;
  variants: Variant[];
  trafficAllocation: number; // 0-100, percentage of users in experiment
  startDate?: string;
  endDate?: string;
  targetingRules?: TargetingRule[];
  status: 'draft' | 'running' | 'paused' | 'completed';
}

export interface Variant {
  id: string;
  name: string;
  weight: number; // Percentage weight (all variants should sum to 100)
  isControl?: boolean;
}

export interface TargetingRule {
  type: 'url' | 'userAgent' | 'cookie' | 'localStorage' | 'custom';
  operator: 'equals' | 'contains' | 'regex' | 'exists';
  key?: string;
  value?: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: number;
}

export interface ExperimentExposure {
  experimentId: string;
  variantId: string;
  exposedAt: number;
  context?: Record<string, unknown>;
}

// Get stored experiment assignments
function getAssignments(): Record<string, ExperimentAssignment> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(EXPERIMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save experiment assignments
function saveAssignments(assignments: Record<string, ExperimentAssignment>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(assignments));
}

// Get stored exposures
function getExposures(): ExperimentExposure[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(EXPERIMENT_EXPOSURE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save exposure
function saveExposure(exposure: ExperimentExposure): void {
  if (typeof window === 'undefined') return;

  const exposures = getExposures();
  exposures.push(exposure);

  // Keep only last 100 exposures
  const trimmed = exposures.slice(-100);
  localStorage.setItem(EXPERIMENT_EXPOSURE_KEY, JSON.stringify(trimmed));
}

// Generate deterministic hash for consistent bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get user identifier for bucketing
function getUserId(): string {
  if (typeof window === 'undefined') return 'server';

  let userId = localStorage.getItem('broxiva_experiment_user_id');
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('broxiva_experiment_user_id', userId);
  }
  return userId;
}

// Check if user qualifies for experiment based on targeting rules
function checkTargetingRules(rules?: TargetingRule[]): boolean {
  if (!rules || rules.length === 0) return true;
  if (typeof window === 'undefined') return false;

  return rules.every((rule) => {
    switch (rule.type) {
      case 'url':
        return matchRule(window.location.href, rule);
      case 'userAgent':
        return matchRule(navigator.userAgent, rule);
      case 'cookie':
        const cookieValue = getCookie(rule.key || '');
        return matchRule(cookieValue || '', rule);
      case 'localStorage':
        const localValue = localStorage.getItem(rule.key || '');
        return matchRule(localValue || '', rule);
      case 'custom':
        return true; // Custom rules handled separately
      default:
        return true;
    }
  });
}

function matchRule(value: string, rule: TargetingRule): boolean {
  switch (rule.operator) {
    case 'equals':
      return value === rule.value;
    case 'contains':
      return value.includes(rule.value || '');
    case 'regex':
      return new RegExp(rule.value || '').test(value);
    case 'exists':
      return value !== '';
    default:
      return true;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Assign user to experiment variant
export function assignVariant(experiment: Experiment): Variant | null {
  const userId = getUserId();
  const assignments = getAssignments();

  // Check for existing assignment
  if (assignments[experiment.id]) {
    const existingVariant = experiment.variants.find(
      (v) => v.id === assignments[experiment.id].variantId
    );
    if (existingVariant) return existingVariant;
  }

  // Check if experiment is running
  if (experiment.status !== 'running') return null;

  // Check date range
  const now = new Date();
  if (experiment.startDate && new Date(experiment.startDate) > now) return null;
  if (experiment.endDate && new Date(experiment.endDate) < now) return null;

  // Check targeting rules
  if (!checkTargetingRules(experiment.targetingRules)) return null;

  // Check traffic allocation
  const trafficHash = hashString(`${userId}_${experiment.id}_traffic`) % 100;
  if (trafficHash >= experiment.trafficAllocation) return null;

  // Assign variant based on weights
  const variantHash = hashString(`${userId}_${experiment.id}_variant`) % 100;
  let cumulative = 0;
  let selectedVariant: Variant | null = null;

  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (variantHash < cumulative) {
      selectedVariant = variant;
      break;
    }
  }

  // Fallback to first variant
  if (!selectedVariant) {
    selectedVariant = experiment.variants[0];
  }

  // Store assignment
  assignments[experiment.id] = {
    experimentId: experiment.id,
    variantId: selectedVariant.id,
    assignedAt: Date.now(),
  };
  saveAssignments(assignments);

  return selectedVariant;
}

// Track experiment exposure
export function trackExposure(
  experiment: Experiment,
  variant: Variant,
  context?: Record<string, unknown>
): void {
  // Save exposure locally
  saveExposure({
    experimentId: experiment.id,
    variantId: variant.id,
    exposedAt: Date.now(),
    context,
  });

  // Track in GA4
  trackEvent('experiment_exposure', {
    experiment_id: experiment.id,
    experiment_name: experiment.name,
    variant_id: variant.id,
    variant_name: variant.name,
    is_control: variant.isControl ?? false,
    ...context,
  });

  // Track in Facebook
  fbTrackCustom('ExperimentExposure', {
    experiment_id: experiment.id,
    variant_id: variant.id,
  });
}

// Track experiment conversion
export function trackConversion(
  experimentId: string,
  conversionType: string,
  value?: number,
  metadata?: Record<string, unknown>
): void {
  const assignments = getAssignments();
  const assignment = assignments[experimentId];

  if (!assignment) return;

  // Track in GA4
  trackEvent('experiment_conversion', {
    experiment_id: experimentId,
    variant_id: assignment.variantId,
    conversion_type: conversionType,
    conversion_value: value,
    ...metadata,
  });

  // Track in Facebook
  fbTrackCustom('ExperimentConversion', {
    experiment_id: experimentId,
    variant_id: assignment.variantId,
    conversion_type: conversionType,
    value,
  });
}

// Get all current assignments
export function getAllAssignments(): Record<string, ExperimentAssignment> {
  return getAssignments();
}

// Get assignment for specific experiment
export function getAssignment(experimentId: string): ExperimentAssignment | null {
  const assignments = getAssignments();
  return assignments[experimentId] || null;
}

// Clear all experiment data
export function clearExperimentData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EXPERIMENTS_STORAGE_KEY);
  localStorage.removeItem(EXPERIMENT_EXPOSURE_KEY);
}

// Force specific variant (for testing/preview)
export function forceVariant(experimentId: string, variantId: string): void {
  const assignments = getAssignments();
  assignments[experimentId] = {
    experimentId,
    variantId,
    assignedAt: Date.now(),
  };
  saveAssignments(assignments);
}

// Feature flag helper (simple on/off experiments)
export function isFeatureEnabled(
  featureId: string,
  rolloutPercentage: number = 50
): boolean {
  const experiment: Experiment = {
    id: `feature_${featureId}`,
    name: featureId,
    variants: [
      { id: 'control', name: 'Off', weight: 100 - rolloutPercentage, isControl: true },
      { id: 'treatment', name: 'On', weight: rolloutPercentage },
    ],
    trafficAllocation: 100,
    status: 'running',
  };

  const variant = assignVariant(experiment);
  return variant?.id === 'treatment';
}

// Multivariate test helper
export function getVariation<T>(
  experimentId: string,
  variations: Record<string, T>,
  defaultValue: T
): T {
  const assignment = getAssignment(experimentId);
  if (!assignment) return defaultValue;

  return variations[assignment.variantId] ?? defaultValue;
}

// Create simple A/B experiment
export function createABExperiment(
  id: string,
  name: string,
  trafficAllocation: number = 100
): Experiment {
  return {
    id,
    name,
    variants: [
      { id: 'control', name: 'Control', weight: 50, isControl: true },
      { id: 'treatment', name: 'Treatment', weight: 50 },
    ],
    trafficAllocation,
    status: 'running',
  };
}

// Export experiment data for analysis
export function exportExperimentData(): {
  userId: string;
  assignments: Record<string, ExperimentAssignment>;
  exposures: ExperimentExposure[];
} {
  return {
    userId: getUserId(),
    assignments: getAssignments(),
    exposures: getExposures(),
  };
}
