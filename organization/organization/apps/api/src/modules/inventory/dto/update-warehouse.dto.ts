import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseDto } from './create-warehouse.dto';

/**
 * DTO for updating a warehouse
 * Uses PartialType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional
 */
export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}
