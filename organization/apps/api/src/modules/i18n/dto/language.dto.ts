import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLanguageDto {
  @ApiProperty({ description: 'ISO 639-1 language code', example: 'es' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'English language name', example: 'Spanish' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Native language name', example: 'Español' })
  @IsString()
  nativeName: string;

  @ApiPropertyOptional({ description: 'Is default language', example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Is right-to-left language', example: false })
  @IsOptional()
  @IsBoolean()
  isRTL?: boolean;

  @ApiPropertyOptional({ description: 'Flag emoji or URL', example: '🇪🇸' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLanguageDto {
  @ApiPropertyOptional({ description: 'English language name', example: 'Spanish' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Native language name', example: 'Español' })
  @IsOptional()
  @IsString()
  nativeName?: string;

  @ApiPropertyOptional({ description: 'Is default language', example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Is right-to-left language', example: false })
  @IsOptional()
  @IsBoolean()
  isRTL?: boolean;

  @ApiPropertyOptional({ description: 'Flag emoji or URL', example: '🇪🇸' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
