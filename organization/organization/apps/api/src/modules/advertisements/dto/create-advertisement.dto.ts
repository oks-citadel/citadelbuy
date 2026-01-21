import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdType } from '@prisma/client';

export class CreateAdvertisementDto {
  @ApiProperty({ description: 'Campaign ID this ad belongs to' })
  @IsUUID()
  @IsNotEmpty()
  campaignId: string;

  @ApiPropertyOptional({ description: 'Product ID for sponsored product ads' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ enum: AdType, description: 'Advertisement type' })
  @IsEnum(AdType)
  type: AdType;

  @ApiProperty({ description: 'Ad title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Ad description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ad image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Target landing page URL' })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiProperty({ description: 'Cost per click bid amount', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  bidAmount: number;

  @ApiPropertyOptional({ description: 'Daily budget for this ad', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyBudget?: number;

  @ApiPropertyOptional({
    description: 'Target category IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetCategories?: string[];

  @ApiPropertyOptional({
    description: 'Target keywords for search ads',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Target locations (country codes)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetLocations?: string[];

  @ApiProperty({ description: 'Ad start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Ad end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
