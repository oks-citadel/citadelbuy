import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Review DTOs
export class CreateReviewDto {
  @ApiProperty({ description: 'Product or entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Entity type' })
  @IsString()
  entityType: 'product' | 'order' | 'vendor' | 'service';

  @ApiProperty({ description: 'Rating (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Review content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Pros' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pros?: string[];

  @ApiPropertyOptional({ description: 'Cons' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cons?: string[];

  @ApiPropertyOptional({ description: 'Image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Verified purchase' })
  @IsOptional()
  @IsBoolean()
  verifiedPurchase?: boolean;
}

export class ReviewResponseDto {
  @ApiProperty({ description: 'Review ID' })
  @IsString()
  reviewId: string;

  @ApiProperty({ description: 'Response content' })
  @IsString()
  content: string;
}

// Testimonial DTOs
export class CreateTestimonialDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ description: 'Customer title/role' })
  @IsOptional()
  @IsString()
  customerTitle?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Testimonial content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Customer photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Featured testimonial' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

// NPS/CSAT Survey DTOs
export enum SurveyType {
  NPS = 'NPS',
  CSAT = 'CSAT',
  CES = 'CES',
  CUSTOM = 'CUSTOM',
}

export class CreateSurveyDto {
  @ApiProperty({ description: 'Survey name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: SurveyType })
  @IsEnum(SurveyType)
  type: SurveyType;

  @ApiPropertyOptional({ description: 'Survey question' })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ description: 'Follow-up questions' })
  @IsOptional()
  @IsArray()
  followUpQuestions?: Array<{
    condition?: string;
    question: string;
    type: 'text' | 'rating' | 'choice';
  }>;

  @ApiPropertyOptional({ description: 'Trigger event' })
  @IsOptional()
  @IsString()
  triggerEvent?: string;

  @ApiPropertyOptional({ description: 'Delay after trigger (hours)' })
  @IsOptional()
  @IsNumber()
  triggerDelay?: number;
}

export class SubmitSurveyResponseDto {
  @ApiProperty({ description: 'Survey ID' })
  @IsString()
  surveyId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Score' })
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional({ description: 'Feedback text' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Follow-up responses' })
  @IsOptional()
  @IsArray()
  followUpResponses?: Array<{ questionId: string; answer: any }>;
}

// Trust Badge DTOs
export class CreateTrustBadgeDto {
  @ApiProperty({ description: 'Badge name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Badge type' })
  @IsString()
  type: 'security' | 'payment' | 'shipping' | 'quality' | 'certification' | 'custom';

  @ApiPropertyOptional({ description: 'Badge icon URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Badge description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Link URL' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Min rating' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Verified only' })
  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Sort by' })
  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
