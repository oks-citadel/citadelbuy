import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateVariantOptionValueDto {
  @ApiProperty({ description: 'Variant option ID' })
  @IsUUID()
  optionId: string;

  @ApiProperty({ description: 'Value', example: 'Small' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Display value', example: 'Small (S)' })
  @IsString()
  displayValue: string;

  @ApiPropertyOptional({
    description: 'Hex color code for color options',
    example: '#FF0000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'hexColor must be a valid hex color code' })
  hexColor?: string;

  @ApiPropertyOptional({
    description: 'Image URL for this value',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Display order position', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Is this value available', default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Price adjustment for this option',
    default: 0,
    example: 5.00,
  })
  @IsNumber()
  @IsOptional()
  priceAdjustment?: number;
}

export class UpdateVariantOptionValueDto extends PartialType(
  CreateVariantOptionValueDto,
) {
  @ApiPropertyOptional({ description: 'Variant option ID' })
  @IsUUID()
  @IsOptional()
  optionId?: string;
}
