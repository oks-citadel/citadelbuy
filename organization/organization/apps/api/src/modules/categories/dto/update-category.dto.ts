import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

/**
 * DTO for updating a category
 * Uses PartialType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
