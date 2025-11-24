import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutocompleteDto {
  @ApiProperty({ description: 'Partial search query', example: 'wire' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Maximum suggestions to return', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Category to filter suggestions', example: 'electronics' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
