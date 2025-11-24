import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { CreateWishlistCollectionDto } from './dto/create-wishlist-collection.dto';
import { AddToWishlistCollectionDto } from './dto/add-to-wishlist-collection.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist retrieved successfully',
  })
  findAll(@Request() req: AuthRequest) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get wishlist item count' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist count retrieved',
  })
  async getCount(@Request() req: AuthRequest) {
    const count = await this.wishlistService.getCount(req.user.id);
    return { count };
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Check status returned',
  })
  async checkProduct(@Request() req: AuthRequest, @Param('productId') productId: string) {
    const inWishlist = await this.wishlistService.isInWishlist(req.user.id, productId);
    return { inWishlist };
  }

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Product added to wishlist',
  })
  @ApiResponse({
    status: 409,
    description: 'Product already in wishlist',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  add(@Request() req: AuthRequest, @Body() addToWishlistDto: AddToWishlistDto) {
    return this.wishlistService.add(req.user.id, addToWishlistDto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Product removed from wishlist',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found in wishlist',
  })
  remove(@Request() req: AuthRequest, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.id, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist cleared successfully',
  })
  clear(@Request() req: AuthRequest) {
    return this.wishlistService.clear(req.user.id);
  }

  // ==================== Enhanced Wishlist Collection Endpoints ====================

  @Get('collections')
  @ApiOperation({ summary: 'Get all wishlist collections' })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  getCollections(@Request() req: AuthRequest) {
    return this.wishlistService.getCollections(req.user.id);
  }

  @Post('collections')
  @ApiOperation({ summary: 'Create a new wishlist collection' })
  @ApiResponse({ status: 201, description: 'Collection created successfully' })
  createCollection(@Request() req: AuthRequest, @Body() dto: CreateWishlistCollectionDto) {
    return this.wishlistService.createCollection(req.user.id, dto);
  }

  @Get('collections/:collectionId')
  @ApiOperation({ summary: 'Get single wishlist collection' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  getCollection(@Request() req: AuthRequest, @Param('collectionId') collectionId: string) {
    return this.wishlistService.getCollection(collectionId, req.user.id);
  }

  @Put('collections/:collectionId')
  @ApiOperation({ summary: 'Update wishlist collection' })
  @ApiResponse({ status: 200, description: 'Collection updated successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  updateCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Body() dto: Partial<CreateWishlistCollectionDto>,
  ) {
    return this.wishlistService.updateCollection(collectionId, req.user.id, dto);
  }

  @Delete('collections/:collectionId')
  @ApiOperation({ summary: 'Delete wishlist collection' })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  deleteCollection(@Request() req: AuthRequest, @Param('collectionId') collectionId: string) {
    return this.wishlistService.deleteCollection(collectionId, req.user.id);
  }

  @Post('collections/:collectionId/items')
  @ApiOperation({ summary: 'Add item to wishlist collection' })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({ status: 404, description: 'Collection or product not found' })
  @ApiResponse({ status: 409, description: 'Item already in collection' })
  addToCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Body() dto: AddToWishlistCollectionDto,
  ) {
    return this.wishlistService.addToCollection(collectionId, req.user.id, dto);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update wishlist item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  updateWishlistItem(
    @Request() req: AuthRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWishlistItemDto,
  ) {
    return this.wishlistService.updateWishlistItem(itemId, req.user.id, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from wishlist collection' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  removeFromCollection(@Request() req: AuthRequest, @Param('itemId') itemId: string) {
    return this.wishlistService.removeFromCollection(itemId, req.user.id);
  }

  @Post('collections/:collectionId/share')
  @ApiOperation({ summary: 'Create share link for wishlist collection' })
  @ApiResponse({ status: 200, description: 'Share link created successfully' })
  createShareLink(@Request() req: AuthRequest, @Param('collectionId') collectionId: string) {
    return this.wishlistService.createShareLink(collectionId, req.user.id);
  }
}

@ApiTags('wishlist')
@Controller('wishlist/shared')
export class SharedWishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get(':shareToken')
  @ApiOperation({ summary: 'Get shared wishlist collection (public)' })
  @ApiResponse({ status: 200, description: 'Shared collection retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shared collection not found' })
  getSharedCollection(@Param('shareToken') shareToken: string) {
    return this.wishlistService.getCollectionByShareToken(shareToken);
  }
}
