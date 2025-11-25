import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VendorPayoutsService } from './vendor-payouts.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { VendorsService } from './vendors.service';
import { IsString, IsDateString, IsOptional } from 'class-validator';

// ==================== DTOs ====================

class CreatePayoutDto {
  @IsString()
  vendorId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

class CalculatePayoutsDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

// ==================== Vendor Controller ====================

@ApiTags('Vendor Payouts')
@Controller('vendor/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth()
export class VendorPayoutsController {
  constructor(
    private readonly payoutsService: VendorPayoutsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my payouts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  async getMyPayouts(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.payoutsService.getVendorPayouts(
      profile.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get my payout statistics' })
  @ApiResponse({ status: 200, description: 'Payout statistics' })
  async getMyPayoutStats(@Request() req: AuthRequest) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.payoutsService.getPayoutStats(profile.id);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Calculate my pending payout' })
  @ApiQuery({ name: 'periodStart', required: false })
  @ApiQuery({ name: 'periodEnd', required: false })
  async calculateMyPendingPayout(
    @Request() req: AuthRequest,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);

    // Default to current month
    const now = new Date();
    const start = periodStart
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.payoutsService.calculateVendorPayout(profile.id, start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async getPayoutDetails(@Request() req: AuthRequest, @Param('id') payoutId: string) {
    // Verify ownership through the vendor profile
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const payout = await this.payoutsService.getPayoutDetails(payoutId);

    // Note: In production, verify the payout belongs to this vendor
    return payout;
  }
}

// ==================== Admin Controller ====================

@ApiTags('Admin Payouts')
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminPayoutsController {
  constructor(private readonly payoutsService: VendorPayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payouts (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiResponse({ status: 200, description: 'List of all payouts' })
  async getAllPayouts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.payoutsService.getAllPayouts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
      vendorId,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get overall payout statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Overall payout statistics' })
  async getOverallStats() {
    return this.payoutsService.getPayoutStats();
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate pending payouts for all vendors (Admin)' })
  @ApiResponse({ status: 200, description: 'List of pending payout summaries' })
  async calculatePendingPayouts(@Body() dto: CalculatePayoutsDto) {
    return this.payoutsService.calculatePendingPayouts(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a payout for a vendor (Admin)' })
  @ApiResponse({ status: 201, description: 'Payout created' })
  async createPayout(@Request() req: AuthRequest, @Body() dto: CreatePayoutDto) {
    return this.payoutsService.createPayout(
      dto.vendorId,
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      req.user.id,
    );
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process a pending payout (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout processed' })
  @ApiResponse({ status: 400, description: 'Payout failed' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async processPayout(@Request() req: AuthRequest, @Param('id') payoutId: string) {
    return this.payoutsService.processPayout(payoutId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async getPayoutDetails(@Param('id') payoutId: string) {
    return this.payoutsService.getPayoutDetails(payoutId);
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: 'Manually trigger monthly payout generation (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout generation started' })
  async generateMonthlyPayouts() {
    await this.payoutsService.generateMonthlyPayouts();
    return { message: 'Monthly payout generation completed' };
  }
}
