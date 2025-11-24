import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Electronics',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for the category',
    example: 'electronics',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All electronic devices and gadgets',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
