import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Verification method types
 */
export enum VerificationMethod {
  TXT = 'TXT',     // TXT record verification
  CNAME = 'CNAME', // CNAME record verification
  HTTP = 'HTTP',   // HTTP file verification (future)
}

/**
 * DTO for triggering domain verification
 */
export class VerifyDomainDto {
  @ApiPropertyOptional({
    enum: VerificationMethod,
    default: VerificationMethod.TXT,
    description: 'The verification method to use',
  })
  @IsOptional()
  @IsEnum(VerificationMethod)
  method?: VerificationMethod;

  @ApiPropertyOptional({
    example: false,
    description: 'Force re-verification even if already verified',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * Response for domain verification status
 */
export class DomainVerificationStatusDto {
  @ApiProperty({
    example: 'dm_abc123',
    description: 'Domain ID',
  })
  id: string;

  @ApiProperty({
    example: 'shop.vendor.com',
    description: 'The domain hostname',
  })
  host: string;

  @ApiProperty({
    example: 'PENDING_VERIFICATION',
    description: 'Current domain status',
  })
  status: string;

  @ApiProperty({
    example: true,
    description: 'Whether the TXT record was found',
  })
  txtRecordFound: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the CNAME record was found',
  })
  cnameRecordFound: boolean;

  @ApiProperty({
    example: 'bx-verify=abc123xyz',
    description: 'Expected TXT record value',
  })
  expectedTxtRecord: string;

  @ApiProperty({
    example: 'domains.broxiva.com',
    description: 'Expected CNAME target',
  })
  expectedCnameTarget: string;

  @ApiPropertyOptional({
    example: ['Record not found', 'Wrong CNAME target'],
    description: 'List of verification errors if any',
  })
  errors?: string[];

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'Timestamp when domain was verified',
  })
  verifiedAt?: string;
}

/**
 * Response for domain verification check
 */
export class VerificationCheckResultDto {
  @ApiProperty({
    example: true,
    description: 'Whether verification was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'New domain status after verification',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Detailed verification results',
  })
  details?: {
    txtVerified: boolean;
    cnameVerified: boolean;
    sslStatus?: string;
  };

  @ApiPropertyOptional({
    example: 'TXT record not found',
    description: 'Error message if verification failed',
  })
  error?: string;
}

/**
 * DNS Instructions for domain setup
 */
export class DnsInstructionsDto {
  @ApiProperty({
    example: 'shop.vendor.com',
    description: 'The domain to configure',
  })
  host: string;

  @ApiProperty({
    description: 'TXT record configuration',
  })
  txtRecord: {
    name: string;
    type: 'TXT';
    value: string;
    ttl: number;
  };

  @ApiProperty({
    description: 'CNAME record configuration',
  })
  cnameRecord: {
    name: string;
    type: 'CNAME';
    value: string;
    ttl: number;
  };

  @ApiPropertyOptional({
    description: 'A record configuration (alternative to CNAME for apex domains)',
  })
  aRecord?: {
    name: string;
    type: 'A';
    value: string[];
    ttl: number;
  };
}
