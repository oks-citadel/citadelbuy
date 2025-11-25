import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Search name', example: 'Wireless Headphones under $100' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Search query', example: 'wireless headphones' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Applied filters', example: { maxPrice: 100 } })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notify when new items match', example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean = false;
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional({ description: 'Search name', example: 'Premium Headphones' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Search query', example: 'premium headphones' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Applied filters', example: { minRating: 4 } })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notify when new items match', example: false })
  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}
