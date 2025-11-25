import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommissionRuleDto {
  @ApiProperty({
    description: 'Rule name/description',
    example: 'Electronics Category Premium Rate',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Commission rate percentage (0-100)',
    example: 15.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @ApiPropertyOptional({
    description: 'Category ID this rule applies to',
    example: 'cat_123456',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Minimum order value for rule to apply',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum order value for rule to apply',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Minimum commission amount',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minCommission?: number;

  @ApiPropertyOptional({
    description: 'Maximum commission amount',
    example: 500,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCommission?: number;

  @ApiPropertyOptional({
    description: 'Rule priority (higher = more priority)',
    example: 10,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Rule start date',
    example: '2025-11-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Rule end date',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Whether rule is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCommissionRuleDto {
  @ApiPropertyOptional({
    description: 'Rule name/description',
    example: 'Electronics Category Premium Rate',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Commission rate percentage (0-100)',
    example: 15.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional({
    description: 'Category ID this rule applies to',
    example: 'cat_123456',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Minimum order value for rule to apply',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum order value for rule to apply',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Minimum commission amount',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minCommission?: number;

  @ApiPropertyOptional({
    description: 'Maximum commission amount',
    example: 500,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCommission?: number;

  @ApiPropertyOptional({
    description: 'Rule priority (higher = more priority)',
    example: 10,
  })
  @IsInt()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Rule start date',
    example: '2025-11-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Rule end date',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Whether rule is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
