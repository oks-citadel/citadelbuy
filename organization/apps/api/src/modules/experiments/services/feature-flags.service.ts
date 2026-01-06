import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { TargetingService } from './targeting.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  EvaluateFlagDto,
  BulkEvaluateFlagsDto,
  FeatureFlagQueryDto,
  FlagEvaluationResponseDto,
  BulkFlagEvaluationResponseDto,
  FeatureFlagType,
} from '../dto/feature-flag.dto';
import { EvaluationReason, UserContext } from '../interfaces/experiment.interface';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly CACHE_PREFIX = 'flag:';
  private readonly CACHE_TTL = 60; // 1 minute for flags (short for fast updates)
  private readonly EVAL_CACHE_PREFIX = 'flag:eval:';
  private readonly EVAL_CACHE_TTL = 300; // 5 minutes for evaluations
  private readonly currentEnvironment: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly targetingService: TargetingService,
  ) {
    this.currentEnvironment = this.configService.get<string>('NODE_ENV') ?? 'development';
  }

  /**
   * Create a new feature flag
   */
  async create(dto: CreateFeatureFlagDto, userId?: string) {
    // Check for duplicate key
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Feature flag with key "${dto.key}" already exists`);
    }

    const flag = await this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        enabled: dto.enabled ?? false,
        defaultValue: dto.defaultValue ?? false,
        percentageEnabled: dto.percentageEnabled,
        environments: dto.environments,
        createdById: userId,
        rules: dto.rules ? {
          create: dto.rules.map((r, index) => ({
            attribute: r.attribute,
            operator: r.operator,
            value: r.value,
            priority: r.priority ?? index,
            enabled: r.enabled ?? true,
            returnValue: r.returnValue ?? true,
          })),
        } : undefined,
        segments: dto.segments ? {
          create: dto.segments.map(s => ({
            segmentId: s.segmentId,
            enabled: s.enabled ?? true,
            returnValue: s.returnValue ?? true,
          })),
        } : undefined,
      },
      include: {
        rules: { orderBy: { priority: 'desc' } },
        segments: true,
      },
    });

    // Log audit
    await this.createAuditLog(flag.id, 'created', userId, { flag });

    // Invalidate cache
    await this.invalidateFlagCache(dto.key);

    this.logger.log(`Feature flag created: ${flag.key}`);
    return flag;
  }

  /**
   * Get all feature flags
   */
  async findAll(query: FeatureFlagQueryDto) {
    const { type, enabled, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (enabled !== undefined) where.enabled = enabled;
    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [flags, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rules: { orderBy: { priority: 'desc' } },
          segments: true,
        },
      }),
      this.prisma.featureFlag.count({ where }),
    ]);

    return {
      data: flags,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get flag by key
   */
  async findByKey(key: string) {
    // Try cache first
    const cached = await this.redis.get<any>(`${this.CACHE_PREFIX}${key}`);
    if (cached) {
      return cached;
    }

    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      include: {
        rules: { orderBy: { priority: 'desc' } },
        segments: true,
      },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    // Cache the flag
    await this.redis.set(`${this.CACHE_PREFIX}${key}`, flag, this.CACHE_TTL);

    return flag;
  }

  /**
   * Update feature flag
   */
  async update(key: string, dto: UpdateFeatureFlagDto, userId?: string) {
    const existing = await this.findByKey(key);
    const before = { ...existing };

    // Build update data
    const updateData: any = {
      name: dto.name,
      description: dto.description,
      type: dto.type,
      enabled: dto.enabled,
      defaultValue: dto.defaultValue,
      percentageEnabled: dto.percentageEnabled,
      environments: dto.environments,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(k => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    // Handle rules update
    if (dto.rules !== undefined) {
      // Delete existing rules
      await this.prisma.featureFlagRule.deleteMany({
        where: { flagId: existing.id },
      });

      // Create new rules
      if (dto.rules.length > 0) {
        await this.prisma.featureFlagRule.createMany({
          data: dto.rules.map((r, index) => ({
            flagId: existing.id,
            attribute: r.attribute,
            operator: r.operator,
            value: r.value as any,
            priority: r.priority ?? index,
            enabled: r.enabled ?? true,
            returnValue: r.returnValue as any ?? true,
          })),
        });
      }
    }

    // Handle segments update
    if (dto.segments !== undefined) {
      // Delete existing segments
      await this.prisma.featureFlagSegment.deleteMany({
        where: { flagId: existing.id },
      });

      // Create new segments
      if (dto.segments.length > 0) {
        await this.prisma.featureFlagSegment.createMany({
          data: dto.segments.map(s => ({
            flagId: existing.id,
            segmentId: s.segmentId,
            enabled: s.enabled ?? true,
            returnValue: s.returnValue as any ?? true,
          })),
        });
      }
    }

    const flag = await this.prisma.featureFlag.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        rules: { orderBy: { priority: 'desc' } },
        segments: true,
      },
    });

    // Log audit
    await this.createAuditLog(flag.id, 'updated', userId, { before, after: flag });

    // Invalidate caches
    await this.invalidateFlagCache(key);

    this.logger.log(`Feature flag updated: ${key}`);
    return flag;
  }

  /**
   * Delete feature flag
   */
  async delete(key: string, userId?: string) {
    const flag = await this.findByKey(key);

    await this.prisma.featureFlag.delete({
      where: { id: flag.id },
    });

    // Log audit
    await this.createAuditLog(flag.id, 'deleted', userId, { flag });

    // Invalidate caches
    await this.invalidateFlagCache(key);

    this.logger.log(`Feature flag deleted: ${key}`);
    return { success: true };
  }

  /**
   * Evaluate a flag for a user
   * Performance target: < 10ms
   */
  async evaluate(
    key: string,
    dto: EvaluateFlagDto,
  ): Promise<FlagEvaluationResponseDto> {
    const startTime = Date.now();
    const { userId, context, environment } = dto;
    const env = environment ?? this.currentEnvironment;

    // Try evaluation cache first
    const evalCacheKey = this.buildEvalCacheKey(key, userId, env);
    const cached = await this.redis.get<FlagEvaluationResponseDto>(evalCacheKey);
    if (cached) {
      this.logger.debug(`Flag eval cache hit: ${key} for user ${userId} (${Date.now() - startTime}ms)`);
      return cached;
    }

    // Get flag
    const flag = await this.findByKey(key);
    const userContext: UserContext = { userId, environment: env, ...context };

    // Evaluate flag
    const result = await this.evaluateFlag(flag, userContext);

    // Cache result
    await this.redis.set(evalCacheKey, result, this.EVAL_CACHE_TTL);

    const duration = Date.now() - startTime;
    if (duration > 10) {
      this.logger.warn(`Flag evaluation took ${duration}ms (target: <10ms) for ${key}`);
    }

    return result;
  }

  /**
   * Evaluate multiple flags for a user
   */
  async bulkEvaluate(dto: BulkEvaluateFlagsDto): Promise<BulkFlagEvaluationResponseDto> {
    const { userId, flagKeys, context, environment } = dto;
    const env = environment ?? this.currentEnvironment;

    // Get flags to evaluate
    let flags: any[];
    if (flagKeys && flagKeys.length > 0) {
      flags = await this.prisma.featureFlag.findMany({
        where: { key: { in: flagKeys } },
        include: {
          rules: { orderBy: { priority: 'desc' } },
          segments: true,
        },
      });
    } else {
      // Get all enabled flags
      flags = await this.prisma.featureFlag.findMany({
        where: { enabled: true },
        include: {
          rules: { orderBy: { priority: 'desc' } },
          segments: true,
        },
      });
    }

    const userContext: UserContext = { userId, environment: env, ...context };
    const results: Record<string, FlagEvaluationResponseDto> = {};

    // Evaluate each flag
    await Promise.all(
      flags.map(async flag => {
        const result = await this.evaluateFlag(flag, userContext);
        results[flag.key] = result;
      }),
    );

    return {
      userId,
      flags: results,
      count: Object.keys(results).length,
    };
  }

  /**
   * Core flag evaluation logic
   */
  private async evaluateFlag(
    flag: any,
    context: UserContext,
  ): Promise<FlagEvaluationResponseDto> {
    const now = new Date();

    // Check if flag is disabled
    if (!flag.enabled) {
      return {
        key: flag.key,
        value: flag.defaultValue,
        reason: EvaluationReason.FLAG_DISABLED,
        evaluatedAt: now,
      };
    }

    // Check environment-specific settings
    if (flag.type === FeatureFlagType.ENVIRONMENT && flag.environments) {
      const envEnabled = flag.environments[context.environment ?? this.currentEnvironment];
      if (envEnabled !== undefined) {
        return {
          key: flag.key,
          value: envEnabled,
          reason: EvaluationReason.ENVIRONMENT_MATCH,
          evaluatedAt: now,
        };
      }
    }

    // Check targeting rules (highest priority first)
    if (flag.rules && flag.rules.length > 0) {
      for (const rule of flag.rules) {
        if (!rule.enabled) continue;

        const matches = this.targetingService.evaluateRule(rule, context);
        if (matches) {
          return {
            key: flag.key,
            value: rule.returnValue,
            reason: EvaluationReason.TARGETING_MATCH,
            matchedRuleId: rule.id,
            evaluatedAt: now,
          };
        }
      }
    }

    // Check segment targeting
    if (flag.segments && flag.segments.length > 0) {
      for (const segment of flag.segments) {
        if (!segment.enabled) continue;

        const inSegment = await this.targetingService.isUserInSegment(
          segment.segmentId,
          context,
        );
        if (inSegment) {
          return {
            key: flag.key,
            value: segment.returnValue,
            reason: EvaluationReason.SEGMENT_MATCH,
            evaluatedAt: now,
          };
        }
      }
    }

    // Check percentage rollout
    if (flag.type === FeatureFlagType.PERCENTAGE && flag.percentageEnabled !== null) {
      const isInRollout = this.isInPercentageRollout(
        context.userId,
        flag.key,
        flag.percentageEnabled,
      );

      if (isInRollout) {
        return {
          key: flag.key,
          value: true,
          reason: EvaluationReason.PERCENTAGE_ROLLOUT,
          evaluatedAt: now,
        };
      }

      return {
        key: flag.key,
        value: false,
        reason: EvaluationReason.USER_NOT_IN_ROLLOUT,
        evaluatedAt: now,
      };
    }

    // Return default value
    return {
      key: flag.key,
      value: flag.defaultValue,
      reason: EvaluationReason.DEFAULT_VALUE,
      evaluatedAt: now,
    };
  }

  /**
   * Check if user is in percentage rollout using consistent hashing
   */
  private isInPercentageRollout(
    userId: string,
    flagKey: string,
    percentage: number,
  ): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const hash = createHash('sha256')
      .update(`${userId}:${flagKey}`)
      .digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const normalizedValue = (hashValue / 0xffffffff) * 100;

    return normalizedValue < percentage;
  }

  /**
   * Build evaluation cache key
   */
  private buildEvalCacheKey(flagKey: string, userId: string, environment: string): string {
    return `${this.EVAL_CACHE_PREFIX}${flagKey}:${userId}:${environment}`;
  }

  /**
   * Invalidate flag cache
   */
  private async invalidateFlagCache(key: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${this.CACHE_PREFIX}${key}`),
      this.redis.delPattern(`${this.EVAL_CACHE_PREFIX}${key}:*`),
    ]);
  }

  /**
   * Create audit log
   */
  private async createAuditLog(
    flagId: string,
    action: string,
    userId?: string,
    changes?: any,
  ): Promise<void> {
    try {
      await this.prisma.featureFlagAuditLog.create({
        data: {
          flagId,
          action,
          userId,
          changes,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  /**
   * Get flag audit logs
   */
  async getAuditLogs(key: string, limit = 50) {
    const flag = await this.findByKey(key);

    return this.prisma.featureFlagAuditLog.findMany({
      where: { flagId: flag.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Toggle flag enabled state
   */
  async toggle(key: string, enabled: boolean, userId?: string) {
    return this.update(key, { enabled }, userId);
  }

  /**
   * Get all enabled flags for SDK initialization
   */
  async getEnabledFlags(): Promise<Record<string, any>> {
    const cacheKey = `${this.CACHE_PREFIX}enabled:all`;
    const cached = await this.redis.get<Record<string, any>>(cacheKey);

    if (cached) {
      return cached;
    }

    const flags = await this.prisma.featureFlag.findMany({
      where: { enabled: true },
      select: {
        key: true,
        type: true,
        defaultValue: true,
        percentageEnabled: true,
        environments: true,
      },
    });

    const result: Record<string, any> = {};
    flags.forEach(flag => {
      result[flag.key] = {
        type: flag.type,
        defaultValue: flag.defaultValue,
        percentageEnabled: flag.percentageEnabled,
        environments: flag.environments,
      };
    });

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}
