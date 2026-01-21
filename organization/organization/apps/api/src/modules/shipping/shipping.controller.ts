import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CalculateRateDto,
  CreateShipmentDto,
  TrackShipmentDto,
  CreateReturnLabelDto,
  CreateShippingProviderDto,
  UpdateShippingProviderDto,
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
  CreateShippingRuleDto,
  UpdateShippingRuleDto,
  DeliveryConfirmationWebhookDto,
} from './dto/shipping.dto';

@Controller('shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ==================== Rate Calculation ====================

  @Post('rates/calculate')
  async calculateRates(@Body() dto: CalculateRateDto) {
    return this.shippingService.calculateRates(dto);
  }

  @Post('rates/compare')
  async compareRates(@Body() body: { rateRequest: CalculateRateDto; cartTotal?: number }) {
    return this.shippingService.compareRates(body.rateRequest, body.cartTotal);
  }

  @Post('rates/clear-cache')
  @Roles('ADMIN')
  async clearRateCache() {
    await this.shippingService.clearRateCache();
    return { message: 'Rate cache cleared successfully' };
  }

  @Post('package/calculate-dimensions')
  async calculatePackageDimensions(@Body() body: { productIds: string[] }) {
    return this.shippingService.calculatePackageDimensions(body.productIds);
  }

  // ==================== Shipments & Labels ====================

  @Post('shipments')
  @Roles('ADMIN')
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.shippingService.createShipment(dto);
  }

  @Post('shipments/track')
  async trackShipment(@Body() dto: TrackShipmentDto) {
    return this.shippingService.trackShipment(dto);
  }

  // ==================== Return Labels ====================

  @Post('returns/labels')
  @Roles('ADMIN')
  async createReturnLabel(@Body() dto: CreateReturnLabelDto) {
    return this.shippingService.createReturnLabel(dto);
  }

  // ==================== Delivery Confirmation Webhook ====================

  @Post('webhooks/delivery-confirmation')
  async handleDeliveryConfirmation(@Body() dto: DeliveryConfirmationWebhookDto) {
    return this.shippingService.handleDeliveryConfirmation(dto);
  }

  // ==================== Provider Management ====================

  @Post('providers')
  @Roles('ADMIN')
  async createProvider(@Body() dto: CreateShippingProviderDto) {
    return this.shippingService.createProvider(dto);
  }

  @Patch('providers/:id')
  @Roles('ADMIN')
  async updateProvider(@Param('id') id: string, @Body() dto: UpdateShippingProviderDto) {
    return this.shippingService.updateProvider(id, dto);
  }

  @Get('providers')
  @Roles('ADMIN')
  async getProviders() {
    return this.shippingService.getProviders();
  }

  // ==================== Shipping Zones ====================

  @Post('zones')
  @Roles('ADMIN')
  async createZone(@Body() dto: CreateShippingZoneDto) {
    return this.shippingService.createZone(dto);
  }

  @Patch('zones/:id')
  @Roles('ADMIN')
  async updateZone(@Param('id') id: string, @Body() dto: UpdateShippingZoneDto) {
    return this.shippingService.updateZone(id, dto);
  }

  @Get('zones')
  @Roles('ADMIN')
  async getZones(@Query('providerId') providerId?: string) {
    return this.shippingService.getZones(providerId);
  }

  // ==================== Shipping Rules ====================

  @Post('rules')
  @Roles('ADMIN')
  async createRule(@Body() dto: CreateShippingRuleDto) {
    return this.shippingService.createRule(dto);
  }

  @Patch('rules/:id')
  @Roles('ADMIN')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateShippingRuleDto) {
    return this.shippingService.updateRule(id, dto);
  }

  @Get('rules')
  @Roles('ADMIN')
  async getRules(@Query('zoneId') zoneId?: string) {
    return this.shippingService.getRules(zoneId);
  }

  // ==================== Multi-Warehouse Selection ====================

  @Post('warehouse/select')
  @Roles('ADMIN')
  async selectOptimalWarehouse(@Body() body: { toAddress: any; productIds: string[] }) {
    return this.shippingService.selectOptimalWarehouse(body.toAddress, body.productIds);
  }
}
