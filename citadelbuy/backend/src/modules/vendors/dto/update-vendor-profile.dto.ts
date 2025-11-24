import {
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVendorProfileDto {
  @ApiPropertyOptional({
    description: 'Legal business name',
    example: 'Acme Electronics LLC',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  businessName?: string;

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

  @ApiPropertyOptional({
    description: 'Business physical address',
    example: '123 Main St, Suite 100, New York, NY 10001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Business phone number',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  @IsOptional()
  businessPhone?: string;

  @ApiPropertyOptional({
    description: 'Business email address',
    example: 'contact@acmeelectronics.com',
  })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

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
    description: 'Contact person name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Contact person phone',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Contact person email',
    example: 'john@acmeelectronics.com',
  })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;
}
