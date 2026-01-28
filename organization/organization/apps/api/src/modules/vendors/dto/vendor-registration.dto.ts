import {
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsPhoneNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorRegistrationDto {
  @ApiProperty({
    description: 'Legal business name',
    example: 'Acme Electronics LLC',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  businessName: string;

  @ApiPropertyOptional({
    description: 'Type of business',
    example: 'LLC',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessType?: string;

  @ApiPropertyOptional({
    description: 'Tax ID or EIN',
    example: '12-3456789',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @ApiProperty({
    description: 'Business physical address',
    example: '123 Main St, Suite 100, New York, NY 10001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  businessAddress: string;

  @ApiProperty({
    description: 'Business phone number',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  businessPhone: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'contact@acmeelectronics.com',
  })
  @IsEmail()
  @IsNotEmpty()
  businessEmail: string;

  @ApiPropertyOptional({
    description: 'Business website URL',
    example: 'https://www.acmeelectronics.com',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'Business description/about',
    example: 'Leading provider of quality electronics...',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Business logo URL',
    example: 'https://cdn.example.com/logos/acme.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Business banner URL',
    example: 'https://cdn.example.com/banners/acme.png',
  })
  @IsUrl()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Social media links',
    example: {
      facebook: 'https://facebook.com/acme',
      twitter: 'https://twitter.com/acme',
      instagram: 'https://instagram.com/acme',
    },
  })
  @IsObject()
  @IsOptional()
  socialMedia?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Additional documents or licenses as JSON array',
    example: ['business_license.pdf', 'tax_certificate.pdf'],
  })
  @IsOptional()
  documents?: string[];
}
