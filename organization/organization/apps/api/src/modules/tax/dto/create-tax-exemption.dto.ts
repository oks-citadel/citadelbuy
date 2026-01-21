import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsISO31661Alpha2,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxExemptionType } from '@prisma/client';

export class CreateTaxExemptionDto {
  @ApiPropertyOptional({ description: 'User ID for customer exemption' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Product ID for product exemption' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Category ID for category exemption' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Specific tax rate ID for exemption' })
  @IsString()
  @IsOptional()
  taxRateId?: string;

  @ApiProperty({ enum: TaxExemptionType, description: 'Type of exemption' })
  @IsEnum(TaxExemptionType)
  exemptionType: TaxExemptionType;

  @ApiProperty({ description: 'Reason for exemption' })
  @IsString()
  exemptionReason: string;

  @ApiPropertyOptional({ description: 'Tax exemption certificate number' })
  @IsString()
  @IsOptional()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'URL to certificate file' })
  @IsString()
  @IsOptional()
  certificateFile?: string;

  @ApiProperty({ description: 'Country code', example: 'US' })
  @IsISO31661Alpha2()
  country: string;

  @ApiPropertyOptional({ description: 'State/province code', example: 'CA' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiProperty({ description: 'Is active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsString()
  @IsOptional()
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class UpdateTaxExemptionDto extends CreateTaxExemptionDto {}

export class VerifyTaxExemptionDto {
  @ApiProperty({ description: 'Exemption ID' })
  @IsString()
  exemptionId: string;

  @ApiProperty({ description: 'Verification notes' })
  @IsString()
  verificationNotes: string;

  @ApiProperty({ description: 'Approved or rejected', example: true })
  @IsBoolean()
  approved: boolean;
}
