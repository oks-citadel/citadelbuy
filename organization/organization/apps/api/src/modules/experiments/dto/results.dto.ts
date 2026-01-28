import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SegmentationType {
  COUNTRY = 'country',
  PLAN = 'plan',
  DEVICE = 'device',
  BROWSER = 'browser',
  OS = 'os',
  SIGNUP_DATE = 'signup_date',
}

export class ResultsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Specific metric key to analyze' })
  @IsOptional()
  @IsString()
  metricKey?: string;
}

export class SegmentResultsQueryDto extends ResultsQueryDto {
  @ApiProperty({
    description: 'Segmentation attribute',
    enum: SegmentationType,
    example: SegmentationType.COUNTRY,
  })
  @IsEnum(SegmentationType)
  segmentBy: SegmentationType;
}

export class SignificanceQueryDto extends ResultsQueryDto {
  @ApiPropertyOptional({
    description: 'Confidence level (0-1)',
    example: 0.95,
    default: 0.95,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(0.99)
  confidenceLevel?: number = 0.95;

  @ApiPropertyOptional({
    description: 'Minimum sample size per variant',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  minimumSampleSize?: number = 100;
}

export class VariantResultDto {
  @ApiProperty()
  variantId: string;

  @ApiProperty()
  variantName: string;

  @ApiProperty()
  isControl: boolean;

  @ApiProperty({ description: 'Number of users assigned' })
  sampleSize: number;

  @ApiProperty({ description: 'Number of conversions/events' })
  conversions: number;

  @ApiProperty({ description: 'Conversion rate (0-1)' })
  conversionRate: number;

  @ApiPropertyOptional({ description: 'Sum of event values (for revenue metrics)' })
  totalValue?: number;

  @ApiPropertyOptional({ description: 'Average value per conversion' })
  averageValue?: number;
}

export class ExperimentResultsDto {
  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  experimentName: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ description: 'Total participants in experiment' })
  totalParticipants: number;

  @ApiProperty({ description: 'Total events tracked' })
  totalEvents: number;

  @ApiProperty({
    description: 'Results per variant',
    type: [VariantResultDto],
  })
  variants: VariantResultDto[];

  @ApiProperty({ description: 'Data as of timestamp' })
  asOf: Date;

  @ApiPropertyOptional({ description: 'Date range start' })
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Date range end' })
  endDate?: Date;
}

export class StatisticalSignificanceDto {
  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  metricKey: string;

  @ApiProperty()
  metricName: string;

  @ApiProperty({ description: 'Confidence level used (0-1)' })
  confidenceLevel: number;

  @ApiProperty({
    description: 'Statistical significance results per variant comparison',
    type: [Object],
  })
  comparisons: VariantComparisonDto[];

  @ApiProperty({ description: 'Is experiment ready for conclusion?' })
  isSignificant: boolean;

  @ApiProperty({ description: 'Recommended action' })
  recommendation: string;

  @ApiProperty({ description: 'Data as of timestamp' })
  asOf: Date;
}

export class VariantComparisonDto {
  @ApiProperty()
  variantId: string;

  @ApiProperty()
  variantName: string;

  @ApiProperty()
  controlId: string;

  @ApiProperty()
  controlName: string;

  @ApiProperty({ description: 'Relative lift vs control (percentage)' })
  relativeLift: number;

  @ApiProperty({ description: 'Absolute difference vs control' })
  absoluteDifference: number;

  @ApiProperty({ description: 'P-value (lower = more significant)' })
  pValue: number;

  @ApiProperty({ description: 'Is statistically significant?' })
  isSignificant: boolean;

  @ApiProperty({ description: 'Z-score' })
  zScore: number;

  @ApiProperty({ description: 'Standard error' })
  standardError: number;
}

export class ConfidenceIntervalDto {
  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  metricKey: string;

  @ApiProperty({ description: 'Confidence level used (0-1)' })
  confidenceLevel: number;

  @ApiProperty({
    description: 'Confidence intervals per variant',
    type: [Object],
  })
  intervals: VariantConfidenceIntervalDto[];

  @ApiProperty({ description: 'Data as of timestamp' })
  asOf: Date;
}

export class VariantConfidenceIntervalDto {
  @ApiProperty()
  variantId: string;

  @ApiProperty()
  variantName: string;

  @ApiProperty()
  isControl: boolean;

  @ApiProperty({ description: 'Point estimate (mean)' })
  mean: number;

  @ApiProperty({ description: 'Lower bound of confidence interval' })
  lowerBound: number;

  @ApiProperty({ description: 'Upper bound of confidence interval' })
  upperBound: number;

  @ApiProperty({ description: 'Standard deviation' })
  standardDeviation: number;

  @ApiProperty({ description: 'Sample size' })
  sampleSize: number;
}

export class SegmentResultDto {
  @ApiProperty({ description: 'Segment value', example: 'US' })
  segment: string;

  @ApiProperty({ description: 'Number of participants in segment' })
  participants: number;

  @ApiProperty({
    description: 'Results per variant for this segment',
    type: [VariantResultDto],
  })
  variants: VariantResultDto[];
}

export class SegmentedResultsDto {
  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  experimentName: string;

  @ApiProperty({ enum: SegmentationType })
  segmentedBy: SegmentationType;

  @ApiProperty({ description: 'Total segments found' })
  segmentCount: number;

  @ApiProperty({
    description: 'Results per segment',
    type: [SegmentResultDto],
  })
  segments: SegmentResultDto[];

  @ApiProperty({ description: 'Data as of timestamp' })
  asOf: Date;
}
