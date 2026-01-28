import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Domain types supported by the platform
 */
export enum DomainType {
  PRIMARY = 'PRIMARY',
  SUBDOMAIN = 'SUBDOMAIN',
  CUSTOM = 'CUSTOM',
  VANITY = 'VANITY',
}

/**
 * DTO for creating a new tenant domain
 */
export class CreateDomainDto {
  @ApiProperty({
    example: 'shop.vendor.com',
    description: 'The hostname for the domain (without protocol)',
    minLength: 4,
    maxLength: 253,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(253)
  @Matches(
    /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
    {
      message: 'Host must be a valid domain name (e.g., shop.example.com)',
    },
  )
  host: string;

  @ApiProperty({
    example: 'org_123456',
    description: 'The organization/tenant ID this domain belongs to',
  })
  @IsString()
  @MinLength(1)
  tenantId: string;

  @ApiPropertyOptional({
    enum: DomainType,
    default: DomainType.CUSTOM,
    description: 'Type of domain - SUBDOMAIN for *.broxiva.com or CUSTOM for external domains',
  })
  @IsOptional()
  @IsEnum(DomainType)
  domainType?: DomainType;
}

/**
 * DTO for creating a subdomain (simplified)
 */
export class CreateSubdomainDto {
  @ApiProperty({
    example: 'mystore',
    description: 'The subdomain slug (will be <slug>.broxiva.com)',
    minLength: 3,
    maxLength: 63,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message: 'Subdomain must be lowercase alphanumeric with optional hyphens',
    },
  )
  subdomain: string;

  @ApiProperty({
    example: 'org_123456',
    description: 'The organization/tenant ID this subdomain belongs to',
  })
  @IsString()
  @MinLength(1)
  tenantId: string;
}
