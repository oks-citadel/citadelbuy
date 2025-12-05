import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConsentDto {
  @ApiProperty({
    description: 'Consent to data processing',
    example: true,
  })
  @IsBoolean()
  dataProcessing: boolean;

  @ApiProperty({
    description: 'Consent to marketing communications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  marketing?: boolean;

  @ApiProperty({
    description: 'Consent to analytics tracking',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  analytics?: boolean;

  @ApiProperty({
    description: 'Consent to third-party data sharing',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  thirdPartySharing?: boolean;

  @ApiProperty({
    description: 'IP address of the user providing consent',
    example: '192.168.1.1',
    required: false,
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent string',
    required: false,
  })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class DataExportRequestDto {
  @ApiProperty({
    description: 'Format for data export',
    enum: ['json', 'csv'],
    example: 'json',
    required: false,
  })
  @IsString()
  @IsOptional()
  format?: 'json' | 'csv' = 'json';
}

export class DataDeletionRequestDto {
  @ApiProperty({
    description: 'Deletion strategy to use',
    enum: ['SOFT_DELETE', 'HARD_DELETE', 'ANONYMIZE'],
    example: 'ANONYMIZE',
  })
  @IsString()
  strategy: 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZE';

  @ApiProperty({
    description: 'Reason for deletion',
    example: 'No longer need the account',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    description: 'Schedule deletion for future date',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  scheduledDate?: Date;
}
