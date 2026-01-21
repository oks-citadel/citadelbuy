import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ExperimentsService } from './experiments.service';
import { TargetingService } from './targeting.service';
import {
  AssignUserDto,
  BulkAssignDto,
  AssignmentResponseDto,
  BulkAssignmentResponseDto,
} from '../dto/assignment.dto';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);
  private readonly CACHE_PREFIX = 'assignment:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly experimentsService: ExperimentsService,
    private readonly targetingService: TargetingService,
  ) {}

  /**
   * Assign a user to a variant in an experiment
   * Uses deterministic hashing for consistent assignment
   */
  async assignUser(
    experimentId: string,
    dto: AssignUserDto,
  ): Promise<AssignmentResponseDto | null> {
    const { userId, context, forceVariantId } = dto;

    // Check for existing assignment first
    const existing = await this.getExistingAssignment(experimentId, userId);
    if (existing) {
      return existing;
    }

    // Get experiment
    const experiment = await this.experimentsService.findOne(experimentId);

    // Validate experiment is running
    if (experiment.status !== 'RUNNING') {
      throw new BadRequestException(
        `Cannot assign to experiment in ${experiment.status} status`,
      );
    }

    // Check if user is in traffic allocation
    if (!this.isInTrafficAllocation(userId, experimentId, experiment.trafficAllocation)) {
      this.logger.debug(`User ${userId} not in traffic allocation for ${experimentId}`);
      return null;
    }

    // Check targeting rules
    if (experiment.targetingRules && experiment.targetingRules.length > 0) {
      const isEligible = this.targetingService.evaluateRules(
        experiment.targetingRules,
        { userId, ...context },
      );

      if (!isEligible) {
        this.logger.debug(`User ${userId} not eligible for ${experimentId} due to targeting`);
        return null;
      }
    }

    // Check mutual exclusion
    if (experiment.mutualExclusionGroupId) {
      const hasConflict = await this.checkMutualExclusion(
        userId,
        experiment.mutualExclusionGroupId,
        experimentId,
      );

      if (hasConflict) {
        this.logger.debug(
          `User ${userId} excluded from ${experimentId} due to mutual exclusion`,
        );
        return null;
      }
    }

    // Check exclusive experiments
    if (experiment.isExclusive) {
      const existingAssignments = await this.prisma.experimentAssignment.findMany({
        where: {
          userId,
          experiment: { status: 'RUNNING' },
        },
      });

      if (existingAssignments.length > 0) {
        this.logger.debug(
          `User ${userId} excluded from exclusive experiment ${experimentId}`,
        );
        return null;
      }
    }

    // Determine variant assignment
    let variant;
    if (forceVariantId) {
      variant = experiment.variants.find((v: any) => v.id === forceVariantId);
      if (!variant) {
        throw new NotFoundException(`Variant ${forceVariantId} not found`);
      }
    } else {
      variant = this.selectVariant(userId, experimentId, experiment.variants);
    }

    const hashKey = this.generateHashKey(userId, experimentId);

    // Create assignment
    const assignment = await this.prisma.experimentAssignment.create({
      data: {
        experimentId,
        variantId: variant.id,
        userId,
        hashKey,
        context,
      },
      include: {
        variant: true,
        experiment: {
          select: { name: true },
        },
      },
    });

    // Cache assignment
    await this.cacheAssignment(experimentId, userId, assignment);

    this.logger.log(
      `User ${userId} assigned to variant ${variant.name} in experiment ${experiment.name}`,
    );

    return this.formatAssignmentResponse(assignment);
  }

  /**
   * Get existing assignment for user
   */
  async getAssignment(
    experimentId: string,
    userId: string,
  ): Promise<AssignmentResponseDto | null> {
    // Try cache first
    const cacheKey = `${this.CACHE_PREFIX}${experimentId}:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);

    if (cached) {
      return this.formatAssignmentResponse(cached);
    }

    const assignment = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId,
          userId,
        },
      },
      include: {
        variant: true,
        experiment: {
          select: { name: true },
        },
      },
    });

    if (!assignment) {
      return null;
    }

    // Cache for future lookups
    await this.cacheAssignment(experimentId, userId, assignment);

    return this.formatAssignmentResponse(assignment);
  }

  /**
   * Bulk assign user to multiple experiments
   */
  async bulkAssign(dto: BulkAssignDto): Promise<BulkAssignmentResponseDto> {
    const { userId, experimentIds, context } = dto;

    const assignments: AssignmentResponseDto[] = [];
    const ineligible: string[] = [];
    const errors: string[] = [];

    for (const experimentId of experimentIds) {
      try {
        const assignment = await this.assignUser(experimentId, { userId, context });
        if (assignment) {
          assignments.push(assignment);
        } else {
          ineligible.push(experimentId);
        }
      } catch (error) {
        this.logger.error(
          `Error assigning user ${userId} to experiment ${experimentId}: ${error.message}`,
        );
        errors.push(experimentId);
      }
    }

    return {
      userId,
      assignments,
      ineligible,
      errors,
    };
  }

  /**
   * Get all active experiment assignments for a user
   */
  async getUserExperiments(userId: string) {
    const assignments = await this.prisma.experimentAssignment.findMany({
      where: {
        userId,
        experiment: {
          status: 'RUNNING',
        },
      },
      include: {
        variant: true,
        experiment: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      userId,
      activeExperiments: assignments.map(a => this.formatAssignmentResponse(a)),
      count: assignments.length,
    };
  }

  /**
   * Generate deterministic hash key for assignment
   */
  private generateHashKey(userId: string, experimentId: string): string {
    const input = `${userId}:${experimentId}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Check if user is in traffic allocation using consistent hashing
   */
  private isInTrafficAllocation(
    userId: string,
    experimentId: string,
    allocation: number,
  ): boolean {
    if (allocation >= 100) return true;
    if (allocation <= 0) return false;

    const hashKey = this.generateHashKey(userId, `${experimentId}:traffic`);
    const hashValue = parseInt(hashKey.substring(0, 8), 16);
    const normalizedValue = (hashValue / 0xffffffff) * 100;

    return normalizedValue < allocation;
  }

  /**
   * Select variant using weighted random assignment based on deterministic hash
   */
  private selectVariant(userId: string, experimentId: string, variants: any[]): any {
    const hashKey = this.generateHashKey(userId, experimentId);
    const hashValue = parseInt(hashKey.substring(0, 8), 16);
    const normalizedValue = (hashValue / 0xffffffff) * 100;

    // Sort variants by weight for consistent selection
    const sortedVariants = [...variants].sort((a, b) => a.weight - b.weight);

    let cumulativeWeight = 0;
    for (const variant of sortedVariants) {
      cumulativeWeight += variant.weight;
      if (normalizedValue < cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to last variant (shouldn't happen if weights sum to 100)
    return sortedVariants[sortedVariants.length - 1];
  }

  /**
   * Check mutual exclusion group for conflicts
   */
  private async checkMutualExclusion(
    userId: string,
    groupId: string,
    currentExperimentId: string,
  ): Promise<boolean> {
    const existingAssignment = await this.prisma.experimentAssignment.findFirst({
      where: {
        userId,
        experiment: {
          mutualExclusionGroupId: groupId,
          id: { not: currentExperimentId },
          status: 'RUNNING',
        },
      },
    });

    return !!existingAssignment;
  }

  /**
   * Get existing assignment (cached or from DB)
   */
  private async getExistingAssignment(
    experimentId: string,
    userId: string,
  ): Promise<AssignmentResponseDto | null> {
    return this.getAssignment(experimentId, userId);
  }

  /**
   * Cache assignment
   */
  private async cacheAssignment(
    experimentId: string,
    userId: string,
    assignment: any,
  ): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${experimentId}:${userId}`;
    await this.redis.set(cacheKey, assignment, this.CACHE_TTL);
  }

  /**
   * Format assignment response
   */
  private formatAssignmentResponse(assignment: any): AssignmentResponseDto {
    return {
      id: assignment.id,
      experimentId: assignment.experimentId,
      experimentName: assignment.experiment?.name ?? '',
      variantId: assignment.variantId,
      variantName: assignment.variant?.name ?? '',
      isControl: assignment.variant?.isControl ?? false,
      payload: assignment.variant?.payload,
      assignedAt: assignment.assignedAt,
    };
  }

  /**
   * Invalidate assignment cache
   */
  async invalidateAssignment(experimentId: string, userId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${experimentId}:${userId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Invalidate all assignments for an experiment
   */
  async invalidateExperimentAssignments(experimentId: string): Promise<void> {
    await this.redis.delPattern(`${this.CACHE_PREFIX}${experimentId}:*`);
  }
}
