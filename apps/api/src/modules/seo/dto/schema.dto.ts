import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, IsUrl, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SchemaType {
  PRODUCT = 'Product',
  ORGANIZATION = 'Organization',
  LOCAL_BUSINESS = 'LocalBusiness',
  WEBSITE = 'WebSite',
  WEBPAGE = 'WebPage',
  BREADCRUMB_LIST = 'BreadcrumbList',
  FAQ = 'FAQPage',
  ARTICLE = 'Article',
  BLOG_POSTING = 'BlogPosting',
  NEWS_ARTICLE = 'NewsArticle',
  REVIEW = 'Review',
  AGGREGATE_RATING = 'AggregateRating',
  OFFER = 'Offer',
  ITEM_LIST = 'ItemList',
  HOW_TO = 'HowTo',
  EVENT = 'Event',
  VIDEO_OBJECT = 'VideoObject',
  IMAGE_OBJECT = 'ImageObject',
  PERSON = 'Person',
  COLLECTION_PAGE = 'CollectionPage',
  SEARCH_ACTION = 'SearchAction',
}

export class SchemaOfferDto {
  @ApiProperty({ description: 'Price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsString()
  priceCurrency: string;

  @ApiPropertyOptional({ description: 'Availability status' })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({ description: 'Item condition' })
  @IsOptional()
  @IsString()
  itemCondition?: string;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsString()
  priceValidUntil?: string;

  @ApiPropertyOptional({ description: 'Seller organization' })
  @IsOptional()
  @IsObject()
  seller?: Record<string, any>;

  @ApiPropertyOptional({ description: 'URL to the offer' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class SchemaRatingDto {
  @ApiProperty({ description: 'Rating value' })
  @IsNumber()
  @Min(0)
  @Max(5)
  ratingValue: number;

  @ApiPropertyOptional({ description: 'Best rating', default: 5 })
  @IsOptional()
  @IsNumber()
  bestRating?: number;

  @ApiPropertyOptional({ description: 'Worst rating', default: 1 })
  @IsOptional()
  @IsNumber()
  worstRating?: number;

  @ApiPropertyOptional({ description: 'Review count' })
  @IsOptional()
  @IsNumber()
  reviewCount?: number;

  @ApiPropertyOptional({ description: 'Rating count' })
  @IsOptional()
  @IsNumber()
  ratingCount?: number;
}

export class SchemaReviewDto {
  @ApiProperty({ description: 'Review author name' })
  @IsString()
  author: string;

  @ApiProperty({ description: 'Review text/body' })
  @IsString()
  reviewBody: string;

  @ApiPropertyOptional({ description: 'Review rating' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SchemaRatingDto)
  reviewRating?: SchemaRatingDto;

  @ApiPropertyOptional({ description: 'Date published' })
  @IsOptional()
  @IsString()
  datePublished?: string;
}

export class SchemaBreadcrumbItemDto {
  @ApiProperty({ description: 'Position in the list (1-indexed)' })
  @IsNumber()
  @Min(1)
  position: number;

  @ApiProperty({ description: 'Name of the breadcrumb item' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'URL of the breadcrumb item' })
  @IsOptional()
  @IsUrl()
  item?: string;
}

export class SchemaFAQItemDto {
  @ApiProperty({ description: 'Question' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Answer' })
  @IsString()
  answer: string;
}

export class GenerateProductSchemaDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Product image URLs', type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({ description: 'Product offer details' })
  @ValidateNested()
  @Type(() => SchemaOfferDto)
  offer: SchemaOfferDto;

  @ApiPropertyOptional({ description: 'Product SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Product MPN (Manufacturer Part Number)' })
  @IsOptional()
  @IsString()
  mpn?: string;

  @ApiPropertyOptional({ description: 'Product GTIN/UPC/EAN' })
  @IsOptional()
  @IsString()
  gtin?: string;

  @ApiPropertyOptional({ description: 'Brand name' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Product category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Aggregate rating' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SchemaRatingDto)
  aggregateRating?: SchemaRatingDto;

  @ApiPropertyOptional({ description: 'Product reviews', type: [SchemaReviewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaReviewDto)
  reviews?: SchemaReviewDto[];

  @ApiPropertyOptional({ description: 'Product URL' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class GenerateOrganizationSchemaDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Organization logo URL' })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Social media profile URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  sameAs?: string[];

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsObject()
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
}

export class GenerateBreadcrumbSchemaDto {
  @ApiProperty({ description: 'Breadcrumb items', type: [SchemaBreadcrumbItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaBreadcrumbItemDto)
  items: SchemaBreadcrumbItemDto[];
}

export class GenerateFAQSchemaDto {
  @ApiProperty({ description: 'FAQ items', type: [SchemaFAQItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchemaFAQItemDto)
  items: SchemaFAQItemDto[];
}

export class GenerateArticleSchemaDto {
  @ApiProperty({ description: 'Article headline' })
  @IsString()
  headline: string;

  @ApiProperty({ description: 'Article description/summary' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Article author name' })
  @IsString()
  author: string;

  @ApiProperty({ description: 'Date published' })
  @IsString()
  datePublished: string;

  @ApiPropertyOptional({ description: 'Date modified' })
  @IsOptional()
  @IsString()
  dateModified?: string;

  @ApiPropertyOptional({ description: 'Article image URL' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ description: 'Publisher name' })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ description: 'Publisher logo URL' })
  @IsOptional()
  @IsUrl()
  publisherLogo?: string;

  @ApiPropertyOptional({ description: 'Main entity of page URL' })
  @IsOptional()
  @IsUrl()
  mainEntityOfPage?: string;

  @ApiPropertyOptional({ description: 'Word count' })
  @IsOptional()
  @IsNumber()
  wordCount?: number;

  @ApiPropertyOptional({ description: 'Article body' })
  @IsOptional()
  @IsString()
  articleBody?: string;

  @ApiPropertyOptional({ description: 'Article type (Article, BlogPosting, NewsArticle)', enum: [SchemaType.ARTICLE, SchemaType.BLOG_POSTING, SchemaType.NEWS_ARTICLE] })
  @IsOptional()
  @IsEnum(SchemaType)
  type?: SchemaType;
}

export class GenerateSchemaDto {
  @ApiProperty({ description: 'Schema type to generate', enum: SchemaType })
  @IsEnum(SchemaType)
  type: SchemaType;

  @ApiProperty({ description: 'Schema data based on the type' })
  @IsObject()
  data: Record<string, any>;
}

export class ValidateSchemaDto {
  @ApiProperty({ description: 'JSON-LD schema to validate' })
  @IsObject()
  schema: Record<string, any>;
}

export class SchemaValidationResultDto {
  @ApiProperty({ description: 'Is the schema valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  errors?: string[];

  @ApiPropertyOptional({ description: 'Validation warnings', type: [String] })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Detected schema types', type: [String] })
  detectedTypes?: string[];
}
