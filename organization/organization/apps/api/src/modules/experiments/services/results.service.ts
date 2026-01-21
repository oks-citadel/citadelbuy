import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  ResultsQueryDto,
  SignificanceQueryDto,
  SegmentResultsQueryDto,
  SegmentationType,
  ExperimentResultsDto,
  StatisticalSignificanceDto,
  ConfidenceIntervalDto,
  SegmentedResultsDto,
  VariantResultDto,
  VariantComparisonDto,
  VariantConfidenceIntervalDto,
} from '../dto/results.dto';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);
  private readonly CACHE_PREFIX = 'results:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get experiment results
   */
  async getResults(
    experimentId: string,
    query: ResultsQueryDto,
  ): Promise<ExperimentResultsDto> {
    const experiment = await this.getExperiment(experimentId);

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get all variants
    const variants = experiment.variants;

    // Get assignments per variant
    const assignmentCounts = await this.prisma.experimentAssignment.groupBy({
      by: ['variantId'],
      where: {
        experimentId,
        ...(dateFilter && { assignedAt: dateFilter }),
      },
      _count: true,
    });

    // Get events per variant
    const eventCounts = await this.prisma.experimentEvent.groupBy({
      by: ['variantId'],
      where: {
        experimentId,
        ...(query.metricKey && {
          eventName: query.metricKey,
        }),
        ...(dateFilter && { timestamp: dateFilter }),
      },
      _count: true,
      _sum: { eventValue: true },
    });

    // Build variant results
    const variantResults: VariantResultDto[] = variants.map((variant: any) => {
      const assignments = assignmentCounts.find(a => a.variantId === variant.id);
      const events = eventCounts.find(e => e.variantId === variant.id);

      const sampleSize = assignments?._count ?? 0;
      const conversions = events?._count ?? 0;
      const totalValue = events?._sum?.eventValue ?? 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        sampleSize,
        conversions,
        conversionRate: sampleSize > 0 ? conversions / sampleSize : 0,
        totalValue,
        averageValue: conversions > 0 ? totalValue / conversions : 0,
      };
    });

    return {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status,
      totalParticipants: variantResults.reduce((sum, v) => sum + v.sampleSize, 0),
      totalEvents: variantResults.reduce((sum, v) => sum + v.conversions, 0),
      variants: variantResults,
      asOf: new Date(),
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
  }

  /**
   * Calculate statistical significance
   */
  async getSignificance(
    experimentId: string,
    query: SignificanceQueryDto,
  ): Promise<StatisticalSignificanceDto> {
    const results = await this.getResults(experimentId, query);
    const experiment = await this.getExperiment(experimentId);

    const confidenceLevel = query.confidenceLevel ?? 0.95;
    const minimumSampleSize = query.minimumSampleSize ?? 100;

    // Find control variant
    const control = results.variants.find(v => v.isControl);
    if (!control) {
      throw new NotFoundException('Control variant not found');
    }

    // Get metric info
    const metricKey = query.metricKey ?? experiment.primaryMetric ?? 'conversion';
    const metric = experiment.metrics?.find((m: any) => m.key === metricKey);

    // Compare each variant to control
    const comparisons: VariantComparisonDto[] = results.variants
      .filter(v => !v.isControl)
      .map(variant => {
        const comparison = this.calculateSignificance(
          control,
          variant,
          confidenceLevel,
        );

        return {
          variantId: variant.variantId,
          variantName: variant.variantName,
          controlId: control.variantId,
          controlName: control.variantName,
          ...comparison,
        };
      });

    // Determine if any variant is significant winner
    const significantWinners = comparisons.filter(
      c => c.isSignificant && c.relativeLift > 0,
    );

    const hasSignificantResult =
      significantWinners.length > 0 &&
      results.variants.every(v => v.sampleSize >= minimumSampleSize);

    let recommendation = 'Continue collecting data';
    if (hasSignificantResult) {
      const bestWinner = significantWinners.reduce((best, current) =>
        current.relativeLift > best.relativeLift ? current : best,
      );
      recommendation = `Consider concluding with ${bestWinner.variantName} as winner (${(bestWinner.relativeLift * 100).toFixed(1)}% lift)`;
    } else if (
      results.variants.every(v => v.sampleSize >= minimumSampleSize * 2)
    ) {
      recommendation = 'Sufficient data collected but no significant difference found. Consider concluding with control.';
    }

    return {
      experimentId,
      metricKey,
      metricName: metric?.name ?? metricKey,
      confidenceLevel,
      comparisons,
      isSignificant: hasSignificantResult,
      recommendation,
      asOf: new Date(),
    };
  }

  /**
   * Get confidence intervals for each variant
   */
  async getConfidenceIntervals(
    experimentId: string,
    query: SignificanceQueryDto,
  ): Promise<ConfidenceIntervalDto> {
    const results = await this.getResults(experimentId, query);
    const experiment = await this.getExperiment(experimentId);

    const confidenceLevel = query.confidenceLevel ?? 0.95;
    const metricKey = query.metricKey ?? experiment.primaryMetric ?? 'conversion';

    // Z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);

    const intervals: VariantConfidenceIntervalDto[] = results.variants.map(variant => {
      const p = variant.conversionRate;
      const n = variant.sampleSize;

      // Standard error for proportion
      const se = n > 0 ? Math.sqrt((p * (1 - p)) / n) : 0;
      const margin = zScore * se;

      return {
        variantId: variant.variantId,
        variantName: variant.variantName,
        isControl: variant.isControl,
        mean: p,
        lowerBound: Math.max(0, p - margin),
        upperBound: Math.min(1, p + margin),
        standardDeviation: se * Math.sqrt(n),
        sampleSize: n,
      };
    });

    return {
      experimentId,
      metricKey,
      confidenceLevel,
      intervals,
      asOf: new Date(),
    };
  }

  /**
   * Get results segmented by user attribute
   */
  async getSegmentedResults(
    experimentId: string,
    query: SegmentResultsQueryDto,
  ): Promise<SegmentedResultsDto> {
    const experiment = await this.getExperiment(experimentId);
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get events with context
    const events = await this.prisma.experimentEvent.findMany({
      where: {
        experimentId,
        ...(dateFilter && { timestamp: dateFilter }),
      },
      select: {
        variantId: true,
        userId: true,
        metadata: true,
      },
    });

    // Get assignments with context
    const assignments = await this.prisma.experimentAssignment.findMany({
      where: {
        experimentId,
        ...(dateFilter && { assignedAt: dateFilter }),
      },
      select: {
        variantId: true,
        userId: true,
        context: true,
      },
    });

    // Group by segment
    const segmentMap = new Map<string, {
      participants: Set<string>;
      events: Map<string, number>;
      variantData: Map<string, { participants: Set<string>; events: number }>;
    }>();

    // Process assignments
    for (const assignment of assignments) {
      const segmentValue = this.getSegmentValue(assignment, query.segmentBy);
      if (!segmentValue) continue;

      if (!segmentMap.has(segmentValue)) {
        segmentMap.set(segmentValue, {
          participants: new Set(),
          events: new Map(),
          variantData: new Map(),
        });
      }

      const segment = segmentMap.get(segmentValue)!;
      segment.participants.add(assignment.userId);

      if (!segment.variantData.has(assignment.variantId)) {
        segment.variantData.set(assignment.variantId, {
          participants: new Set(),
          events: 0,
        });
      }
      segment.variantData.get(assignment.variantId)!.participants.add(assignment.userId);
    }

    // Process events
    for (const event of events) {
      const assignment = assignments.find(a => a.userId === event.userId);
      if (!assignment) continue;

      const segmentValue = this.getSegmentValue(assignment, query.segmentBy);
      if (!segmentValue) continue;

      const segment = segmentMap.get(segmentValue);
      if (!segment) continue;

      const variantData = segment.variantData.get(event.variantId);
      if (variantData) {
        variantData.events++;
      }
    }

    // Build response
    const segments = Array.from(segmentMap.entries()).map(([segmentValue, data]) => {
      const variantResults: VariantResultDto[] = experiment.variants.map((variant: any) => {
        const variantData = data.variantData.get(variant.id);
        const sampleSize = variantData?.participants.size ?? 0;
        const conversions = variantData?.events ?? 0;

        return {
          variantId: variant.id,
          variantName: variant.name,
          isControl: variant.isControl,
          sampleSize,
          conversions,
          conversionRate: sampleSize > 0 ? conversions / sampleSize : 0,
        };
      });

      return {
        segment: segmentValue,
        participants: data.participants.size,
        variants: variantResults,
      };
    });

    // Sort by participant count descending
    segments.sort((a, b) => b.participants - a.participants);

    return {
      experimentId,
      experimentName: experiment.name,
      segmentedBy: query.segmentBy,
      segmentCount: segments.length,
      segments,
      asOf: new Date(),
    };
  }

  /**
   * Calculate statistical significance between control and treatment
   * Using two-proportion z-test
   */
  private calculateSignificance(
    control: VariantResultDto,
    treatment: VariantResultDto,
    confidenceLevel: number,
  ): Omit<VariantComparisonDto, 'variantId' | 'variantName' | 'controlId' | 'controlName'> {
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;
    const n1 = control.sampleSize;
    const n2 = treatment.sampleSize;

    // Avoid division by zero
    if (n1 === 0 || n2 === 0) {
      return {
        relativeLift: 0,
        absoluteDifference: 0,
        pValue: 1,
        isSignificant: false,
        zScore: 0,
        standardError: 0,
      };
    }

    // Pooled proportion
    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    // Z-score
    const zScore = se > 0 ? (p2 - p1) / se : 0;

    // P-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Critical z-score for confidence level
    const criticalZ = this.getZScore(confidenceLevel);

    // Relative and absolute lift
    const absoluteDifference = p2 - p1;
    const relativeLift = p1 > 0 ? (p2 - p1) / p1 : 0;

    return {
      relativeLift,
      absoluteDifference,
      pValue,
      isSignificant: Math.abs(zScore) > criticalZ,
      zScore,
      standardError: se,
    };
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    const alpha = 1 - confidenceLevel;
    // Common z-scores for quick lookup
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };

    return zScores[confidenceLevel] ?? this.inverseNormalCDF(1 - alpha / 2);
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Inverse normal CDF approximation (for z-score calculation)
   */
  private inverseNormalCDF(p: number): number {
    // Rational approximation for inverse normal CDF
    const a = [
      -3.969683028665376e1,
      2.209460984245205e2,
      -2.759285104469687e2,
      1.383577518672690e2,
      -3.066479806614716e1,
      2.506628277459239e0,
    ];

    const b = [
      -5.447609879822406e1,
      1.615858368580409e2,
      -1.556989798598866e2,
      6.680131188771972e1,
      -1.328068155288572e1,
    ];

    const c = [
      -7.784894002430293e-3,
      -3.223964580411365e-1,
      -2.400758277161838e0,
      -2.549732539343734e0,
      4.374664141464968e0,
      2.938163982698783e0,
    ];

    const d = [
      7.784695709041462e-3,
      3.224671290700398e-1,
      2.445134137142996e0,
      3.754408661907416e0,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
  }

  /**
   * Get experiment with variants
   */
  private async getExperiment(experimentId: string) {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
        metrics: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }

    return experiment;
  }

  /**
   * Build date filter for queries
   */
  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;

    const filter: any = {};
    if (startDate) {
      filter.gte = new Date(startDate);
    }
    if (endDate) {
      filter.lte = new Date(endDate);
    }

    return filter;
  }

  /**
   * Extract segment value from assignment context
   */
  private getSegmentValue(
    assignment: { context: any },
    segmentBy: SegmentationType,
  ): string | null {
    const context = assignment.context as Record<string, any>;
    if (!context) return 'unknown';

    switch (segmentBy) {
      case SegmentationType.COUNTRY:
        return context.country ?? 'unknown';
      case SegmentationType.PLAN:
        return context.plan ?? 'unknown';
      case SegmentationType.DEVICE:
        return context.device ?? 'unknown';
      case SegmentationType.BROWSER:
        return context.browser ?? 'unknown';
      case SegmentationType.OS:
        return context.os ?? 'unknown';
      case SegmentationType.SIGNUP_DATE:
        // Group by month
        if (context.signupDate) {
          const date = new Date(context.signupDate);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        return 'unknown';
      default:
        return 'unknown';
    }
  }
}
