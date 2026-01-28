import { PartialType } from '@nestjs/mapped-types';
import { AddToWishlistCollectionDto } from './add-to-wishlist-collection.dto';

/**
 * DTO for updating a wishlist item
 * Uses PartialType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional
 */
export class UpdateWishlistItemDto extends PartialType(AddToWishlistCollectionDto) {}
