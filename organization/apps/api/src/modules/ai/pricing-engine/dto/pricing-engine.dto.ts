import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsDate,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum TimeframeUnit {
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

export enum PricingStrategy {
  COMPETITIVE = 'competitive',
  PREMIUM = 'premium',
  PENETRATION = 'penetration',
  SKIMMING = 'skimming',
  DYNAMIC = 'dynamic',
}

export enum DiscountReason {
  RETENTION = 'retention',
  LOYALTY = 'loyalty',
  CART_VALUE = 'cart_value',
  FIRST_PURCHASE = 'first_purchase',
  WIN_BACK = 'win_back',
  SEASONAL = 'seasonal',
}

export enum PriceRecommendation {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  MAINTAIN = 'maintain',
}

export enum CompetitorPricePosition {
  LOWEST = 'lowest',
  BELOW_AVERAGE = 'below_average',
  COMPETITIVE = 'competitive',
  ABOVE_AVERAGE = 'above_average',
  PREMIUM = 'premium',
}

// Nested DTOs
export class TimeframeDto {
  @ApiProperty({ description: 'Duration value', example: 7 })
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({ description: 'Duration unit', enum: TimeframeUnit })
  @IsEnum(TimeframeUnit)
  unit: TimeframeUnit;
}

export class PricingConstraintsDto {
  @ApiPropertyOptional({ description: 'Minimum price allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum margin percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minMarginPercent?: number;

  @ApiPropertyOptional({ description: 'Maximum discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercent?: number;
}

export class CompetitorPriceDto {
  @ApiProperty({ description: 'Competitor name', example: 'Competitor A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Competitor price', example: 94.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Stock availability' })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Shipping cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Last updated timestamp' })
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}

// Request DTOs
export class GetOptimizedPriceDto {
  @ApiPropertyOptional({ description: 'Pricing strategy to apply', enum: PricingStrategy })
  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;

  @ApiPropertyOptional({ description: 'Pricing constraints' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingConstraintsDto)
  constraints?: PricingConstraintsDto;

  @ApiPropertyOptional({ description: 'Include competitor analysis', default: true })
  @IsOptional()
  @IsBoolean()
  includeCompetitorAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Target margin percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  targetMargin?: number;
}

export class ForecastDemandDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Forecast timeframe' })
  @ValidateNested()
  @Type(() => TimeframeDto)
  timeframe: TimeframeDto;

  @ApiPropertyOptional({ description: 'Include seasonal factors', default: true })
  @IsOptional()
  @IsBoolean()
  includeSeasonality?: boolean;

  @ApiPropertyOptional({ description: 'Include external factors (holidays, events)', default: true })
  @IsOptional()
  @IsBoolean()
  includeExternalFactors?: boolean;

  @ApiPropertyOptional({ description: 'Historical data period in days', default: 90 })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(365)
  historicalPeriod?: number;

  @ApiPropertyOptional({ description: 'Confidence level for forecast (0-1)', default: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(0.99)
  confidenceLevel?: number;
}

export class DynamicDiscountDto {
  @ApiPropertyOptional({ description: 'User ID for personalized discount' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Current cart value', example: 150.00 })
  @IsNumber()
  @Min(0)
  cartValue: number;

  @ApiPropertyOptional({ description: 'Product IDs in cart' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cartProductIds?: string[];

  @ApiPropertyOptional({ description: 'Customer segment' })
  @IsOptional()
  @IsString()
  customerSegment?: string;

  @ApiPropertyOptional({ description: 'Is first purchase', default: false })
  @IsOptional()
  @IsBoolean()
  isFirstPurchase?: boolean;

  @ApiPropertyOptional({ description: 'Days since last purchase' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daysSinceLastPurchase?: number;

  @ApiPropertyOptional({ description: 'Maximum discount percentage to offer' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercent?: number;
}

export class BulkPriceOptimizationDto {
  @ApiProperty({ description: 'Product IDs to optimize', example: ['prod_123', 'prod_456'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];

  @ApiPropertyOptional({ description: 'Pricing strategy to apply', enum: PricingStrategy })
  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;

  @ApiPropertyOptional({ description: 'Global constraints for all products' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingConstraintsDto)
  constraints?: PricingConstraintsDto;

  @ApiPropertyOptional({ description: 'Apply recommendations automatically', default: false })
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}

export class PriceHistoryQueryDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Start date for history' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for history' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Include competitor price history', default: false })
  @IsOptional()
  @IsBoolean()
  includeCompetitors?: boolean;
}

export class CompetitorPriceUpdateDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Competitor prices', type: [CompetitorPriceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorPriceDto)
  competitors: CompetitorPriceDto[];
}

export class PriceAlertDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Alert when price drops below' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPriceBelow?: number;

  @ApiPropertyOptional({ description: 'Alert when competitor price changes more than percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  competitorChangeThreshold?: number;

  @ApiPropertyOptional({ description: 'Alert when margin drops below percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  marginThreshold?: number;
}

// Response DTOs
export class PricingFactorsDto {
  @ApiProperty({ description: 'Demand factor (0.5-1.5)' })
  demand: number;

  @ApiProperty({ description: 'Competitor factor (0.5-1.5)' })
  competitor: number;

  @ApiProperty({ description: 'Inventory factor (0.5-1.5)' })
  inventory: number;

  @ApiPropertyOptional({ description: 'Seasonality factor' })
  seasonality?: number;

  @ApiPropertyOptional({ description: 'Time-of-day factor' })
  timeOfDay?: number;
}

export class OptimizedPriceResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Current base price' })
  basePrice: number;

  @ApiProperty({ description: 'AI-optimized price' })
  optimalPrice: number;

  @ApiProperty({ description: 'Pricing factors used' })
  factors: PricingFactorsDto;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'Price recommendation', enum: PriceRecommendation })
  recommendation: PriceRecommendation;

  @ApiPropertyOptional({ description: 'Expected impact on sales' })
  expectedImpact?: {
    salesChangePercent: number;
    revenueChangePercent: number;
    marginChangePercent: number;
  };
}

export class DemandForecastItemDto {
  @ApiProperty({ description: 'Forecast date' })
  date: string;

  @ApiProperty({ description: 'Expected sales units' })
  expectedSales: number;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiPropertyOptional({ description: 'Lower bound (confidence interval)' })
  lowerBound?: number;

  @ApiPropertyOptional({ description: 'Upper bound (confidence interval)' })
  upperBound?: number;
}

export class DemandForecastResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Forecast timeframe' })
  timeframe: TimeframeDto;

  @ApiProperty({ description: 'Daily forecast data', type: [DemandForecastItemDto] })
  forecast: DemandForecastItemDto[];

  @ApiProperty({ description: 'Forecasting algorithm used' })
  algorithm: string;

  @ApiPropertyOptional({ description: 'Seasonal factors detected' })
  seasonalFactors?: {
    dayOfWeek: Record<string, number>;
    monthOfYear: Record<string, number>;
  };

  @ApiPropertyOptional({ description: 'External factors considered' })
  externalFactors?: Array<{
    name: string;
    impact: number;
    date?: string;
  }>;
}

export class CompetitorAnalysisResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Competitor prices', type: [CompetitorPriceDto] })
  competitors: CompetitorPriceDto[];

  @ApiProperty({ description: 'Price analysis' })
  analysis: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    pricePosition: CompetitorPricePosition;
    percentileRank: number;
  };

  @ApiProperty({ description: 'Pricing recommendation' })
  recommendation: string;

  @ApiPropertyOptional({ description: 'Suggested price range' })
  suggestedPriceRange?: {
    min: number;
    max: number;
    optimal: number;
  };
}

export class PersonalizedDiscountResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  productId?: string;

  @ApiProperty({ description: 'Discount details' })
  discount: {
    percentage: number;
    reason: DiscountReason;
    expiresIn: number;
    code?: string;
  };

  @ApiProperty({ description: 'Factors considered for discount' })
  factors: {
    customerLifetimeValue: number;
    abandonmentRisk: number;
    cartValue: number;
    purchaseHistory?: {
      totalOrders: number;
      totalSpent: number;
      daysSinceLastPurchase: number;
    };
  };
}

export class BulkPriceOptimizationResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Number of products processed' })
  processedCount: number;

  @ApiProperty({ description: 'Optimization results by product' })
  results: Array<{
    productId: string;
    currentPrice: number;
    optimizedPrice: number;
    recommendation: PriceRecommendation;
    confidence: number;
  }>;

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    averagePriceChange: number;
    productsToIncrease: number;
    productsToDecrease: number;
    productsToMaintain: number;
    estimatedRevenueImpact: number;
  };
}

export class PriceHistoryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Price history data' })
  history: Array<{
    date: string;
    price: number;
    salesVolume?: number;
    revenue?: number;
  }>;

  @ApiPropertyOptional({ description: 'Competitor price history' })
  competitorHistory?: Array<{
    competitor: string;
    history: Array<{
      date: string;
      price: number;
    }>;
  }>;

  @ApiProperty({ description: 'Price statistics' })
  statistics: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    priceVolatility: number;
  };
}

export class PriceAlertResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Alert ID' })
  alertId: string;

  @ApiProperty({ description: 'Alert configuration' })
  alert: PriceAlertDto;

  @ApiProperty({ description: 'Alert status' })
  status: 'active' | 'triggered' | 'expired';
}
