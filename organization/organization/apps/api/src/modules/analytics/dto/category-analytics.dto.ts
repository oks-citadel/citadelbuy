import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeRange } from './analytics-query.dto';

export enum CategoryEventType {
  VIEW = 'VIEW',
  PRODUCT_CLICK = 'PRODUCT_CLICK',
  FILTER_APPLIED = 'FILTER_APPLIED',
  SORT_CHANGED = 'SORT_CHANGED',
  ADD_TO_CART = 'ADD_TO_CART',
  PURCHASE = 'PURCHASE',
}

export class TrackCategoryEventDto {
  @ApiPropertyOptional({ description: 'Category ID' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Event type',
    enum: CategoryEventType
  })
  @IsEnum(CategoryEventType)
  eventType: CategoryEventType;

  @ApiPropertyOptional({ description: 'Product ID (for product-related events)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'User ID (if authenticated)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CategoryAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Time range for analytics',
    enum: TimeRange,
    default: TimeRange.MONTH,
  })
  @IsOptional()
  @IsEnum(TimeRange)
  range?: TimeRange;

  @ApiPropertyOptional({
    description: 'Start date for custom range (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom range (ISO 8601)',
    example: '2025-01-31',
  })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Category ID for specific category analytics',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Limit for top results',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CategoryPerformanceDto {
  categoryId: string;
  categoryName: string;
  categorySlug: string;

  // Traffic Metrics
  totalViews: number;
  uniqueVisitors: number;
  averageTimeOnPage?: number;
  bounceRate?: number;

  // Product Metrics
  productImpressions: number;
  productClicks: number;
  clickThroughRate: number;

  // Conversion Metrics
  addToCartCount: number;
  purchaseCount: number;
  conversionRate: number;
  averageOrderValue: number;
  totalRevenue: number;

  // Filter Usage
  filterUsageCount?: number;
  topFiltersUsed?: Array<{ filter: string; count: number }>;

  // Time-based comparison
  periodStart: string;
  periodEnd: string;
  comparisonMetrics?: {
    viewsChange: number;
    conversionChange: number;
    revenueChange: number;
  };
}

export class CategoryFunnelDto {
  categoryId: string;
  categoryName: string;

  // Funnel stages
  views: number;
  productClicks: number;
  addToCarts: number;
  purchases: number;

  // Conversion rates between stages
  viewToClickRate: number;
  clickToCartRate: number;
  cartToPurchaseRate: number;
  overallConversionRate: number;

  // Drop-off analysis
  viewDropOff: number;
  clickDropOff: number;
  cartDropOff: number;
}

export class CategoryComparisonDto {
  categories: Array<{
    categoryId: string;
    categoryName: string;
    views: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    averageOrderValue: number;
  }>;

  topPerformer: string;
  bottomPerformer: string;
  averageConversionRate: number;
}
