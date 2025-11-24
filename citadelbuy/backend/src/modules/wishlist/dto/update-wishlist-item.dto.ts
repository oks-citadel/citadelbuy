import { PartialType } from '@nestjs/swagger';
import { AddToWishlistCollectionDto } from './add-to-wishlist-collection.dto';

export class UpdateWishlistItemDto extends PartialType(AddToWishlistCollectionDto) {}
