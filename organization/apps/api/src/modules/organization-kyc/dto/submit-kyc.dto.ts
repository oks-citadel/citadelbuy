import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IdType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
}

export class SubmitKycDto {
  @ApiProperty({
    description: 'Type of identification document',
    enum: IdType,
    example: IdType.PASSPORT,
  })
  @IsEnum(IdType)
  @IsNotEmpty()
  idType: IdType;

  @ApiProperty({
    description: 'Business type (e.g., LLC, Corporation, Sole Proprietorship)',
    example: 'LLC',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessType: string;

  @ApiPropertyOptional({
    description: 'Business registration number',
    example: 'REG-123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Tax identification number',
    example: 'TAX-789012',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Business address line 1',
    example: '123 Business St',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Business city',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCity?: string;

  @ApiPropertyOptional({
    description: 'Business state/province',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessState?: string;

  @ApiPropertyOptional({
    description: 'Business postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessPostalCode?: string;

  @ApiPropertyOptional({
    description: 'Business country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCountry?: string;
}

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Document type',
    enum: ['id_document', 'address_proof', 'business_document'],
    example: 'id_document',
  })
  @IsEnum(['id_document', 'address_proof', 'business_document'])
  @IsNotEmpty()
  documentType: 'id_document' | 'address_proof' | 'business_document';

  @ApiProperty({
    description: 'Document file name',
    example: 'passport.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description: 'Document MIME type',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
