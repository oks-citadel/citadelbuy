import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Domain status values that can be set via API
 */
export enum UpdateableDomainStatus {
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * DTO for updating a tenant domain
 */
export class UpdateDomainDto {
  @ApiPropertyOptional({
    enum: UpdateableDomainStatus,
    description: 'Domain status (only VERIFIED or SUSPENDED can be set)',
  })
  @IsOptional()
  @IsEnum(UpdateableDomainStatus)
  status?: UpdateableDomainStatus;
}
