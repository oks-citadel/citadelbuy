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
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LocalizationService } from './localization.service';
import {
  CreateLocalizedPriceDto,
  ConvertCurrencyDto,
  SetCurrencyRateDto,
  GeoDetectionDto,
  CreateRegionalComplianceDto,
  CheckComplianceDto,
} from './dto/localization.dto';

@ApiTags('Marketing - Localization')
@Controller('marketing/localization')
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  // Localized Pricing Endpoints
  @Post('prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create localized price' })
  @ApiResponse({ status: 201, description: 'Price created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createLocalizedPrice(@Body() dto: CreateLocalizedPriceDto) {
    return this.localizationService.createLocalizedPrice(dto);
  }

  @Get('prices/:productId')
  @ApiOperation({ summary: 'Get localized prices for product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Prices retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getLocalizedPrices(@Param('productId') productId: string) {
    return this.localizationService.getLocalizedPrices(productId);
  }

  @Get('prices/:productId/:countryCode')
  @ApiOperation({ summary: 'Get localized price for product and country' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiParam({ name: 'countryCode', description: 'Country code (ISO 3166-1 alpha-2)' })
  @ApiResponse({ status: 200, description: 'Price retrieved' })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getLocalizedPrice(
    @Param('productId') productId: string,
    @Param('countryCode') countryCode: string,
  ) {
    return this.localizationService.getLocalizedPrice(productId, countryCode);
  }

  @Put('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update localized price' })
  @ApiParam({ name: 'id', description: 'Price ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateLocalizedPrice(@Param('id') id: string, @Body() dto: Partial<CreateLocalizedPriceDto>) {
    return this.localizationService.updateLocalizedPrice(id, dto);
  }

  @Delete('prices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete localized price' })
  @ApiParam({ name: 'id', description: 'Price ID' })
  @ApiResponse({ status: 204, description: 'Price deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteLocalizedPrice(@Param('id') id: string) {
    await this.localizationService.deleteLocalizedPrice(id);
  }

  // Currency Endpoints
  @Post('currency/convert')
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ status: 200, description: 'Conversion result' })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async convertCurrency(@Body() dto: ConvertCurrencyDto) {
    return this.localizationService.convertCurrency(dto.amount, dto.fromCurrency, dto.toCurrency);
  }

  @Get('currency/rates')
  @ApiOperation({ summary: 'Get currency exchange rates' })
  @ApiQuery({ name: 'baseCurrency', required: false })
  @ApiResponse({ status: 200, description: 'Rates retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCurrencyRates(@Query('baseCurrency') baseCurrency?: string) {
    return this.localizationService.getCurrencyRates(baseCurrency);
  }

  @Post('currency/rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set currency exchange rate' })
  @ApiResponse({ status: 201, description: 'Rate set' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async setCurrencyRate(@Body() dto: SetCurrencyRateDto) {
    return this.localizationService.setCurrencyRate(dto.baseCurrency, dto.targetCurrency, dto.rate);
  }

  // Geo Detection Endpoints
  @Get('geo/detect')
  @ApiOperation({ summary: 'Detect geo location' })
  @ApiResponse({ status: 200, description: 'Geo location detected' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async detectGeoLocation(@Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    return this.localizationService.detectGeoLocation(ip);
  }

  @Post('geo/detect')
  @ApiOperation({ summary: 'Detect geo location by IP' })
  @ApiResponse({ status: 200, description: 'Geo location detected' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async detectGeoLocationByIp(@Body() dto: GeoDetectionDto) {
    return this.localizationService.detectGeoLocation(dto.ipAddress);
  }

  @Get('geo/country/:countryCode')
  @ApiOperation({ summary: 'Get country information' })
  @ApiParam({ name: 'countryCode', description: 'Country code (ISO 3166-1 alpha-2)' })
  @ApiResponse({ status: 200, description: 'Country info retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCountryInfo(@Param('countryCode') countryCode: string) {
    return this.localizationService.getCountryInfo(countryCode.toUpperCase());
  }

  // Regional Compliance Endpoints
  @Post('compliance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create regional compliance rule' })
  @ApiResponse({ status: 201, description: 'Compliance rule created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createRegionalCompliance(@Body() dto: CreateRegionalComplianceDto) {
    return this.localizationService.createRegionalCompliance(dto);
  }

  @Get('compliance/:region')
  @ApiOperation({ summary: 'Get compliance rules for region' })
  @ApiParam({ name: 'region', description: 'Region/country code' })
  @ApiResponse({ status: 200, description: 'Compliance rules retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getRegionalCompliance(@Param('region') region: string) {
    return this.localizationService.getRegionalCompliance(region);
  }

  @Post('compliance/check')
  @ApiOperation({ summary: 'Check compliance requirements' })
  @ApiResponse({ status: 200, description: 'Compliance check result' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async checkCompliance(@Body() dto: CheckComplianceDto) {
    return this.localizationService.checkCompliance(dto.countryCode, dto.regionCode, dto.complianceTypes);
  }

  @Put('compliance/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update compliance rule' })
  @ApiParam({ name: 'id', description: 'Compliance rule ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateRegionalCompliance(@Param('id') id: string, @Body() dto: Partial<CreateRegionalComplianceDto>) {
    return this.localizationService.updateRegionalCompliance(id, dto);
  }

  @Delete('compliance/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete compliance rule' })
  @ApiParam({ name: 'id', description: 'Compliance rule ID' })
  @ApiResponse({ status: 204, description: 'Rule deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRegionalCompliance(@Param('id') id: string) {
    await this.localizationService.deleteRegionalCompliance(id);
  }
}
