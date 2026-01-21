import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsNumber, Min, Max, IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchByImageUrlDto {
  @ApiProperty({ description: 'URL of the image to search with' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Maximum number of results to return', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Minimum similarity threshold (0-1)', default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minSimilarity?: number = 0.5;

  @ApiPropertyOptional({ description: 'Category ID to filter results' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class FindSimilarProductsDto {
  @ApiProperty({ description: 'Product ID to find similar products for' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Maximum number of results to return', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Include products from same category only', default: false })
  @IsOptional()
  sameCategoryOnly?: boolean = false;
}

export class ExtractFeaturesDto {
  @ApiPropertyOptional({ description: 'URL of the image to extract features from' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class VisualSearchResultDto {
  @ApiProperty({ description: 'Whether the search was successful' })
  success: boolean;

  @ApiProperty({ description: 'Detected labels/tags from the image' })
  labels: ImageLabel[];

  @ApiProperty({ description: 'Dominant colors in the image' })
  dominantColors: DominantColor[];

  @ApiProperty({ description: 'Similar products found' })
  similarProducts: SimilarProduct[];

  @ApiProperty({ description: 'Metadata about the search' })
  metadata: SearchMetadata;
}

export class ImageLabel {
  @ApiProperty({ description: 'Label name' })
  name: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;
}

export class DominantColor {
  @ApiProperty({ description: 'Hex color code' })
  hex: string;

  @ApiProperty({ description: 'Color name' })
  name: string;

  @ApiProperty({ description: 'Percentage of image this color occupies' })
  percentage: number;
}

export class SimilarProduct {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Product images' })
  images: string[];

  @ApiProperty({ description: 'Similarity score (0-1)' })
  similarity: number;

  @ApiPropertyOptional({ description: 'Category information' })
  category?: {
    id: string;
    name: string;
  };
}

export class SearchMetadata {
  @ApiProperty({ description: 'Image dimensions' })
  imageDimensions?: { width: number; height: number };

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;

  @ApiProperty({ description: 'Search method used' })
  searchMethod: 'perceptual_hash' | 'color_histogram' | 'cloud_vision' | 'combined' | 'google-cloud-vision' | 'aws-rekognition' | 'clarifai' | 'mock';

  @ApiProperty({ description: 'Vision provider used' })
  provider?: string;

  @ApiProperty({ description: 'Timestamp of the search' })
  processedAt: string;

  @ApiPropertyOptional({ description: 'Image URL if searched by URL' })
  imageUrl?: string;
}

export class ImageFeaturesDto {
  @ApiProperty({ description: 'Perceptual hash of the image' })
  perceptualHash: string;

  @ApiProperty({ description: 'Average hash of the image' })
  averageHash: string;

  @ApiProperty({ description: 'Color histogram' })
  colorHistogram: number[];

  @ApiProperty({ description: 'Dominant colors' })
  dominantColors: DominantColor[];

  @ApiProperty({ description: 'Image dimensions' })
  dimensions: { width: number; height: number };

  @ApiProperty({ description: 'Image aspect ratio' })
  aspectRatio: number;
}

export class IndexProductImageDto {
  @ApiProperty({ description: 'Product ID to index' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Force re-indexing even if already indexed' })
  @IsOptional()
  forceReindex?: boolean = false;
}

export class BatchIndexProductsDto {
  @ApiPropertyOptional({ description: 'Category ID to index products from' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of products to index', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number = 100;
}
