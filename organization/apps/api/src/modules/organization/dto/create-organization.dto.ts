import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationType {
  INDIVIDUAL = 'INDIVIDUAL',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
  MARKETPLACE = 'MARKETPLACE',
}

export class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  zip: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  country: string;
}

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization display name',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'acme-corp',
    description: 'URL-friendly slug (lowercase, hyphens allowed)',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase with hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({
    enum: OrganizationType,
    default: OrganizationType.SMALL_BUSINESS,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({ example: 'Acme Corporation Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: 'REG123456789' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'XX-XXXXXXX' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'E-commerce' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ example: 'contact@acme.com' })
  @IsEmail()
  primaryEmail: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.png' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Primary color must be a valid hex color',
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'Leading provider of quality products' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
