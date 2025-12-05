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
import {
  CheckoutService,
  SavedAddress,
  ExpressCheckoutRequest,
  GuestCheckoutRequest,
} from './checkout.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { AuthRequest } from '@/common/types/auth-request.types';
import { IsString, IsBoolean, IsOptional, IsEmail, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

// ==================== DTOs ====================

class AddressDto {
  @IsString()
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

class UpdateAddressDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

class ExpressCheckoutDto implements ExpressCheckoutRequest {
  @IsString()
  @IsOptional()
  cartId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsOptional()
  shippingAddressId?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsBoolean()
  @IsOptional()
  useGiftCard?: boolean;

  @IsString()
  @IsOptional()
  giftCardCode?: string;
}

class GuestCheckoutItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

class GuestShippingAddressDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}

class GuestBillingAddressDto {
  @IsString()
  fullName: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}

class GuestCheckoutDto implements GuestCheckoutRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCheckoutItemDto)
  items: GuestCheckoutItemDto[];

  @ValidateNested()
  @Type(() => GuestShippingAddressDto)
  shippingAddress: GuestShippingAddressDto;

  @ValidateNested()
  @Type(() => GuestBillingAddressDto)
  @IsOptional()
  billingAddress?: GuestBillingAddressDto;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsEmail()
  guestEmail: string;
}

class AttachPaymentMethodDto {
  @IsString()
  paymentMethodId: string;

  @IsBoolean()
  @IsOptional()
  setAsDefault?: boolean;
}

class InitializeCheckoutDto {
  @IsString()
  @IsOptional()
  cartId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsOptional()
  shippingAddressId?: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  // ==================== Address Management ====================

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved addresses' })
  @ApiResponse({ status: 200, description: 'List of saved addresses' })
  async getSavedAddresses(@Request() req: AuthRequest) {
    return this.checkoutService.getSavedAddresses(req.user.id);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a new address' })
  @ApiResponse({ status: 201, description: 'Address saved successfully' })
  async saveAddress(@Request() req: AuthRequest, @Body() dto: AddressDto) {
    return this.checkoutService.saveAddress(req.user.id, {
      isDefault: dto.isDefault ?? false,
      fullName: dto.fullName,
      email: dto.email ?? '',
      phone: dto.phone ?? '',
      street: dto.street,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
    });
  }

  @Put('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @Request() req: AuthRequest,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.checkoutService.updateAddress(req.user.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(@Request() req: AuthRequest, @Param('id') addressId: string) {
    await this.checkoutService.deleteAddress(req.user.id, addressId);
    return { success: true, message: 'Address deleted successfully' };
  }

  // ==================== Payment Method Management ====================

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved payment methods' })
  @ApiResponse({ status: 200, description: 'List of saved payment methods' })
  async getSavedPaymentMethods(@Request() req: AuthRequest) {
    return this.checkoutService.getSavedPaymentMethods(req.user.id);
  }

  @Post('payment-methods/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get setup intent for adding a new payment method' })
  @ApiResponse({ status: 200, description: 'Setup intent client secret' })
  async setupPaymentMethod(@Request() req: AuthRequest) {
    return this.checkoutService.setupPaymentMethod(req.user.id);
  }

  @Post('payment-methods/attach')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a payment method to your account' })
  @ApiResponse({ status: 200, description: 'Payment method attached successfully' })
  async attachPaymentMethod(@Request() req: AuthRequest, @Body() dto: AttachPaymentMethodDto) {
    await this.checkoutService.attachPaymentMethod(
      req.user.id,
      dto.paymentMethodId,
      dto.setAsDefault,
    );
    return { success: true, message: 'Payment method attached successfully' };
  }

  @Put('payment-methods/:id/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setDefaultPaymentMethod(
    @Request() req: AuthRequest,
    @Param('id') paymentMethodId: string,
  ) {
    await this.checkoutService.setDefaultPaymentMethod(req.user.id, paymentMethodId);
    return { success: true, message: 'Default payment method updated' };
  }

  @Delete('payment-methods/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  async deletePaymentMethod(
    @Request() req: AuthRequest,
    @Param('id') paymentMethodId: string,
  ) {
    await this.checkoutService.deletePaymentMethod(req.user.id, paymentMethodId);
    return { success: true, message: 'Payment method deleted successfully' };
  }

  // ==================== Checkout Operations ====================

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize checkout session with calculated totals' })
  @ApiResponse({ status: 200, description: 'Checkout session initialized' })
  async initializeCheckout(@Request() req: AuthRequest, @Body() dto: InitializeCheckoutDto) {
    return this.checkoutService.initializeCheckout(req.user.id, dto);
  }

  @Post('express')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Express checkout - one-click purchase with saved details' })
  @ApiResponse({ status: 200, description: 'Order placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or payment failed' })
  async expressCheckout(@Request() req: AuthRequest, @Body() dto: ExpressCheckoutDto) {
    return this.checkoutService.expressCheckout(req.user.id, dto);
  }

  @Post('guest')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 guest checkouts per minute per IP
  @ApiOperation({ summary: 'Guest checkout - checkout without an account' })
  @ApiResponse({ status: 200, description: 'Guest order created, payment intent ready' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async guestCheckout(@Request() req: AuthRequest, @Body() dto: GuestCheckoutDto) {
    // OptionalJwtAuthGuard allows both authenticated and guest users
    // If req.user exists, user is authenticated; otherwise they're a guest
    const userId = req.user?.id || null;
    return this.checkoutService.guestCheckout(dto, userId);
  }

  // ==================== Quick Actions ====================

  @Get('quick-buy/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get quick buy info for a product' })
  @ApiQuery({ name: 'quantity', required: false, type: Number })
  async getQuickBuyInfo(
    @Request() req: AuthRequest,
    @Param('productId') productId: string,
    @Query('quantity') quantity?: number,
  ) {
    return this.checkoutService.initializeCheckout(req.user.id, {
      productId,
      quantity: quantity ? Number(quantity) : 1,
    });
  }
}
