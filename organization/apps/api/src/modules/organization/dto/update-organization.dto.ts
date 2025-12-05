import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * DTO for updating an organization
 * Uses PartialType and OmitType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional and removing the slug field (cannot be changed)
 */
export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['slug'] as const),
) {}
