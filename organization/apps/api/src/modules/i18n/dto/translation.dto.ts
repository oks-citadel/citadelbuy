import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'es' })
  @IsString()
  languageCode: string;

  @ApiProperty({ description: 'Translation key', example: 'common.add_to_cart' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Translated value', example: 'Añadir al carrito' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Namespace', example: 'common' })
  @IsOptional()
  @IsString()
  namespace?: string;
}

export class UpdateTranslationDto {
  @ApiProperty({ description: 'Translated value', example: 'Añadir al carrito' })
  @IsString()
  value: string;
}

export class BulkTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'es' })
  @IsString()
  languageCode: string;

  @ApiProperty({
    description: 'Translations object',
    example: {
      'common.add_to_cart': 'Añadir al carrito',
      'common.buy_now': 'Comprar ahora',
    },
  })
  translations: Record<string, string>;

  @ApiPropertyOptional({ description: 'Namespace', example: 'common' })
  @IsOptional()
  @IsString()
  namespace?: string;
}

export class ProductTranslationDto {
  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Language code', example: 'es' })
  @IsString()
  languageCode: string;

  @ApiProperty({ description: 'Translated name', example: 'Auriculares Inalámbricos' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Translated description', example: 'Auriculares de alta calidad...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Meta title', example: 'Comprar Auriculares Inalámbricos' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Slug', example: 'auriculares-inalambricos' })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class CategoryTranslationDto {
  @ApiProperty({ description: 'Category ID', example: 'category-123' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Language code', example: 'es' })
  @IsString()
  languageCode: string;

  @ApiProperty({ description: 'Translated name', example: 'Electrónica' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Translated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Slug', example: 'electronica' })
  @IsOptional()
  @IsString()
  slug?: string;
}
