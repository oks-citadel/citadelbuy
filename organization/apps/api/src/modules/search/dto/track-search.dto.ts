import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchSource } from '@prisma/client';

export class TrackSearchDto {
  @ApiPropertyOptional({ description: 'User ID (optional for guests)', example: 'user-123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID for tracking', example: 'session-abc' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Search query', example: 'wireless headphones' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Applied filters', example: { categoryId: 'electronics' } })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ description: 'Number of results returned', example: 25 })
  @IsNumber()
  resultsCount: number;

  @ApiPropertyOptional({ description: 'Product IDs that were clicked', example: ['prod-1', 'prod-2'] })
  @IsOptional()
  @IsArray()
  clickedItems?: string[];

  @ApiPropertyOptional({ description: 'Whether search led to purchase', example: false })
  @IsOptional()
  @IsBoolean()
  converted?: boolean;

  @ApiPropertyOptional({ description: 'Search source', enum: SearchSource, example: 'SEARCH_BAR' })
  @IsOptional()
  @IsEnum(SearchSource)
  source?: SearchSource;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { position: 'header' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
