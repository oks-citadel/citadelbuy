import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VendorStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  INACTIVE = 'INACTIVE',
}

export enum VendorApplicationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class VerifyVendorDto {
  @ApiProperty({
    description: 'New vendor status',
    enum: VendorStatus,
    example: VendorStatus.ACTIVE,
  })
  @IsEnum(VendorStatus)
  @IsNotEmpty()
  status: VendorStatus;

  @ApiPropertyOptional({
    description: 'Verification notes/comments',
    example: 'All documents verified. Business license confirmed.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Reviewed by admin ID',
    example: 'admin_123456',
  })
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class ApproveApplicationDto {
  @ApiPropertyOptional({
    description: 'Approval notes/comments',
    example: 'Application approved. Welcome to our marketplace!',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Custom commission rate for this vendor',
    example: 12.5,
  })
  @IsOptional()
  commissionRate?: number;
}

export class RejectApplicationDto {
  @ApiProperty({
    description: 'Rejection reason',
    example: 'Incomplete business documentation',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Please submit valid business license and tax certificate.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class SuspendVendorDto {
  @ApiProperty({
    description: 'Suspension reason',
    example: 'Multiple customer complaints about product quality',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({
    description: 'Suspension duration in days (null = indefinite)',
    example: 30,
  })
  @IsOptional()
  suspensionDays?: number;
}
