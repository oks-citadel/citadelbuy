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
import { VendorCommissionsService } from './vendor-commissions.service';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { CreateCommissionRuleDto, UpdateCommissionRuleDto } from './dto';

// ==================== Vendor Controller ====================

@ApiTags('Vendor Commissions')
@Controller('vendor/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@ApiBearerAuth()
export class VendorCommissionsController {
  constructor(
    private readonly commissionsService: VendorCommissionsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get('rules')
  @ApiOperation({ summary: 'Get my commission rules' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of commission rules' })
  async getMyRules(
    @Request() req: AuthRequest,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.getCommissionRules(
      profile.id,
      includeInactive === true || String(includeInactive) === 'true',
    );
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get a specific commission rule' })
  @ApiResponse({ status: 200, description: 'Commission rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Request() req: AuthRequest, @Param('id') ruleId: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.getCommissionRule(profile.id, ruleId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a new commission rule' })
  @ApiResponse({ status: 201, description: 'Commission rule created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createRule(@Request() req: AuthRequest, @Body() dto: CreateCommissionRuleDto) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.createCommissionRule(profile.id, dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update a commission rule' })
  @ApiResponse({ status: 200, description: 'Commission rule updated' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(
    @Request() req: AuthRequest,
    @Param('id') ruleId: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.updateCommissionRule(profile.id, ruleId, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a commission rule' })
  @ApiResponse({ status: 200, description: 'Commission rule deleted' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRule(@Request() req: AuthRequest, @Param('id') ruleId: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.deleteCommissionRule(profile.id, ruleId);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate commission for a given order amount' })
  @ApiResponse({ status: 200, description: 'Commission calculation result' })
  async calculateCommission(
    @Request() req: AuthRequest,
    @Body() dto: { orderAmount: number; categoryId?: string },
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.commissionsService.calculateCommissionForOrder(
      profile.id,
      dto.orderAmount,
      dto.categoryId,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get commission summary for a period' })
  @ApiQuery({ name: 'periodStart', required: false })
  @ApiQuery({ name: 'periodEnd', required: false })
  @ApiResponse({ status: 200, description: 'Commission summary' })
  async getCommissionSummary(
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

    return this.commissionsService.getCommissionSummary(profile.id, start, end);
  }
}

// ==================== Admin Controller ====================

@ApiTags('Admin Commissions')
@Controller('admin/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminCommissionsController {
  constructor(private readonly commissionsService: VendorCommissionsService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Get all commission rules (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiResponse({ status: 200, description: 'List of all commission rules' })
  async getAllRules(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.commissionsService.getAllCommissionRules(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      vendorId,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get commission statistics (Admin)' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiResponse({ status: 200, description: 'Commission statistics' })
  async getStats(@Query('vendorId') vendorId?: string) {
    return this.commissionsService.getCommissionStats(vendorId);
  }

  @Get('vendor/:vendorId/rules')
  @ApiOperation({ summary: 'Get commission rules for a specific vendor (Admin)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of vendor commission rules' })
  async getVendorRules(
    @Param('vendorId') vendorId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.commissionsService.getCommissionRules(
      vendorId,
      includeInactive === true || String(includeInactive) === 'true',
    );
  }

  @Get('vendor/:vendorId/summary')
  @ApiOperation({ summary: 'Get commission summary for a vendor (Admin)' })
  @ApiQuery({ name: 'periodStart', required: false })
  @ApiQuery({ name: 'periodEnd', required: false })
  @ApiResponse({ status: 200, description: 'Vendor commission summary' })
  async getVendorSummary(
    @Param('vendorId') vendorId: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    const now = new Date();
    const start = periodStart
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.commissionsService.getCommissionSummary(vendorId, start, end);
  }
}
