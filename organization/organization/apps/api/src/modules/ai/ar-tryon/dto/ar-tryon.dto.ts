import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum FitType {
  TOO_SMALL = 'too_small',
  PERFECT = 'perfect',
  TOO_LARGE = 'too_large',
}

export enum GarmentCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  DRESSES = 'dresses',
  OUTERWEAR = 'outerwear',
  SHOES = 'shoes',
  ACCESSORIES = 'accessories',
}

// Nested DTOs
export class PositionDto {
  @ApiProperty({ description: 'X coordinate', example: 0 })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate', example: 0 })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Z coordinate', example: 0 })
  @IsNumber()
  z: number;
}

export class BodyMeasurementsDto {
  @ApiPropertyOptional({ description: 'Height in cm', example: 175 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @ApiPropertyOptional({ description: 'Chest measurement in cm', example: 96 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  chest?: number;

  @ApiPropertyOptional({ description: 'Waist measurement in cm', example: 82 })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(200)
  waist?: number;

  @ApiPropertyOptional({ description: 'Hips measurement in cm', example: 98 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  hips?: number;

  @ApiPropertyOptional({ description: 'Shoulder width in cm', example: 44 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(80)
  shoulders?: number;

  @ApiPropertyOptional({ description: 'Arm length in cm', example: 61 })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(100)
  armLength?: number;

  @ApiPropertyOptional({ description: 'Leg length in cm', example: 102 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(150)
  legLength?: number;

  @ApiPropertyOptional({ description: 'Inseam measurement in cm', example: 81 })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(120)
  inseam?: number;
}

// Request DTOs
export class VirtualTryonRequestDto {
  @ApiProperty({ description: 'Product ID to try on', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Garment category for optimization' })
  @IsOptional()
  @IsEnum(GarmentCategory)
  category?: GarmentCategory;

  @ApiPropertyOptional({ description: 'Preferred size for the try-on', example: 'M' })
  @IsOptional()
  @IsString()
  preferredSize?: string;
}

export class FitRecommendationRequestDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Body measurements for accurate recommendation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BodyMeasurementsDto)
  measurements?: BodyMeasurementsDto;

  @ApiPropertyOptional({ description: 'User ID for personalized recommendations' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ArPlacementRequestDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Base64 encoded room image or URL' })
  @IsString()
  @IsNotEmpty()
  roomImage: string;

  @ApiProperty({ description: 'Position coordinates for product placement' })
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @ApiPropertyOptional({ description: 'Scale factor for the product', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  scale?: number;

  @ApiPropertyOptional({ description: 'Rotation in degrees', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  rotation?: number;
}

export class FitFeedbackDto {
  @ApiProperty({ description: 'Product ID', example: 'prod_123abc' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'User ID', example: 'user_123abc' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Size purchased', example: 'M' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ description: 'Fit feedback', enum: FitType })
  @IsEnum(FitType)
  fit: FitType;

  @ApiPropertyOptional({ description: 'User body measurements for ML improvement' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BodyMeasurementsDto)
  measurements?: BodyMeasurementsDto;

  @ApiPropertyOptional({ description: 'Additional comments', example: 'Sleeves were a bit short' })
  @IsOptional()
  @IsString()
  comments?: string;
}

// Response DTOs
export class FitAnalysisDto {
  @ApiProperty({ description: 'Shoulder fit assessment' })
  shoulderFit: string;

  @ApiProperty({ description: 'Chest fit assessment' })
  chestFit: string;

  @ApiProperty({ description: 'Length fit assessment' })
  lengthFit: string;

  @ApiProperty({ description: 'Overall fit recommendation' })
  overallFit: string;
}

export class VirtualTryonResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'URL of the try-on result image' })
  tryonImage: string;

  @ApiProperty({ description: 'Confidence score of the try-on result', example: 0.92 })
  confidence: number;

  @ApiProperty({ description: 'Fit analysis details' })
  fit: FitAnalysisDto;

  @ApiProperty({ description: 'Processing metadata' })
  metadata: {
    processingTime: string;
    model: string;
  };
}

export class BodyMeasurementsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Extracted body measurements' })
  measurements: BodyMeasurementsDto;

  @ApiProperty({ description: 'Confidence score of measurements', example: 0.88 })
  confidence: number;

  @ApiProperty({ description: 'Recommended sizes by category' })
  recommendedSize: {
    tops: string;
    bottoms: string;
    shoes: string;
  };

  @ApiProperty({ description: 'Detected body type', example: 'athletic' })
  bodyType: string;
}

export class Model3DResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: '3D model URLs and metadata' })
  model: {
    glbUrl: string;
    usdzUrl: string;
    thumbnails: string[];
  };

  @ApiProperty({ description: 'AR support availability' })
  arSupported: boolean;

  @ApiProperty({ description: 'Product dimensions in cm' })
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

export class ArPlacementResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'URL of the AR placement result image' })
  arImage: string;

  @ApiProperty({ description: 'Final placement details' })
  placement: {
    position: PositionDto;
    rotation: PositionDto;
    scale: number;
  };

  @ApiProperty({ description: 'Fit analysis for the space' })
  fitAnalysis: {
    spaceAvailable: boolean;
    styleMatch: string;
    lightingMatch: string;
  };
}

export class SizeChartResponseDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Available sizes' })
  sizes: Array<{
    size: string;
    measurements: BodyMeasurementsDto;
    availability: boolean;
  }>;

  @ApiProperty({ description: 'Size recommendations based on common body types' })
  recommendations: Record<string, string>;
}
