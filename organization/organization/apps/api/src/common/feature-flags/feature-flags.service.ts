/**
 * Feature Flags Service
 *
 * Handles feature flag evaluation with support for:
 * - Percentage-based rollouts
 * - User targeting rules
 * - A/B test variants
 * - Caching for performance
 *
 * Works with existing FeatureFlag schema in Prisma.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CustomLoggerService } from '../logger/logger.service';
import {
  FeatureFlag,
  FlagContext,
  FlagEvaluation,
  FeatureFlagConfig,
  TargetRule,
  EvaluationReason,
} from './feature-flags.interface';
import * as crypto from 'crypto';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly CACHE_PREFIX = 'feature-flag:';
  private readonly config: FeatureFlagConfig = {
    cacheEnabled: true,
    cacheTtlSeconds: 60, // 1 minute cache
    defaultEnabled: false,
    enableMetrics: true,
  };

  // In-memory cache for ultra-fast lookups
  private memoryCache: Map<string, { flag: FeatureFlag; expiresAt: number }> =
    new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: CustomLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Pre-load all flags into cache on startup
    await this.warmupCache();
    this.logger.log('Feature flags cache warmed up', 'FeatureFlagsService');
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabled(flagKey: string, context?: FlagContext): Promise<boolean> {
    const evaluation = await this.evaluate(flagKey, context);
    return evaluation.enabled;
  }

  /**
   * Get the variant for a feature flag (for A/B testing)
   */
  async getVariant(
    flagKey: string,
    context?: FlagContext,
  ): Promise<string | null> {
    const evaluation = await this.evaluate(flagKey, context);
    return evaluation.variant || null;
  }

  /**
   * Full evaluation of a feature flag
   */
  async evaluate(flagKey: string, context?: FlagContext): Promise<FlagEvaluation> {
    const flag = await this.getFlag(flagKey);

    if (!flag) {
      return this.createEvaluation(flagKey, false, 'flag_not_found', context);
    }

    // Check if globally disabled
    if (!flag.enabled) {
      return this.createEvaluation(flagKey, false, 'flag_disabled', context);
    }

    // Check targeting rules first
    if (flag.targetRules && flag.targetRules.length > 0 && context) {
      const ruleMatch = this.evaluateRules(flag.targetRules, context);
      if (ruleMatch !== null) {
        return this.createEvaluation(
          flagKey,
          ruleMatch,
          'rule_match',
          context,
        );
      }
    }

    // Percentage-based rollout
    const rolloutPercentage = flag.rolloutPercentage || 100;
    if (rolloutPercentage < 100) {
      const isInRollout = this.isInRolloutPercentage(
        flagKey,
        rolloutPercentage,
        context,
      );
      return this.createEvaluation(
        flagKey,
        isInRollout,
        'percentage_rollout',
        context,
      );
    }

    // 100% rollout - enabled for everyone
    return this.createEvaluation(
      flagKey,
      true,
      'default_variant',
      context,
    );
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const flags = await this.prisma.featureFlag.findMany({
      include: {
        rules: true,
        segments: true,
      },
      orderBy: { key: 'asc' },
    });

    return flags.map(this.mapDbFlagToInterface);
  }

  /**
   * Create a new feature flag
   */
  async createFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.create({
      data: {
        name: data.name!,
        key: data.key!,
        description: data.description,
        enabled: data.enabled ?? false,
        percentageEnabled: data.rolloutPercentage ?? 0,
      },
      include: {
        rules: true,
        segments: true,
      },
    });

    await this.invalidateCache(flag.key);
    return this.mapDbFlagToInterface(flag);
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    flagKey: string,
    data: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.update({
      where: { key: flagKey },
      data: {
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        percentageEnabled: data.rolloutPercentage,
      },
      include: {
        rules: true,
        segments: true,
      },
    });

    await this.invalidateCache(flagKey);
    return this.mapDbFlagToInterface(flag);
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(flagKey: string): Promise<void> {
    await this.prisma.featureFlag.delete({
      where: { key: flagKey },
    });
    await this.invalidateCache(flagKey);
  }

  /**
   * Toggle a feature flag on/off
   */
  async toggleFlag(flagKey: string): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
    });

    if (!flag) {
      throw new Error(`Feature flag ${flagKey} not found`);
    }

    return this.updateFlag(flagKey, { enabled: !flag.enabled });
  }

  /**
   * Set rollout percentage
   */
  async setRolloutPercentage(
    flagKey: string,
    percentage: number,
  ): Promise<FeatureFlag> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    return this.updateFlag(flagKey, { rolloutPercentage: percentage });
  }

  // Private methods

  private async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    // Check memory cache first
    const memoryCached = this.memoryCache.get(flagKey);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      return memoryCached.flag;
    }

    // Check Redis cache
    if (this.config.cacheEnabled) {
      const cached = await this.redis.get<FeatureFlag>(`${this.CACHE_PREFIX}${flagKey}`);
      if (cached) {
        this.setMemoryCache(flagKey, cached);
        return cached;
      }
    }

    // Fetch from database
    const dbFlag = await this.prisma.featureFlag.findUnique({
      where: { key: flagKey },
      include: {
        rules: true,
        segments: true,
      },
    });

    if (!dbFlag) {
      return null;
    }

    const flag = this.mapDbFlagToInterface(dbFlag);

    // Cache the result
    if (this.config.cacheEnabled) {
      await this.redis.set<FeatureFlag>(
        `${this.CACHE_PREFIX}${flagKey}`,
        flag,
        this.config.cacheTtlSeconds,
      );
    }
    this.setMemoryCache(flagKey, flag);

    return flag;
  }

  private setMemoryCache(flagKey: string, flag: FeatureFlag): void {
    this.memoryCache.set(flagKey, {
      flag,
      expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
    });
  }

  private async invalidateCache(flagKey: string): Promise<void> {
    this.memoryCache.delete(flagKey);
    await this.redis.del(`${this.CACHE_PREFIX}${flagKey}`);
  }

  private async warmupCache(): Promise<void> {
    try {
      const flags = await this.getAllFlags();
      for (const flag of flags) {
        this.setMemoryCache(flag.key, flag);
        if (this.config.cacheEnabled) {
          await this.redis.set<FeatureFlag>(
            `${this.CACHE_PREFIX}${flag.key}`,
            flag,
            this.config.cacheTtlSeconds,
          );
        }
      }
    } catch (error) {
      this.logger.warn('Failed to warmup feature flags cache');
    }
  }

  private evaluateRules(rules: TargetRule[], context: FlagContext): boolean | null {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const contextValue = this.getContextValue(rule.attribute, context);
      if (contextValue === undefined) continue;

      const matches = this.evaluateRule(rule, contextValue);
      if (matches) {
        return true;
      }
    }
    return null; // No rules matched, fall through to percentage rollout
  }

  private getContextValue(
    attribute: string,
    context: FlagContext,
  ): unknown {
    if (attribute === 'custom' && context.custom) {
      return context.custom;
    }
    return (context as Record<string, unknown>)[attribute];
  }

  private evaluateRule(rule: TargetRule, contextValue: unknown): boolean {
    const { operator } = rule;
    const value = rule.value as string | string[] | number;

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'notEquals':
        return contextValue !== value;
      case 'contains':
        return String(contextValue).includes(String(value));
      case 'notContains':
        return !String(contextValue).includes(String(value));
      case 'in':
        return Array.isArray(value) && (value as unknown[]).includes(contextValue);
      case 'notIn':
        return Array.isArray(value) && !(value as unknown[]).includes(contextValue);
      case 'greaterThan':
        return Number(contextValue) > Number(value);
      case 'lessThan':
        return Number(contextValue) < Number(value);
      case 'matches':
        return new RegExp(String(value)).test(String(contextValue));
      default:
        return false;
    }
  }

  private isInRolloutPercentage(
    flagKey: string,
    percentage: number,
    context?: FlagContext,
  ): boolean {
    // Use consistent hashing for deterministic rollout
    const identifier = context?.userId || context?.sessionId || 'anonymous';
    const hash = this.hashString(`${flagKey}:${identifier}`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  private hashString(str: string): number {
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 100;
  }

  private createEvaluation(
    flagKey: string,
    enabled: boolean,
    reason: EvaluationReason,
    context?: FlagContext,
    variant?: string,
  ): FlagEvaluation {
    const evaluation: FlagEvaluation = {
      flagKey,
      enabled,
      variant,
      reason,
      context,
      timestamp: new Date(),
    };

    // Log for metrics/analytics
    if (this.config.enableMetrics) {
      this.logger.debug(
        `Flag evaluated: ${flagKey} = ${enabled} (${reason})`,
        'FeatureFlagsService',
      );
    }

    return evaluation;
  }

  private mapDbFlagToInterface(dbFlag: any): FeatureFlag {
    return {
      id: dbFlag.id,
      name: dbFlag.name,
      key: dbFlag.key,
      description: dbFlag.description,
      enabled: dbFlag.enabled,
      rolloutPercentage: dbFlag.percentageEnabled || 0,
      targetRules: dbFlag.rules?.map((rule: any) => ({
        id: rule.id,
        attribute: rule.attribute,
        operator: rule.operator,
        value: rule.value,
        enabled: rule.enabled,
      })),
      createdAt: dbFlag.createdAt,
      updatedAt: dbFlag.updatedAt,
    };
  }
}
