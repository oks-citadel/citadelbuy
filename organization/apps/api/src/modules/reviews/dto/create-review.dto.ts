import { IsString, IsInt, Min, Max, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Product ID being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must be at most 5' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Great product! Highly recommended.',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Comment must be at least 10 characters long' })
  comment?: string;
}
