import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  ForbiddenException,
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
import { AdminGuard } from '../auth/guards/admin.guard';
import { BillingAuditService } from './billing-audit.service';
import {
  CreateBillingEventDto,
  BillingEventDto,
  BillingAuditTrailDto,
  BillingEventQueryDto,
  BillingEventType,
  ActorType,
} from './dto/billing-event.dto';
import {
  ChargeExplanationDto,
  ChargeQueryDto,
} from './dto/charge-explanation.dto';

/**
 * Billing Audit Controller
 *
 * Provides endpoints for:
 * - Retrieving audit trails for orders
 * - Explaining charges with detailed breakdowns
 * - Logging billing events
 * - Generating billing reports
 */
@ApiTags('Billing Audit')
@Controller('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
export class BillingAuditController {
  constructor(private readonly billingAuditService: BillingAuditService) {}

  // ==================== AUDIT TRAIL ENDPOINTS ====================

  /**
   * Get full audit trail for an order
   * Returns all billing events associated with the order in chronological order
   */
  @Get('audit/:orderId')
  @ApiOperation({
    summary: 'Get billing audit trail for an order',
    description: 'Retrieves the complete billing audit trail for a specific order, including all charges, refunds, adjustments, and related events.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The unique identifier of the order',
    example: 'ORD-123456',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: BillingEventType,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter events after this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter events before this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of events to return (default: 50, max: 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of events to skip for pagination',
    example: 0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit trail retrieved successfully',
    type: BillingAuditTrailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found or no billing events exist',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - valid JWT token required',
  })
  async getOrderAuditTrail(
    @Param('orderId') orderId: string,
    @Query() query: BillingEventQueryDto,
  ): Promise<BillingAuditTrailDto> {
    return this.billingAuditService.getOrderAuditTrail(orderId, query);
  }

  /**
   * Query billing events with filters
   */
  @Get('audit')
  @ApiOperation({
    summary: 'Query billing events',
    description: 'Search and filter billing events across all orders with various criteria.',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: String,
    description: 'Filter by order ID',
  })
  @ApiQuery({
    name: 'chargeId',
    required: false,
    type: String,
    description: 'Filter by charge ID',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: BillingEventType,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'actorType',
    required: false,
    enum: ActorType,
    description: 'Filter by actor type (user, system, admin, etc.)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter events after this date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter events before this date',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of events to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of events to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing events retrieved successfully',
  })
  async queryBillingEvents(
    @Query() query: BillingEventQueryDto,
  ): Promise<{
    data: BillingEventDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.billingAuditService.queryBillingEvents(query);
  }

  // ==================== CHARGE EXPLANATION ENDPOINTS ====================

  /**
   * Get detailed explanation of a specific charge
   * Returns a customer-friendly breakdown of all components
   */
  @Get('explain/:chargeId')
  @ApiOperation({
    summary: 'Explain a specific charge',
    description: 'Provides a detailed, customer-friendly breakdown of a charge including line items, taxes, discounts, shipping, and payment details.',
  })
  @ApiParam({
    name: 'chargeId',
    description: 'The unique identifier of the charge',
    example: 'CHG-789ABC',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Charge explanation retrieved successfully',
    type: ChargeExplanationDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Charge not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - valid JWT token required',
  })
  async explainCharge(
    @Param('chargeId') chargeId: string,
  ): Promise<ChargeExplanationDto> {
    return this.billingAuditService.explainCharge(chargeId);
  }

  // ==================== EVENT LOGGING ENDPOINTS ====================

  /**
   * Log a new billing event
   * Used internally by other services to record billing activities
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Log a billing event',
    description: 'Records a new billing event to the audit trail. Supports idempotency keys to prevent duplicate entries.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Billing event logged successfully',
    type: BillingEventDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid event data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - valid JWT token required',
  })
  async logBillingEvent(
    @Body() dto: CreateBillingEventDto,
    @Req() req: any,
  ): Promise<BillingEventDto> {
    // Enrich actor information from request if not provided
    if (!dto.actor) {
      dto.actor = {
        type: ActorType.API,
        id: req.user?.id,
        email: req.user?.email,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      };
    } else if (!dto.actor.ipAddress) {
      dto.actor.ipAddress = req.ip || req.connection?.remoteAddress;
      dto.actor.userAgent = req.headers?.['user-agent'];
    }

    return this.billingAuditService.logBillingEvent(dto);
  }

  // ==================== REPORT ENDPOINTS ====================

  /**
   * Generate a charge report for a date range
   */
  @Get('reports/charges')
  @ApiOperation({
    summary: 'Generate charge report',
    description: 'Generates a summary report of charges within a specified date range, including totals by status and payment method.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Report start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'Report end date (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by charge status',
  })
  @ApiQuery({
    name: 'includeRefunds',
    required: false,
    type: Boolean,
    description: 'Include refund information in report',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Charge report generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid date range or parameters',
  })
  async generateChargeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('includeRefunds') includeRefunds?: string,
  ): Promise<{
    period: { start: string; end: string };
    summary: {
      totalCharges: number;
      totalAmount: number;
      totalRefunded: number;
      netAmount: number;
      chargeCount: number;
      refundCount: number;
    };
    byStatus: Record<string, { count: number; amount: number }>;
    byPaymentMethod: Record<string, { count: number; amount: number }>;
  }> {
    return this.billingAuditService.generateChargeReport(
      new Date(startDate),
      new Date(endDate),
      {
        customerId,
        status,
        includeRefunds: includeRefunds === 'true',
      },
    );
  }

  // ==================== CONVENIENCE ENDPOINTS ====================

  /**
   * Get audit trail for a specific charge
   */
  @Get('charges/:chargeId/audit')
  @ApiOperation({
    summary: 'Get audit trail for a charge',
    description: 'Retrieves all billing events associated with a specific charge.',
  })
  @ApiParam({
    name: 'chargeId',
    description: 'The charge ID',
    example: 'CHG-789ABC',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Charge audit trail retrieved successfully',
  })
  async getChargeAuditTrail(
    @Param('chargeId') chargeId: string,
  ): Promise<{
    data: BillingEventDto[];
    total: number;
  }> {
    const result = await this.billingAuditService.queryBillingEvents({
      chargeId,
      limit: 100,
      offset: 0,
    });

    return {
      data: result.data,
      total: result.total,
    };
  }

  /**
   * Get recent billing activity
   */
  @Get('activity/recent')
  @ApiOperation({
    summary: 'Get recent billing activity',
    description: 'Returns the most recent billing events across all orders.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of events to return (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activity retrieved successfully',
  })
  async getRecentActivity(
    @Query('limit') limit?: string,
  ): Promise<BillingEventDto[]> {
    const result = await this.billingAuditService.queryBillingEvents({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: 0,
    });

    return result.data;
  }

  /**
   * Get billing events by event type
   */
  @Get('events/type/:eventType')
  @ApiOperation({
    summary: 'Get events by type',
    description: 'Retrieves billing events filtered by a specific event type.',
  })
  @ApiParam({
    name: 'eventType',
    description: 'The event type to filter by',
    enum: BillingEventType,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter events after this date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter events before this date',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of events to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of events to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Events retrieved successfully',
  })
  async getEventsByType(
    @Param('eventType') eventType: BillingEventType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    data: BillingEventDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.billingAuditService.queryBillingEvents({
      eventType,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Get refund events for an order
   */
  @Get('orders/:orderId/refunds')
  @ApiOperation({
    summary: 'Get refund events for an order',
    description: 'Retrieves all refund-related events for a specific order.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The order ID',
    example: 'ORD-123456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund events retrieved successfully',
  })
  async getOrderRefunds(
    @Param('orderId') orderId: string,
  ): Promise<BillingEventDto[]> {
    const auditTrail = await this.billingAuditService.getOrderAuditTrail(orderId, {
      limit: 100,
      offset: 0,
    });

    return auditTrail.events.filter(
      event =>
        event.eventType === BillingEventType.REFUND_INITIATED ||
        event.eventType === BillingEventType.REFUND_COMPLETED ||
        event.eventType === BillingEventType.REFUND_FAILED ||
        event.eventType === BillingEventType.CHARGE_REFUNDED
    );
  }

  /**
   * Get tax calculation events for an order
   */
  @Get('orders/:orderId/tax')
  @ApiOperation({
    summary: 'Get tax calculation events for an order',
    description: 'Retrieves all tax-related events and calculations for a specific order.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The order ID',
    example: 'ORD-123456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax events retrieved successfully',
  })
  async getOrderTaxEvents(
    @Param('orderId') orderId: string,
  ): Promise<BillingEventDto[]> {
    const auditTrail = await this.billingAuditService.getOrderAuditTrail(orderId, {
      limit: 100,
      offset: 0,
    });

    return auditTrail.events.filter(
      event => event.eventType === BillingEventType.TAX_CALCULATED
    );
  }

  /**
   * Get discount application events for an order
   */
  @Get('orders/:orderId/discounts')
  @ApiOperation({
    summary: 'Get discount events for an order',
    description: 'Retrieves all discount application events for a specific order.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The order ID',
    example: 'ORD-123456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discount events retrieved successfully',
  })
  async getOrderDiscountEvents(
    @Param('orderId') orderId: string,
  ): Promise<BillingEventDto[]> {
    const auditTrail = await this.billingAuditService.getOrderAuditTrail(orderId, {
      limit: 100,
      offset: 0,
    });

    return auditTrail.events.filter(
      event => event.eventType === BillingEventType.DISCOUNT_APPLIED
    );
  }
}
