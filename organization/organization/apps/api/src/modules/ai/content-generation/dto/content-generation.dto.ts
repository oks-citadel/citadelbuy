import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  LUXURY = 'luxury',
  TECHNICAL = 'technical',
  FRIENDLY = 'friendly',
  PERSUASIVE = 'persuasive',
}

export enum DescriptionStyle {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
}

export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  PINTEREST = 'pinterest',
  TIKTOK = 'tiktok',
  LINKEDIN = 'linkedin',
}

export enum CampaignType {
  LAUNCH = 'launch',
  SALE = 'sale',
  FEATURE = 'feature',
  TESTIMONIAL = 'testimonial',
  SEASONAL = 'seasonal',
}

export enum EmailType {
  WELCOME = 'welcome',
  ABANDONED_CART = 'abandoned_cart',
  PROMOTION = 'promotion',
  RESTOCK = 'restock',
  RECOMMENDATION = 'recommendation',
  ORDER_CONFIRMATION = 'order_confirmation',
  SHIPPING_UPDATE = 'shipping_update',
}

export enum ContentType {
  PRODUCT = 'product',
  CATEGORY = 'category',
  BLOG = 'blog',
  LANDING = 'landing',
}

// Nested DTOs
export class ProductSpecificationsDto {
  @ApiPropertyOptional({ description: 'Material', example: '100% Cotton' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'Dimensions' })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, string | number>;

  @ApiPropertyOptional({ description: 'Weight', example: '250g' })
  @IsOptional()
  @IsString()
  weight?: string;

  @ApiPropertyOptional({ description: 'Color options' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: 'Additional specifications' })
  @IsOptional()
  @IsObject()
  additional?: Record<string, any>;
}

export class ReviewDataDto {
  @ApiProperty({ description: 'Review rating (1-5)', example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review content text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Helpful votes count', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  helpful?: number;
}

export class CartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class RecommendedProductDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class RecipientDataDto {
  @ApiPropertyOptional({ description: 'Recipient name', example: 'John' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Cart items for abandoned cart emails' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems?: CartItemDto[];

  @ApiPropertyOptional({ description: 'Recommended products' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedProductDto)
  recommendedProducts?: RecommendedProductDto[];

  @ApiPropertyOptional({ description: 'Discount amount in percentage', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Discount code' })
  @IsOptional()
  @IsString()
  discountCode?: string;
}

export class TopProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Product price' })
  @IsNumber()
  @Min(0)
  price: number;
}

// Request DTOs
export class GenerateProductDescriptionDto {
  @ApiProperty({ description: 'Product name', example: 'Premium Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Product category', example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Key product features' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Product specifications' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSpecificationsDto)
  specifications?: ProductSpecificationsDto;

  @ApiPropertyOptional({ description: 'Target audience', example: 'Tech-savvy professionals' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Content tone', enum: ContentTone, default: ContentTone.PROFESSIONAL })
  @IsOptional()
  @IsEnum(ContentTone)
  tone?: ContentTone;

  @ApiPropertyOptional({ description: 'Target keywords for SEO' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Maximum character count' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(5000)
  maxLength?: number;
}

export class GenerateVariantDescriptionsDto {
  @ApiProperty({ description: 'Product name', example: 'Premium Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Base description to create variants from' })
  @IsString()
  @IsNotEmpty()
  baseDescription: string;

  @ApiProperty({ description: 'Number of variants to generate', example: 3 })
  @IsNumber()
  @Min(1)
  @Max(10)
  variantCount: number;

  @ApiPropertyOptional({ description: 'Description style/length', enum: DescriptionStyle })
  @IsOptional()
  @IsEnum(DescriptionStyle)
  style?: DescriptionStyle;

  @ApiPropertyOptional({ description: 'Different tones for variants' })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentTone, { each: true })
  tones?: ContentTone[];
}

export class ImageEnhancementOptionsDto {
  @ApiPropertyOptional({ description: 'Remove image background', default: false })
  @IsOptional()
  @IsBoolean()
  removeBackground?: boolean;

  @ApiPropertyOptional({ description: 'Upscale image resolution', default: false })
  @IsOptional()
  @IsBoolean()
  upscale?: boolean;

  @ApiPropertyOptional({ description: 'Auto-adjust brightness and contrast', default: false })
  @IsOptional()
  @IsBoolean()
  autoAdjust?: boolean;

  @ApiPropertyOptional({ description: 'Target width for resize' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  targetWidth?: number;

  @ApiPropertyOptional({ description: 'Target height for resize' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  targetHeight?: number;

  @ApiPropertyOptional({ description: 'Output format', example: 'png' })
  @IsOptional()
  @IsString()
  outputFormat?: string;
}

export class SummarizeReviewsDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Reviews to summarize', type: [ReviewDataDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReviewDataDto)
  reviews: ReviewDataDto[];

  @ApiPropertyOptional({ description: 'Include sentiment analysis', default: true })
  @IsOptional()
  @IsBoolean()
  includeSentiment?: boolean;

  @ApiPropertyOptional({ description: 'Extract key topics/themes', default: true })
  @IsOptional()
  @IsBoolean()
  extractTopics?: boolean;
}

export class GenerateSocialContentDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Product name', example: 'Premium Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Target platform', enum: SocialPlatform })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiPropertyOptional({ description: 'Campaign type', enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaignType?: CampaignType;

  @ApiPropertyOptional({ description: 'Product price for promotional content' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Discount percentage if applicable' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Call-to-action text' })
  @IsOptional()
  @IsString()
  callToAction?: string;

  @ApiPropertyOptional({ description: 'Include hashtags', default: true })
  @IsOptional()
  @IsBoolean()
  includeHashtags?: boolean;
}

export class GenerateEmailContentDto {
  @ApiProperty({ description: 'Email type', enum: EmailType })
  @IsEnum(EmailType)
  emailType: EmailType;

  @ApiProperty({ description: 'Recipient data for personalization' })
  @ValidateNested()
  @Type(() => RecipientDataDto)
  recipientData: RecipientDataDto;

  @ApiPropertyOptional({ description: 'Subject line customization' })
  @IsOptional()
  @IsString()
  customSubject?: string;

  @ApiPropertyOptional({ description: 'Brand name for personalization' })
  @IsOptional()
  @IsString()
  brandName?: string;
}

export class SeoOptimizeContentDto {
  @ApiProperty({ description: 'Content to optimize' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Target keywords', example: ['wireless headphones', 'bluetooth audio'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetKeywords: string[];

  @ApiProperty({ description: 'Content type', enum: ContentType })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiPropertyOptional({ description: 'Target keyword density (percentage)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5)
  targetDensity?: number;
}

export class GenerateMetaTagsDto {
  @ApiProperty({ description: 'Product name', example: 'Premium Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Product category', example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Product description for meta' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Brand name' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Target keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class GenerateCategoryDescriptionDto {
  @ApiProperty({ description: 'Category name', example: 'Wireless Audio' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiPropertyOptional({ description: 'Subcategories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategories?: string[];

  @ApiPropertyOptional({ description: 'Top products in category' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopProductDto)
  topProducts?: TopProductDto[];

  @ApiPropertyOptional({ description: 'Content tone', enum: ContentTone })
  @IsOptional()
  @IsEnum(ContentTone)
  tone?: ContentTone;
}

// Response DTOs
export class ProductDescriptionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated description' })
  description: string;

  @ApiProperty({ description: 'Short description/tagline' })
  shortDescription: string;

  @ApiProperty({ description: 'Bullet point features' })
  bulletPoints: string[];

  @ApiProperty({ description: 'SEO-optimized title' })
  seoTitle: string;

  @ApiProperty({ description: 'Generation metadata' })
  metadata: {
    wordCount: number;
    characterCount: number;
    readabilityScore: number;
    tone: ContentTone;
  };
}

export class VariantDescriptionsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated description variants' })
  variants: Array<{
    description: string;
    style: DescriptionStyle;
    tone: ContentTone;
    wordCount: number;
  }>;
}

export class ImageEnhancementResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Enhanced image URL' })
  enhancedImageUrl: string;

  @ApiProperty({ description: 'Original image URL' })
  originalImageUrl: string;

  @ApiProperty({ description: 'Applied enhancements' })
  enhancements: string[];

  @ApiProperty({ description: 'Image dimensions' })
  dimensions: {
    width: number;
    height: number;
  };
}

export class ReviewSummaryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Summary of reviews' })
  summary: string;

  @ApiProperty({ description: 'Sentiment analysis' })
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    positiveCount: number;
    negativeCount: number;
  };

  @ApiProperty({ description: 'Key topics extracted from reviews' })
  topics: Array<{
    topic: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    mentionCount: number;
  }>;

  @ApiProperty({ description: 'Common pros mentioned' })
  pros: string[];

  @ApiProperty({ description: 'Common cons mentioned' })
  cons: string[];
}

export class SocialContentResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated social media content' })
  content: {
    text: string;
    hashtags: string[];
    characterCount: number;
  };

  @ApiProperty({ description: 'Platform-specific formatting applied' })
  platform: SocialPlatform;

  @ApiProperty({ description: 'Suggested posting time' })
  suggestedPostTime: string;
}

export class EmailContentResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Email subject line' })
  subject: string;

  @ApiProperty({ description: 'Email preview text' })
  previewText: string;

  @ApiProperty({ description: 'Email HTML body' })
  htmlBody: string;

  @ApiProperty({ description: 'Email plain text body' })
  textBody: string;

  @ApiProperty({ description: 'Email type' })
  emailType: EmailType;
}

export class SeoOptimizationResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Optimized content' })
  optimizedContent: string;

  @ApiProperty({ description: 'SEO analysis' })
  analysis: {
    keywordDensity: Record<string, number>;
    readabilityScore: number;
    suggestions: string[];
  };

  @ApiProperty({ description: 'Original vs optimized comparison' })
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    description: string;
  }>;
}

export class MetaTagsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated meta title' })
  title: string;

  @ApiProperty({ description: 'Generated meta description' })
  description: string;

  @ApiProperty({ description: 'Meta keywords' })
  keywords: string[];

  @ApiProperty({ description: 'Open Graph tags' })
  openGraph: {
    title: string;
    description: string;
    type: string;
  };

  @ApiProperty({ description: 'Twitter card tags' })
  twitterCard: {
    card: string;
    title: string;
    description: string;
  };
}

export class CategoryDescriptionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Generated category description' })
  description: string;

  @ApiProperty({ description: 'SEO meta description' })
  metaDescription: string;

  @ApiProperty({ description: 'Category tagline' })
  tagline: string;
}
