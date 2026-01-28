import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as crypto from 'crypto';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  type: string;
  status: string;
  variants: ExperimentVariant[];
  primaryMetric: string;
  secondaryMetrics: string[];
  targetSampleSize?: number;
  minDetectableEffect?: number;
  targeting?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  allocation: number;
  config?: Record<string, any>;
  isControl: boolean;
  participants: number;
  conversions: number;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description?: string;
  organizationId?: string;
  isEnabled: boolean;
  defaultValue: boolean;
  rolloutPercentage: number;
  targetingRules: Array<{ conditions: Record<string, any>; value: boolean }>;
  createdAt: Date;
}

export interface ExperimentAnalysis {
  experimentId: string;
  status: string;
  variants: VariantAnalysis[];
  winner?: string;
  statisticalSignificance: number;
  sampleSizeReached: boolean;
  estimatedTimeRemaining?: number;
}

export interface VariantAnalysis {
  id: string;
  name: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  improvement?: number;
  confidenceInterval: [number, number];
  isSignificant: boolean;
}

@Injectable()
export class ExperimentsService {
  private readonly logger = new Logger(ExperimentsService.name);

  private experiments: Map<string, Experiment> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private assignments: Map<string, Map<string, string>> = new Map(); // userId -> experimentId -> variantId

  constructor(private readonly prisma: PrismaService) {}

  // Experiments
  async createExperiment(data: {
    name: string;
    description?: string;
    organizationId?: string;
    type: string;
    variants: Array<{ name: string; allocation: number; config?: Record<string, any>; isControl?: boolean }>;
    primaryMetric: string;
    secondaryMetrics?: string[];
    targetSampleSize?: number;
    minDetectableEffect?: number;
    targeting?: Record<string, any>;
  }): Promise<Experiment> {
    const id = `exp-${Date.now()}`;

    const experiment: Experiment = {
      id,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
      type: data.type,
      status: 'DRAFT',
      variants: data.variants.map((v, i) => ({
        id: `var-${Date.now()}-${i}`,
        name: v.name,
        allocation: v.allocation,
        config: v.config,
        isControl: v.isControl || i === 0,
        participants: 0,
        conversions: 0,
      })),
      primaryMetric: data.primaryMetric,
      secondaryMetrics: data.secondaryMetrics || [],
      targetSampleSize: data.targetSampleSize,
      minDetectableEffect: data.minDetectableEffect,
      targeting: data.targeting,
      createdAt: new Date(),
    };

    this.experiments.set(id, experiment);
    return experiment;
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    return this.experiments.get(id) || null;
  }

  async listExperiments(query: {
    organizationId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Experiment[]; total: number }> {
    let items = Array.from(this.experiments.values());

    if (query.organizationId) {
      items = items.filter((e) => e.organizationId === query.organizationId);
    }
    if (query.status) {
      items = items.filter((e) => e.status === query.status);
    }
    if (query.type) {
      items = items.filter((e) => e.type === query.type);
    }

    const total = items.length;
    const page = query.page || 1;
    const limit = query.limit || 20;
    items = items.slice((page - 1) * limit, page * limit);

    return { items, total };
  }

  async updateExperiment(id: string, data: Partial<Experiment>): Promise<Experiment> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new NotFoundException(`Experiment ${id} not found`);
    }

    const updated = { ...experiment, ...data };
    if (data.status === 'RUNNING' && !experiment.startedAt) {
      updated.startedAt = new Date();
    }
    if (data.status === 'COMPLETED' && !experiment.completedAt) {
      updated.completedAt = new Date();
    }

    this.experiments.set(id, updated);
    return updated;
  }

  async startExperiment(id: string): Promise<Experiment> {
    return this.updateExperiment(id, { status: 'RUNNING' });
  }

  async stopExperiment(id: string): Promise<Experiment> {
    return this.updateExperiment(id, { status: 'COMPLETED' });
  }

  // Feature Flags
  async createFeatureFlag(data: {
    key: string;
    description?: string;
    organizationId?: string;
    defaultValue?: boolean;
    rolloutPercentage?: number;
    targetingRules?: Array<{ conditions: Record<string, any>; value: boolean }>;
  }): Promise<FeatureFlag> {
    const id = `flag-${Date.now()}`;

    const flag: FeatureFlag = {
      id,
      key: data.key,
      description: data.description,
      organizationId: data.organizationId,
      isEnabled: true,
      defaultValue: data.defaultValue || false,
      rolloutPercentage: data.rolloutPercentage || 0,
      targetingRules: data.targetingRules || [],
      createdAt: new Date(),
    };

    this.featureFlags.set(data.key, flag);
    return flag;
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | null> {
    return this.featureFlags.get(key) || null;
  }

  async listFeatureFlags(organizationId: string): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values()).filter((f) => f.organizationId === organizationId);
  }

  async updateFeatureFlag(key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const flag = this.featureFlags.get(key);
    if (!flag) {
      throw new NotFoundException(`Feature flag ${key} not found`);
    }

    const updated = { ...flag, ...data };
    this.featureFlags.set(key, updated);
    return updated;
  }

  async deleteFeatureFlag(key: string): Promise<void> {
    this.featureFlags.delete(key);
  }

  // Assignment
  async getAssignment(
    userId: string,
    key: string,
    attributes?: Record<string, any>,
  ): Promise<{ variant?: string; value?: boolean; assigned: boolean }> {
    // Check if it's a feature flag
    const flag = this.featureFlags.get(key);
    if (flag) {
      if (!flag.isEnabled) {
        return { value: flag.defaultValue, assigned: false };
      }

      // Check targeting rules
      for (const rule of flag.targetingRules) {
        if (this.matchesConditions(attributes || {}, rule.conditions)) {
          return { value: rule.value, assigned: true };
        }
      }

      // Percentage rollout
      const hash = this.hashUser(userId, key);
      const inRollout = hash < flag.rolloutPercentage;
      return { value: inRollout || flag.defaultValue, assigned: true };
    }

    // Check experiments
    const experiment = Array.from(this.experiments.values()).find((e) => e.id === key || e.name === key);
    if (experiment && experiment.status === 'RUNNING') {
      // Check existing assignment
      const userAssignments = this.assignments.get(userId);
      if (userAssignments?.has(experiment.id)) {
        const variantId = userAssignments.get(experiment.id)!;
        return { variant: variantId, assigned: true };
      }

      // Assign to variant based on allocation
      const variant = this.assignVariant(userId, experiment);
      if (variant) {
        if (!this.assignments.has(userId)) {
          this.assignments.set(userId, new Map());
        }
        this.assignments.get(userId)!.set(experiment.id, variant.id);
        variant.participants++;
        return { variant: variant.id, assigned: true };
      }
    }

    return { assigned: false };
  }

  private hashUser(userId: string, key: string): number {
    const hash = crypto.createHash('md5').update(`${userId}:${key}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 100;
  }

  private matchesConditions(attributes: Record<string, any>, conditions: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (attributes[key] !== value) return false;
    }
    return true;
  }

  private assignVariant(userId: string, experiment: Experiment): ExperimentVariant | null {
    const hash = this.hashUser(userId, experiment.id);
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (hash < cumulative) {
        return variant;
      }
    }

    return null;
  }

  // Conversion Tracking
  async trackConversion(data: {
    experimentId: string;
    userId: string;
    metric: string;
    value?: number;
    variantId?: string;
  }): Promise<void> {
    const experiment = this.experiments.get(data.experimentId);
    if (!experiment) return;

    let variantId = data.variantId;
    if (!variantId) {
      const userAssignments = this.assignments.get(data.userId);
      variantId = userAssignments?.get(data.experimentId);
    }

    if (variantId) {
      const variant = experiment.variants.find((v) => v.id === variantId);
      if (variant && data.metric === experiment.primaryMetric) {
        variant.conversions++;
      }
    }
  }

  // Statistical Analysis
  async analyzeExperiment(experimentId: string, confidenceLevel: number = 95): Promise<ExperimentAnalysis> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }

    const control = experiment.variants.find((v) => v.isControl);
    const controlRate = control && control.participants > 0 ? control.conversions / control.participants : 0;

    const variants: VariantAnalysis[] = experiment.variants.map((v) => {
      const rate = v.participants > 0 ? v.conversions / v.participants : 0;
      const improvement = controlRate > 0 ? ((rate - controlRate) / controlRate) * 100 : 0;

      // Simplified confidence interval calculation
      const se = v.participants > 0 ? Math.sqrt((rate * (1 - rate)) / v.participants) : 0;
      const z = confidenceLevel === 95 ? 1.96 : 2.576;
      const margin = se * z;

      return {
        id: v.id,
        name: v.name,
        participants: v.participants,
        conversions: v.conversions,
        conversionRate: rate * 100,
        improvement: v.isControl ? undefined : improvement,
        confidenceInterval: [(rate - margin) * 100, (rate + margin) * 100] as [number, number],
        isSignificant: Math.abs(improvement) > 5 && v.participants > 100,
      };
    });

    const significantWinner = variants.find((v) => !v.isSignificant === false && v.improvement && v.improvement > 0);

    return {
      experimentId,
      status: experiment.status,
      variants,
      winner: significantWinner?.id,
      statisticalSignificance: confidenceLevel,
      sampleSizeReached:
        experiment.targetSampleSize !== undefined
          ? experiment.variants.every((v) => v.participants >= (experiment.targetSampleSize || 0))
          : true,
      estimatedTimeRemaining: experiment.status === 'RUNNING' ? Math.floor(Math.random() * 7) : undefined,
    };
  }
}
