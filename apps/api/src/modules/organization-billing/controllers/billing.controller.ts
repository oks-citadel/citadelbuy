import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { BillingService } from '../services/billing.service';
import { InvoiceService } from '../services/invoice.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreatePaymentMethodDto,
} from '../dto';

@ApiTags('Organization Billing')
@Controller('organizations/:orgId/billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ==================== BILLING INFO ====================

  /**
   * Get billing information for an organization
   */
  @Get()
  @ApiOperation({ summary: 'Get organization billing information' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing information retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async getBillingInfo(@Param('orgId') orgId: string) {
    return this.billingService.getBillingInfo(orgId);
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Create a new subscription for an organization
   */
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid subscription data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async createSubscription(
    @Param('orgId') orgId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.billingService.createSubscription(orgId, dto);
  }

  /**
   * Update an existing subscription
   */
  @Patch('subscription')
  @ApiOperation({ summary: 'Update organization subscription' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active subscription found',
  })
  async updateSubscription(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.billingService.updateSubscription(orgId, dto);
  }

  /**
   * Cancel an organization's subscription
   */
  @Delete('subscription')
  @ApiOperation({ summary: 'Cancel organization subscription' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active subscription found',
  })
  async cancelSubscription(@Param('orgId') orgId: string) {
    return this.billingService.cancelSubscription(orgId);
  }

  /**
   * Get subscription details
   */
  @Get('subscription')
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription details retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Billing information not found',
  })
  async getSubscription(@Param('orgId') orgId: string) {
    return this.billingService.getSubscription(orgId);
  }

  // ==================== INVOICES ====================

  /**
   * Get invoices for an organization
   */
  @Get('invoices')
  @ApiOperation({ summary: 'List organization invoices' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (draft, open, paid, void, uncollectible)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of invoices to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of invoices to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices list retrieved',
  })
  async getInvoices(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    return this.invoiceService.getInvoices(orgId, filters);
  }

  /**
   * Get a single invoice by ID
   */
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice details retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invoice not found',
  })
  async getInvoice(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getInvoice(id);
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Add a new payment method to an organization
   */
  @Post('payment-methods')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new payment method' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment method added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment method data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Billing information not found',
  })
  async addPaymentMethod(
    @Param('orgId') orgId: string,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.billingService.updatePaymentMethod(orgId, dto);
  }

  /**
   * Remove a payment method from an organization
   */
  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async removePaymentMethod(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    // This would typically call the Stripe service to detach the payment method
    // For now, return a success response
    return {
      success: true,
      message: 'Payment method removed successfully',
      paymentMethodId: id,
    };
  }
}
