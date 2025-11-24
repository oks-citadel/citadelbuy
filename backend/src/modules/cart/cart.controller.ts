import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { LockPricesDto } from './dto/lock-prices.dto';
import { TrackAbandonmentDto } from './dto/track-abandonment.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { AuthRequest, OptionalAuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Shopping Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get current cart (user or guest)' })
  @ApiQuery({ name: 'sessionId', required: false, description: 'Session ID for guest cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@Request() req: OptionalAuthRequest, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id;
    return this.cartService.getOrCreateCart(userId, sessionId);
  }

  @Post('items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addToCart(@Request() req: OptionalAuthRequest, @Body() dto: AddToCartDto) {
    const userId = req.user?.id;
    return this.cartService.addToCart(dto, userId);
  }

  @Put('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @Request() req: OptionalAuthRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Query('sessionId') sessionId?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.updateCartItem(itemId, dto, userId, sessionId);
  }

  @Delete('items/:itemId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(
    @Request() req: OptionalAuthRequest,
    @Param('itemId') itemId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.removeFromCart(itemId, userId, sessionId);
  }

  @Delete()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@Request() req: OptionalAuthRequest, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id;
    return this.cartService.clearCart(userId, sessionId);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart into user cart (on login)' })
  @ApiResponse({ status: 200, description: 'Carts merged successfully' })
  async mergeCart(@Request() req: AuthRequest, @Body() dto: MergeCartDto) {
    return this.cartService.mergeCart(req.user.id, dto);
  }

  @Post(':cartId/lock-prices')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lock prices in cart for a duration' })
  @ApiResponse({ status: 200, description: 'Prices locked successfully' })
  async lockPrices(@Param('cartId') cartId: string, @Body() dto: LockPricesDto) {
    return this.cartService.lockPrices(cartId, dto);
  }

  @Post(':cartId/share')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create shareable cart link' })
  @ApiResponse({ status: 200, description: 'Share link created successfully' })
  async createShareLink(@Param('cartId') cartId: string) {
    return this.cartService.createShareLink(cartId);
  }

  @Get('shared/:shareToken')
  @ApiOperation({ summary: 'Get cart by share token (public)' })
  @ApiResponse({ status: 200, description: 'Shared cart retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shared cart not found' })
  async getSharedCart(@Param('shareToken') shareToken: string) {
    return this.cartService.getCartByShareToken(shareToken);
  }

  @Post(':cartId/track-abandonment')
  @ApiOperation({ summary: 'Track cart abandonment for recovery' })
  @ApiResponse({ status: 200, description: 'Abandonment tracked successfully' })
  async trackAbandonment(@Param('cartId') cartId: string, @Body() dto: TrackAbandonmentDto) {
    return this.cartService.trackAbandonment(cartId, dto);
  }

  @Get('abandoned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get abandoned carts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Abandoned carts retrieved successfully' })
  async getAbandonedCarts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('minValue') minValue?: number,
  ) {
    return this.cartService.getAbandonedCarts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      minValue: minValue ? Number(minValue) : undefined,
    });
  }

  @Post(':cartId/reserve-inventory')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Reserve inventory for cart items' })
  @ApiResponse({ status: 200, description: 'Inventory reserved successfully' })
  @ApiResponse({ status: 400, description: 'Not enough stock' })
  async reserveInventory(
    @Param('cartId') cartId: string,
    @Query('durationMinutes') durationMinutes?: number,
  ) {
    return this.cartService.reserveInventory(
      cartId,
      durationMinutes ? Number(durationMinutes) : undefined,
    );
  }

  @Delete(':cartId/reserve-inventory')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Release inventory reservations' })
  @ApiResponse({ status: 200, description: 'Inventory released successfully' })
  async releaseInventory(@Param('cartId') cartId: string) {
    return this.cartService.releaseInventory(cartId);
  }
}
