import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeaturedListingsService, CreateFeaturedListingDto } from './featured-listings.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, FeaturedPosition, FeaturedStatus } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { VendorsService } from './vendors.service';
import { IsString, IsDateString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== DTOs ====================

class CreateFeaturedListingRequestDto {
  @IsString()
  productId: string;

  @IsEnum(FeaturedPosition)
  position: FeaturedPosition;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}

class UpsertSlotDto {
  @IsEnum(FeaturedPosition)
  position: FeaturedPosition;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxListings: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dailyRate: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weeklyRate: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRate: number;

  @IsOptional()
  isActive?: boolean;
}

// ==================== Public Controller ====================

@ApiTags('Featured Products')
@Controller('featured')
export class FeaturedProductsController {
  constructor(private readonly featuredService: FeaturedListingsService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get featured products for display' })
  @ApiQuery({ name: 'position', required: true, enum: FeaturedPosition })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of featured products' })
  async getFeaturedProducts(
    @Query('position') position: FeaturedPosition,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.featuredService.getFeaturedProducts(
      position,
      categoryId,
      limit ? Number(limit) : 10,
    );
  }

  @Post('click/:listingId')
  @ApiOperation({ summary: 'Track a click on a featured listing' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(@Param('listingId') listingId: string) {
    await this.featuredService.trackClick(listingId);
    return { success: true };
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get available featured slots' })
  @ApiQuery({ name: 'position', required: false, enum: FeaturedPosition })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'Available slots with pricing' })
  async getAvailableSlots(
    @Query('position') position?: FeaturedPosition,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.featuredService.getAvailableSlots(position, categoryId);
  }
}

// ==================== Vendor Controller ====================

@ApiTags('Vendor Featured Listings')
@Controller('vendor/featured')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth()
export class VendorFeaturedListingsController {
  constructor(
    private readonly featuredService: FeaturedListingsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get('slots')
  @ApiOperation({ summary: 'Get available featured slots with pricing' })
  @ApiQuery({ name: 'position', required: false, enum: FeaturedPosition })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'Available slots' })
  async getAvailableSlots(
    @Query('position') position?: FeaturedPosition,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.featuredService.getAvailableSlots(position, categoryId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a featured listing request' })
  @ApiResponse({ status: 201, description: 'Featured listing created' })
  @ApiResponse({ status: 400, description: 'Invalid request or no slots available' })
  async createFeaturedListing(
    @Request() req: AuthRequest,
    @Body() dto: CreateFeaturedListingRequestDto,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);

    const createDto: CreateFeaturedListingDto = {
      productId: dto.productId,
      position: dto.position,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      categoryId: dto.categoryId,
    };

    return this.featuredService.createFeaturedListing(profile.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my featured listings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: FeaturedStatus })
  @ApiResponse({ status: 200, description: 'List of featured listings' })
  async getMyListings(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: FeaturedStatus,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.featuredService.getVendorListings(
      profile.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get my featured listings statistics' })
  @ApiResponse({ status: 200, description: 'Featured listings statistics' })
  async getMyStats(@Request() req: AuthRequest) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.featuredService.getListingStats(profile.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a featured listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel listing' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async cancelListing(@Request() req: AuthRequest, @Param('id') listingId: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    await this.featuredService.cancelListing(listingId, profile.id);
    return { message: 'Featured listing cancelled successfully' };
  }
}

// ==================== Admin Controller ====================

@ApiTags('Admin Featured Listings')
@Controller('admin/featured')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminFeaturedListingsController {
  constructor(private readonly featuredService: FeaturedListingsService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Get all featured listings (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: FeaturedStatus })
  @ApiQuery({ name: 'position', required: false, enum: FeaturedPosition })
  @ApiResponse({ status: 200, description: 'List of all featured listings' })
  async getAllListings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: FeaturedStatus,
    @Query('position') position?: FeaturedPosition,
  ) {
    return this.featuredService.getAllListings(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
      position,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get overall featured listings statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Overall statistics' })
  async getOverallStats() {
    return this.featuredService.getListingStats();
  }

  @Post('slots')
  @ApiOperation({ summary: 'Create or update a featured slot (Admin)' })
  @ApiResponse({ status: 200, description: 'Slot created/updated' })
  async upsertSlot(@Body() dto: UpsertSlotDto) {
    return this.featuredService.upsertSlot({
      position: dto.position,
      categoryId: dto.categoryId,
      maxListings: dto.maxListings,
      dailyRate: dto.dailyRate,
      weeklyRate: dto.weeklyRate,
      monthlyRate: dto.monthlyRate,
      isActive: dto.isActive ?? true,
    });
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get all featured slots (Admin)' })
  @ApiQuery({ name: 'position', required: false, enum: FeaturedPosition })
  @ApiResponse({ status: 200, description: 'All slots' })
  async getSlots(@Query('position') position?: FeaturedPosition) {
    return this.featuredService.getAvailableSlots(position);
  }

  @Post('listings/:id/activate')
  @ApiOperation({ summary: 'Activate a featured listing after payment (Admin)' })
  @ApiResponse({ status: 200, description: 'Listing activated' })
  @ApiResponse({ status: 400, description: 'Cannot activate listing' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async activateListing(
    @Param('id') listingId: string,
    @Body('paymentId') paymentId: string,
  ) {
    return this.featuredService.activateListing(listingId, paymentId);
  }

  @Post('update-statuses')
  @ApiOperation({ summary: 'Manually trigger status update for all listings (Admin)' })
  @ApiResponse({ status: 200, description: 'Statuses updated' })
  async updateStatuses() {
    await this.featuredService.updateListingStatuses();
    return { message: 'Listing statuses updated successfully' };
  }
}
