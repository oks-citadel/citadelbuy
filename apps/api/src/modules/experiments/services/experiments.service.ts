import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  CreateExperimentDto,
  UpdateExperimentDto,
  ExperimentQueryDto,
  ConcludeExperimentDto,
  ExperimentStatus,
  MutualExclusionGroupDto,
} from '../dto/experiment.dto';

@Injectable()
export class ExperimentsService {
  private readonly logger = new Logger(ExperimentsService.name);
  private readonly CACHE_PREFIX = 'experiment:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a new experiment
   */
  async create(dto: CreateExperimentDto, userId?: string) {
    // Validate variant weights sum to 100
    const totalWeight = dto.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    // Ensure exactly one control variant
    const controlCount = dto.variants.filter(v => v.isControl).length;
    if (controlCount !== 1) {
      throw new BadRequestException('Exactly one variant must be marked as control');
    }

    // Validate primary metric exists in metrics array
    if (dto.primaryMetric && dto.metrics) {
      const metricExists = dto.metrics.some(m => m.key === dto.primaryMetric);
      if (!metricExists) {
        throw new BadRequestException(`Primary metric "${dto.primaryMetric}" not found in metrics`);
      }
    }

    const experiment = await this.prisma.experiment.create({
      data: {
        name: dto.name,
        description: dto.description,
        hypothesis: dto.hypothesis,
        trafficAllocation: dto.trafficAllocation ?? 100,
        isExclusive: dto.isExclusive ?? false,
        mutualExclusionGroupId: dto.mutualExclusionGroupId,
        primaryMetric: dto.primaryMetric,
        createdById: userId,
        variants: {
          create: dto.variants.map(v => ({
            name: v.name,
            description: v.description,
            weight: v.weight,
            isControl: v.isControl,
            payload: v.payload,
          })),
        },
        targetingRules: dto.targetingRules ? {
          create: dto.targetingRules.map(r => ({
            attribute: r.attribute,
            operator: r.operator,
            value: r.value,
            priority: r.priority ?? 0,
          })),
        } : undefined,
        metrics: dto.metrics ? {
          create: dto.metrics.map(m => ({
            key: m.key,
            name: m.name,
            description: m.description,
            eventName: m.eventName,
            aggregationType: m.aggregationType ?? 'count',
            minimumSampleSize: m.minimumSampleSize ?? 100,
            confidenceLevel: m.confidenceLevel ?? 0.95,
          })),
        } : undefined,
      },
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    // Log audit event
    await this.createAuditLog(experiment.id, 'created', userId, { experiment });

    this.logger.log(`Experiment created: ${experiment.id} - ${experiment.name}`);
    return experiment;
  }

  /**
   * Get all experiments with filtering and pagination
   */
  async findAll(query: ExperimentQueryDto) {
    const { status, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [experiments, total] = await Promise.all([
      this.prisma.experiment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: true,
          targetingRules: true,
          metrics: true,
          _count: {
            select: {
              assignments: true,
              events: true,
            },
          },
        },
      }),
      this.prisma.experiment.count({ where }),
    ]);

    return {
      data: experiments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get experiment by ID
   */
  async findOne(id: string) {
    // Try cache first
    const cached = await this.redis.get<any>(`${this.CACHE_PREFIX}${id}`);
    if (cached) {
      return cached;
    }

    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: {
        variants: true,
        targetingRules: {
          orderBy: { priority: 'desc' },
        },
        metrics: true,
        mutualExclusionGroup: true,
        _count: {
          select: {
            assignments: true,
            events: true,
          },
        },
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${id} not found`);
    }

    // Cache for running experiments
    if (experiment.status === 'RUNNING') {
      await this.redis.set(`${this.CACHE_PREFIX}${id}`, experiment, this.CACHE_TTL);
    }

    return experiment;
  }

  /**
   * Update experiment
   */
  async update(id: string, dto: UpdateExperimentDto, userId?: string) {
    const existing = await this.findOne(id);

    // Prevent updates to running experiments (except pausing)
    if (existing.status === 'RUNNING') {
      const allowedFields = ['description', 'hypothesis'];
      const updateKeys = Object.keys(dto);
      const hasDisallowedUpdates = updateKeys.some(k => !allowedFields.includes(k));

      if (hasDisallowedUpdates) {
        throw new BadRequestException(
          'Cannot modify running experiment. Pause the experiment first.',
        );
      }
    }

    // Validate variants if provided
    if (dto.variants) {
      const totalWeight = dto.variants.reduce((sum, v) => sum + v.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new BadRequestException(`Variant weights must sum to 100, got ${totalWeight}`);
      }

      const controlCount = dto.variants.filter(v => v.isControl).length;
      if (controlCount !== 1) {
        throw new BadRequestException('Exactly one variant must be marked as control');
      }
    }

    const before = { ...existing };

    // Build update data
    const updateData: any = {
      name: dto.name,
      description: dto.description,
      hypothesis: dto.hypothesis,
      trafficAllocation: dto.trafficAllocation,
      isExclusive: dto.isExclusive,
      mutualExclusionGroupId: dto.mutualExclusionGroupId,
      primaryMetric: dto.primaryMetric,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const experiment = await this.prisma.experiment.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${id}`);

    // Log audit
    await this.createAuditLog(id, 'updated', userId, { before, after: experiment });

    return experiment;
  }

  /**
   * Archive experiment (soft delete)
   */
  async archive(id: string, userId?: string) {
    const experiment = await this.findOne(id);

    if (experiment.status === 'RUNNING') {
      throw new BadRequestException('Cannot archive running experiment. Stop it first.');
    }

    const updated = await this.prisma.experiment.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    await this.redis.del(`${this.CACHE_PREFIX}${id}`);
    await this.createAuditLog(id, 'archived', userId);

    return updated;
  }

  /**
   * Start experiment
   */
  async start(id: string, userId?: string) {
    const experiment = await this.findOne(id);

    if (experiment.status !== 'DRAFT' && experiment.status !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot start experiment in ${experiment.status} status`,
      );
    }

    // Validate experiment has required configuration
    if (!experiment.variants || experiment.variants.length < 2) {
      throw new BadRequestException('Experiment must have at least 2 variants');
    }

    // Check mutual exclusion conflicts
    if (experiment.mutualExclusionGroupId) {
      const conflicting = await this.prisma.experiment.findFirst({
        where: {
          mutualExclusionGroupId: experiment.mutualExclusionGroupId,
          status: 'RUNNING',
          id: { not: id },
        },
      });

      if (conflicting) {
        throw new ConflictException(
          `Cannot start: Another experiment (${conflicting.name}) in the same mutual exclusion group is already running`,
        );
      }
    }

    const updated = await this.prisma.experiment.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startedAt: experiment.startedAt ?? new Date(),
        pausedAt: null,
      },
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    await this.redis.del(`${this.CACHE_PREFIX}${id}`);
    await this.createAuditLog(id, 'started', userId);

    this.logger.log(`Experiment started: ${id} - ${updated.name}`);
    return updated;
  }

  /**
   * Stop (pause) experiment
   */
  async stop(id: string, userId?: string) {
    const experiment = await this.findOne(id);

    if (experiment.status !== 'RUNNING') {
      throw new BadRequestException(
        `Cannot stop experiment in ${experiment.status} status`,
      );
    }

    const updated = await this.prisma.experiment.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    await this.redis.del(`${this.CACHE_PREFIX}${id}`);
    await this.createAuditLog(id, 'stopped', userId);

    this.logger.log(`Experiment stopped: ${id} - ${updated.name}`);
    return updated;
  }

  /**
   * Conclude experiment with winner
   */
  async conclude(id: string, dto: ConcludeExperimentDto, userId?: string) {
    const experiment = await this.findOne(id);

    if (experiment.status !== 'RUNNING' && experiment.status !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot conclude experiment in ${experiment.status} status`,
      );
    }

    // Validate winner variant exists
    const variant = experiment.variants.find((v: any) => v.id === dto.winnerVariantId);
    if (!variant) {
      throw new NotFoundException(`Variant ${dto.winnerVariantId} not found`);
    }

    const updated = await this.prisma.experiment.update({
      where: { id },
      data: {
        status: 'CONCLUDED',
        concludedAt: new Date(),
        winnerVariantId: dto.winnerVariantId,
      },
      include: {
        variants: true,
        targetingRules: true,
        metrics: true,
      },
    });

    await this.redis.del(`${this.CACHE_PREFIX}${id}`);
    await this.createAuditLog(id, 'concluded', userId, {
      winnerVariantId: dto.winnerVariantId,
      winnerVariantName: variant.name,
      notes: dto.notes,
    });

    this.logger.log(`Experiment concluded: ${id} - Winner: ${variant.name}`);
    return updated;
  }

  /**
   * Get running experiments for assignment
   */
  async getRunningExperiments() {
    const cacheKey = `${this.CACHE_PREFIX}running`;
    const cached = await this.redis.get<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const experiments = await this.prisma.experiment.findMany({
      where: { status: 'RUNNING' },
      include: {
        variants: true,
        targetingRules: {
          orderBy: { priority: 'desc' },
        },
        mutualExclusionGroup: true,
      },
    });

    await this.redis.set(cacheKey, experiments, 60); // Cache for 1 minute
    return experiments;
  }

  /**
   * Create mutual exclusion group
   */
  async createMutualExclusionGroup(dto: MutualExclusionGroupDto) {
    const existing = await this.prisma.mutualExclusionGroup.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Mutual exclusion group "${dto.name}" already exists`);
    }

    return this.prisma.mutualExclusionGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  /**
   * Get mutual exclusion groups
   */
  async getMutualExclusionGroups() {
    return this.prisma.mutualExclusionGroup.findMany({
      include: {
        experiments: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    experimentId: string,
    action: string,
    userId?: string,
    changes?: any,
  ) {
    try {
      await this.prisma.experimentAuditLog.create({
        data: {
          experimentId,
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
   * Get experiment audit logs
   */
  async getAuditLogs(experimentId: string, limit = 50) {
    await this.findOne(experimentId); // Validate experiment exists

    return this.prisma.experimentAuditLog.findMany({
      where: { experimentId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
