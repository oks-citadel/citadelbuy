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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TaxService } from './tax.service';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CalculateTaxDto,
  TaxCalculationResultDto,
} from './dto/create-tax-rate.dto';
import {
  CreateTaxExemptionDto,
  VerifyTaxExemptionDto,
} from './dto/create-tax-exemption.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TaxRateStatus, TaxType } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Tax Management')
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  // ==============================================
  // TAX RATE MANAGEMENT
  // ==============================================

  @Post('rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tax rate' })
  @ApiResponse({
    status: 201,
    description: 'Tax rate created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createTaxRate(@Body() createTaxRateDto: CreateTaxRateDto) {
    return this.taxService.createTaxRate(createTaxRateDto);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get all tax rates' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country code' })
  @ApiQuery({ name: 'state', required: false, description: 'Filter by state/province' })
  @ApiQuery({ name: 'status', required: false, enum: TaxRateStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'taxType', required: false, enum: TaxType, description: 'Filter by tax type' })
  @ApiResponse({
    status: 200,
    description: 'Tax rates retrieved successfully',
  })
  async findAllTaxRates(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('status') status?: TaxRateStatus,
    @Query('taxType') taxType?: TaxType,
  ) {
    return this.taxService.findAllTaxRates({
      country,
      state,
      status,
      taxType,
    });
  }

  @Get('rates/:id')
  @ApiOperation({ summary: 'Get tax rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tax rate retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  async findTaxRateById(@Param('id') id: string) {
    return this.taxService.findTaxRateById(id);
  }

  @Put('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiResponse({
    status: 200,
    description: 'Tax rate updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  async updateTaxRate(
    @Param('id') id: string,
    @Body() updateTaxRateDto: UpdateTaxRateDto,
  ) {
    return this.taxService.updateTaxRate(id, updateTaxRateDto);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tax rate' })
  @ApiResponse({
    status: 204,
    description: 'Tax rate deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  async deleteTaxRate(@Param('id') id: string) {
    return this.taxService.deleteTaxRate(id);
  }

  // ==============================================
  // TAX CALCULATION
  // ==============================================

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate tax for an order' })
  @ApiResponse({
    status: 200,
    description: 'Tax calculated successfully',
    type: TaxCalculationResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid calculation data' })
  async calculateTax(
    @Body() calculateTaxDto: CalculateTaxDto,
  ): Promise<TaxCalculationResultDto> {
    return this.taxService.calculateTax(calculateTaxDto);
  }

  @Post('orders/:orderId/calculate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate and store tax for an order' })
  @ApiResponse({
    status: 200,
    description: 'Tax calculated and stored successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async calculateOrderTax(
    @Param('orderId') orderId: string,
    @Body() calculateTaxDto: CalculateTaxDto,
  ) {
    return this.taxService.calculateOrderTax(orderId, calculateTaxDto);
  }

  // ==============================================
  // TAX EXEMPTION MANAGEMENT
  // ==============================================

  @Post('exemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tax exemption' })
  @ApiResponse({
    status: 201,
    description: 'Tax exemption created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createTaxExemption(
    @Body() createTaxExemptionDto: CreateTaxExemptionDto,
    @Request() req: AuthRequest,
  ) {
    return this.taxService.createTaxExemption(
      createTaxExemptionDto,
      req.user.userId,
    );
  }

  @Get('exemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tax exemptions' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'Tax exemptions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAllTaxExemptions(
    @Query('userId') userId?: string,
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.taxService.findAllTaxExemptions({
      userId,
      productId,
      categoryId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('exemptions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tax exemption by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tax exemption retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax exemption not found' })
  async findTaxExemptionById(@Param('id') id: string) {
    return this.taxService.findTaxExemptionById(id);
  }

  @Post('exemptions/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a tax exemption' })
  @ApiResponse({
    status: 200,
    description: 'Tax exemption verified successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax exemption not found' })
  async verifyTaxExemption(
    @Body() verifyTaxExemptionDto: VerifyTaxExemptionDto,
    @Request() req: AuthRequest,
  ) {
    return this.taxService.verifyTaxExemption(
      verifyTaxExemptionDto,
      req.user.userId,
    );
  }

  @Delete('exemptions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tax exemption' })
  @ApiResponse({
    status: 204,
    description: 'Tax exemption deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax exemption not found' })
  async deleteTaxExemption(@Param('id') id: string) {
    return this.taxService.deleteTaxExemption(id);
  }

  // ==============================================
  // TAX REPORTING
  // ==============================================

  @Post('reports/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a tax report' })
  @ApiResponse({
    status: 201,
    description: 'Tax report generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async generateTaxReport(
    @Body()
    reportParams: {
      reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
      periodStart: string;
      periodEnd: string;
      country: string;
      state?: string;
    },
  ) {
    return this.taxService.generateTaxReport({
      ...reportParams,
      periodStart: new Date(reportParams.periodStart),
      periodEnd: new Date(reportParams.periodEnd),
    });
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tax reports' })
  @ApiQuery({ name: 'country', required: false, description: 'Filter by country' })
  @ApiQuery({ name: 'state', required: false, description: 'Filter by state' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Filter by report type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({
    status: 200,
    description: 'Tax reports retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTaxReports(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('reportType') reportType?: string,
    @Query('status') status?: string,
  ) {
    return this.taxService.getTaxReports({
      country,
      state,
      reportType,
      status,
    });
  }

  @Post('reports/:id/finalize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize a tax report' })
  @ApiResponse({
    status: 200,
    description: 'Tax report finalized successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Tax report not found' })
  async finalizeTaxReport(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.taxService.finalizeTaxReport(id, req.user.userId);
  }
}
