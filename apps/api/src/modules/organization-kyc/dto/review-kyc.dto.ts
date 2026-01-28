import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KycReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_MORE_INFO = 'request_more_info',
}

export class ReviewKycDto {
  @ApiProperty({
    description: 'Review decision',
    enum: KycReviewDecision,
    example: KycReviewDecision.APPROVE,
  })
  @IsEnum(KycReviewDecision)
  @IsNotEmpty()
  decision: KycReviewDecision;

  @ApiPropertyOptional({
    description: 'Review notes (required for rejection)',
    example: 'Document quality is insufficient',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    description: 'Rejection reason (required when decision is reject)',
    example: 'Invalid identification document',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'ID document verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  idVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Address document verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  addressVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Business document verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  businessVerified?: boolean;
}

export class GetKycStatusResponseDto {
  @ApiProperty({ example: 'kyc-uuid' })
  id: string;

  @ApiProperty({ example: 'UNDER_REVIEW' })
  status: string;

  @ApiProperty({ example: 'passport' })
  idType?: string;

  @ApiProperty({ example: false })
  idVerified: boolean;

  @ApiProperty({ example: false })
  addressVerified: boolean;

  @ApiProperty({ example: false })
  businessVerified: boolean;

  @ApiPropertyOptional({ example: '2024-12-01T10:00:00Z' })
  submittedAt?: Date;

  @ApiPropertyOptional({ example: '2024-12-05T10:00:00Z' })
  reviewedAt?: Date;

  @ApiPropertyOptional({ example: 'Documents approved' })
  reviewNotes?: string;

  @ApiPropertyOptional({ example: 'Invalid document' })
  rejectionReason?: string;
}
