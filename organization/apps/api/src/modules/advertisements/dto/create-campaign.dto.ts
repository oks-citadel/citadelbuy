import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Total budget for campaign', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalBudget: number;

  @ApiPropertyOptional({ description: 'Daily spending limit', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyBudget?: number;

  @ApiProperty({ description: 'Campaign start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Campaign end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
