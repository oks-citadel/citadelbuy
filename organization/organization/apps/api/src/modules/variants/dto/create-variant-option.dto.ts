import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { VariantOptionType } from '@prisma/client';

export class CreateVariantOptionDto {
  @ApiProperty({ description: 'Option name', example: 'Size' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Choose Size' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({
    enum: VariantOptionType,
    description: 'Option type',
    default: 'SELECT',
  })
  @IsEnum(VariantOptionType)
  @IsOptional()
  type?: VariantOptionType;

  @ApiPropertyOptional({ description: 'Display order position', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Is this option required', default: true })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class UpdateVariantOptionDto extends PartialType(CreateVariantOptionDto) {}
