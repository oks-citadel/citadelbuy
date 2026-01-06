import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateBillingEventDto,
  BillingEventDto,
  BillingAuditTrailDto,
  BillingEventType,
  BillingEventQueryDto,
  ActorType,
  ActorDto,
  FeeCalculationDto,
  GatewayResponseDto,
  TaxDetailDto,
  DiscountDetailDto,
  CurrencyConversionDto,
} from './dto/billing-event.dto';
import {
  ChargeExplanationDto,
  OrderSummaryDto,
  LineItemDto,
  TaxBreakdownDto,
  ShippingDetailsDto,
  PaymentInfoDto,
  RefundInfoDto,
} from './dto/charge-explanation.dto';

/**
 * Internal interface for stored billing events
 */
interface StoredBillingEvent {
  id: string;
  eventType: BillingEventType;
  orderId: string;
  chargeId?: string;
  amount: number;
  currency: string;
  actor: ActorDto;
  feeCalculation?: FeeCalculationDto;
  gatewayResponse?: GatewayResponseDto;
  currencyConversion?: CurrencyConversionDto;
  idempotencyKey?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Billing Audit Service
 *
 * Provides comprehensive tracking of all billing events including:
 * - Charges, refunds, and adjustments
 * - Fee calculations (base, tax, shipping, discounts)
 * - Payment gateway responses
 * - Charge explanation reports for customers
 */
@Injectable()
export class BillingAuditService {
  private readonly logger = new Logger(BillingAuditService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly AUDIT_EVENT_PREFIX = 'billing:audit:';
  private readonly CHARGE_PREFIX = 'billing:charge:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== EVENT LOGGING ====================

  /**
   * Log a billing event to the audit trail
   * This is the primary method for recording all billing activities
   */
  async logBillingEvent(dto: CreateBillingEventDto): Promise<BillingEventDto> {
    this.logger.log(`Logging billing event: ${dto.eventType} for order ${dto.orderId}`);

    // Check for duplicate events using idempotency key
    if (dto.idempotencyKey) {
      const existingEvent = await this.findEventByIdempotencyKey(dto.idempotencyKey);
      if (existingEvent) {
        this.logger.warn(`Duplicate event detected with idempotency key: ${dto.idempotencyKey}`);
        return existingEvent;
      }
    }

    const eventId = `evt_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const timestamp = new Date();

    // Set default actor if not provided
    const actor: ActorDto = dto.actor || {
      type: ActorType.SYSTEM,
      source: 'billing-audit-service',
    };

    const billingEvent: StoredBillingEvent = {
      id: eventId,
      eventType: dto.eventType,
      orderId: dto.orderId,
      chargeId: dto.chargeId,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      actor,
      feeCalculation: dto.feeCalculation,
      gatewayResponse: dto.gatewayResponse,
      currencyConversion: dto.currencyConversion,
      idempotencyKey: dto.idempotencyKey,
      reason: dto.reason,
      metadata: dto.metadata,
      timestamp,
      createdAt: timestamp,
    };

    // Store the event
    await this.storeEvent(billingEvent);

    // Invalidate related caches
    await this.invalidateAuditCache(dto.orderId);
    if (dto.chargeId) {
      await this.invalidateChargeCache(dto.chargeId);
    }

    this.logger.log(`Billing event logged successfully: ${eventId}`);

    return this.transformStoredEventToDto(billingEvent);
  }

  /**
   * Log a charge creation event
   */
  async logChargeCreated(
    orderId: string,
    chargeId: string,
    amount: number,
    currency: string,
    feeCalculation: FeeCalculationDto,
    gatewayResponse: GatewayResponseDto,
    actor?: ActorDto,
    idempotencyKey?: string,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType: BillingEventType.CHARGE_CREATED,
      orderId,
      chargeId,
      amount,
      currency,
      feeCalculation,
      gatewayResponse,
      actor,
      idempotencyKey,
    });
  }

  /**
   * Log a charge capture event
   */
  async logChargeCaptured(
    orderId: string,
    chargeId: string,
    amount: number,
    currency: string,
    gatewayResponse: GatewayResponseDto,
    actor?: ActorDto,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType: BillingEventType.CHARGE_CAPTURED,
      orderId,
      chargeId,
      amount,
      currency,
      gatewayResponse,
      actor,
    });
  }

  /**
   * Log a refund event
   */
  async logRefund(
    orderId: string,
    chargeId: string,
    amount: number,
    currency: string,
    reason: string,
    gatewayResponse: GatewayResponseDto,
    actor?: ActorDto,
    isComplete: boolean = true,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType: isComplete ? BillingEventType.REFUND_COMPLETED : BillingEventType.REFUND_INITIATED,
      orderId,
      chargeId,
      amount,
      currency,
      gatewayResponse,
      actor,
      reason,
    });
  }

  /**
   * Log an adjustment event (e.g., price correction, goodwill credit)
   */
  async logAdjustment(
    orderId: string,
    chargeId: string,
    amount: number,
    currency: string,
    reason: string,
    actor: ActorDto,
    metadata?: Record<string, any>,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType: BillingEventType.ADJUSTMENT_APPLIED,
      orderId,
      chargeId,
      amount,
      currency,
      actor,
      reason,
      metadata,
    });
  }

  /**
   * Log tax calculation event
   */
  async logTaxCalculation(
    orderId: string,
    taxAmount: number,
    currency: string,
    taxDetails: TaxDetailDto[],
    actor?: ActorDto,
  ): Promise<BillingEventDto> {
    const feeCalculation: FeeCalculationDto = {
      baseAmount: 0,
      taxAmount,
      shippingAmount: 0,
      handlingFee: 0,
      platformFee: 0,
      discountAmount: 0,
      totalAmount: taxAmount,
      taxBreakdown: taxDetails,
    };

    return this.logBillingEvent({
      eventType: BillingEventType.TAX_CALCULATED,
      orderId,
      amount: taxAmount,
      currency,
      feeCalculation,
      actor,
      metadata: { taxDetails },
    });
  }

  /**
   * Log discount application event
   */
  async logDiscountApplied(
    orderId: string,
    discountAmount: number,
    currency: string,
    discounts: DiscountDetailDto[],
    actor?: ActorDto,
  ): Promise<BillingEventDto> {
    const feeCalculation: FeeCalculationDto = {
      baseAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      handlingFee: 0,
      platformFee: 0,
      discountAmount,
      totalAmount: -discountAmount,
      discountsApplied: discounts,
    };

    return this.logBillingEvent({
      eventType: BillingEventType.DISCOUNT_APPLIED,
      orderId,
      amount: discountAmount,
      currency,
      feeCalculation,
      actor,
      metadata: { discounts },
    });
  }

  /**
   * Log currency conversion event
   */
  async logCurrencyConversion(
    orderId: string,
    conversionDetails: CurrencyConversionDto,
    actor?: ActorDto,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType: BillingEventType.CURRENCY_CONVERTED,
      orderId,
      amount: conversionDetails.convertedAmount,
      currency: conversionDetails.toCurrency,
      currencyConversion: conversionDetails,
      actor,
    });
  }

  /**
   * Log payment gateway response
   */
  async logGatewayResponse(
    orderId: string,
    chargeId: string,
    gatewayResponse: GatewayResponseDto,
    eventType: BillingEventType = BillingEventType.CHARGE_CAPTURED,
  ): Promise<BillingEventDto> {
    return this.logBillingEvent({
      eventType,
      orderId,
      chargeId,
      amount: 0, // Gateway response may not include amount
      currency: 'USD',
      gatewayResponse,
      actor: {
        type: ActorType.WEBHOOK,
        source: gatewayResponse.gateway,
      },
    });
  }

  // ==================== AUDIT TRAIL RETRIEVAL ====================

  /**
   * Get full audit trail for an order
   */
  async getOrderAuditTrail(
    orderId: string,
    query?: BillingEventQueryDto,
  ): Promise<BillingAuditTrailDto> {
    this.logger.log(`Retrieving audit trail for order: ${orderId}`);

    // Check cache first
    const cacheKey = `${this.AUDIT_EVENT_PREFIX}order:${orderId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached && !query) {
      return cached as BillingAuditTrailDto;
    }

    // Retrieve events from storage
    const events = await this.getEventsForOrder(orderId, query);

    const result: BillingAuditTrailDto = {
      orderId,
      events: events.map(this.transformStoredEventToDto),
      total: events.length,
      limit: query?.limit || 50,
      offset: query?.offset || 0,
    };

    // Cache if no filters applied
    if (!query) {
      await this.redis.set(cacheKey, result, this.CACHE_TTL);
    }

    return result;
  }

  /**
   * Query billing events with filters
   */
  async queryBillingEvents(query: BillingEventQueryDto): Promise<{
    data: BillingEventDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    this.logger.log('Querying billing events with filters');

    const events = await this.queryEvents(query);
    const total = await this.countEvents(query);

    return {
      data: events.map(this.transformStoredEventToDto),
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };
  }

  // ==================== CHARGE EXPLANATION ====================

  /**
   * Generate a detailed, customer-friendly charge explanation
   */
  async explainCharge(chargeId: string): Promise<ChargeExplanationDto> {
    this.logger.log(`Generating charge explanation for: ${chargeId}`);

    // Check cache first
    const cacheKey = `${this.CHARGE_PREFIX}explain:${chargeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached as ChargeExplanationDto;
    }

    // Get all billing events related to this charge
    const events = await this.getEventsByChargeId(chargeId);
    if (events.length === 0) {
      throw new NotFoundException(`No billing events found for charge: ${chargeId}`);
    }

    // Get the original charge creation event
    const chargeEvent = events.find(
      e => e.eventType === BillingEventType.CHARGE_CREATED ||
           e.eventType === BillingEventType.CHARGE_CAPTURED
    );

    if (!chargeEvent) {
      throw new NotFoundException(`Charge event not found for: ${chargeId}`);
    }

    // Build the charge explanation
    const explanation = await this.buildChargeExplanation(chargeId, chargeEvent, events);

    // Cache the result
    await this.redis.set(cacheKey, explanation, this.CACHE_TTL);

    return explanation;
  }

  /**
   * Build a comprehensive charge explanation from events
   */
  private async buildChargeExplanation(
    chargeId: string,
    chargeEvent: StoredBillingEvent,
    events: StoredBillingEvent[],
  ): Promise<ChargeExplanationDto> {
    // Extract fee calculation from charge event
    const feeCalc = chargeEvent.feeCalculation;
    const gatewayResp = chargeEvent.gatewayResponse;

    // Calculate summary
    const summary = this.buildOrderSummary(feeCalc, events);

    // Get line items (would typically come from order data)
    const lineItems = await this.getLineItemsForOrder(chargeEvent.orderId);

    // Build tax breakdown
    const taxDetails = this.buildTaxBreakdown(feeCalc);

    // Build shipping details
    const shippingDetails = await this.getShippingDetails(chargeEvent.orderId);

    // Get discounts applied
    const discounts = this.extractDiscounts(feeCalc, events);

    // Build payment info
    const paymentInfo = this.buildPaymentInfo(gatewayResp);

    // Get refunds if any
    const refunds = this.extractRefunds(events);

    // Get currency conversion if applicable
    const conversionEvent = events.find(e => e.eventType === BillingEventType.CURRENCY_CONVERTED);

    // Generate customer-friendly explanation
    const customerExplanation = this.generateCustomerExplanation(summary, taxDetails, discounts);

    // Build audit trail from all events
    const auditTrail = events.map(this.transformStoredEventToDto);

    return {
      orderId: chargeEvent.orderId,
      chargeId,
      status: gatewayResp?.status || 'unknown',
      currency: chargeEvent.currency,
      createdAt: chargeEvent.createdAt.toISOString(),
      summary,
      lineItems,
      taxDetails,
      shippingDetails,
      discounts,
      paymentInfo,
      refunds: refunds.length > 0 ? refunds : undefined,
      currencyConversion: conversionEvent?.currencyConversion,
      auditTrail,
      customerExplanation,
    };
  }

  /**
   * Build order summary from fee calculations
   */
  private buildOrderSummary(
    feeCalc: FeeCalculationDto | undefined,
    events: StoredBillingEvent[],
  ): OrderSummaryDto {
    // Calculate total refunded
    const refundEvents = events.filter(
      e => e.eventType === BillingEventType.REFUND_COMPLETED ||
           e.eventType === BillingEventType.CHARGE_REFUNDED
    );
    const amountRefunded = refundEvents.reduce((sum, e) => sum + e.amount, 0);

    if (feeCalc) {
      return {
        subtotal: feeCalc.baseAmount,
        shipping: feeCalc.shippingAmount,
        tax: feeCalc.taxAmount,
        discount: -feeCalc.discountAmount,
        handlingFee: feeCalc.handlingFee,
        platformFee: feeCalc.platformFee,
        total: feeCalc.totalAmount,
        amountRefunded,
        netAmount: feeCalc.totalAmount - amountRefunded,
      };
    }

    // Fallback if no fee calculation available
    const chargeEvent = events.find(
      e => e.eventType === BillingEventType.CHARGE_CREATED ||
           e.eventType === BillingEventType.CHARGE_CAPTURED
    );

    const total = chargeEvent?.amount || 0;

    return {
      subtotal: total,
      shipping: 0,
      tax: 0,
      discount: 0,
      total,
      amountRefunded,
      netAmount: total - amountRefunded,
    };
  }

  /**
   * Build tax breakdown from fee calculations
   */
  private buildTaxBreakdown(feeCalc: FeeCalculationDto | undefined): TaxBreakdownDto {
    if (feeCalc?.taxBreakdown && feeCalc.taxBreakdown.length > 0) {
      const primaryTax = feeCalc.taxBreakdown[0];
      return {
        jurisdiction: primaryTax.jurisdiction,
        rate: primaryTax.rate,
        taxableAmount: primaryTax.taxableAmount,
        taxAmount: primaryTax.taxAmount,
        components: feeCalc.taxBreakdown,
      };
    }

    return {
      jurisdiction: 'Not specified',
      rate: 0,
      taxableAmount: feeCalc?.baseAmount || 0,
      taxAmount: feeCalc?.taxAmount || 0,
    };
  }

  /**
   * Extract discounts from events and fee calculations
   */
  private extractDiscounts(
    feeCalc: FeeCalculationDto | undefined,
    events: StoredBillingEvent[],
  ): DiscountDetailDto[] {
    const discounts: DiscountDetailDto[] = [];

    // Get discounts from fee calculation
    if (feeCalc?.discountsApplied) {
      discounts.push(...feeCalc.discountsApplied);
    }

    // Get discounts from discount events
    const discountEvents = events.filter(e => e.eventType === BillingEventType.DISCOUNT_APPLIED);
    for (const event of discountEvents) {
      if (event.metadata?.discounts) {
        for (const discount of event.metadata.discounts) {
          if (!discounts.find(d => d.code === discount.code)) {
            discounts.push(discount);
          }
        }
      }
    }

    return discounts;
  }

  /**
   * Build payment info from gateway response
   */
  private buildPaymentInfo(gatewayResp: GatewayResponseDto | undefined): PaymentInfoDto {
    if (!gatewayResp) {
      return {
        provider: 'unknown',
        method: 'unknown',
        transactionId: 'unknown',
        status: 'unknown',
      };
    }

    return {
      provider: gatewayResp.gateway,
      method: 'card', // Would be extracted from gateway response details
      brand: gatewayResp.paymentMethodDetails?.split('_')[0],
      last4: gatewayResp.paymentMethodDetails?.match(/\d{4}$/)?.[0],
      transactionId: gatewayResp.transactionId,
      chargeId: gatewayResp.chargeId,
      status: gatewayResp.status,
      processedAt: gatewayResp.processedAt,
      gatewayResponse: gatewayResp,
    };
  }

  /**
   * Extract refund information from events
   */
  private extractRefunds(events: StoredBillingEvent[]): RefundInfoDto[] {
    const refundEvents = events.filter(
      e => e.eventType === BillingEventType.REFUND_COMPLETED ||
           e.eventType === BillingEventType.CHARGE_REFUNDED
    );

    return refundEvents.map((event, index) => ({
      refundId: event.gatewayResponse?.transactionId || `ref_${index}`,
      amount: event.amount,
      type: event.amount < (event.feeCalculation?.totalAmount || event.amount) ? 'partial' : 'full',
      reason: event.reason || 'Not specified',
      status: 'completed',
      processedAt: event.timestamp.toISOString(),
      processedBy: event.actor?.id,
    }));
  }

  /**
   * Generate a customer-friendly explanation text
   */
  private generateCustomerExplanation(
    summary: OrderSummaryDto,
    taxDetails: TaxBreakdownDto,
    discounts: DiscountDetailDto[],
  ): string {
    const parts: string[] = [];

    parts.push(`Your order total of $${summary.total.toFixed(2)} includes:`);

    if (summary.subtotal > 0) {
      parts.push(`- Subtotal: $${summary.subtotal.toFixed(2)}`);
    }

    if (summary.shipping > 0) {
      parts.push(`- Shipping: $${summary.shipping.toFixed(2)}`);
    }

    if (summary.tax > 0 && taxDetails.jurisdiction !== 'Not specified') {
      parts.push(
        `- ${taxDetails.jurisdiction} tax (${(taxDetails.rate * 100).toFixed(2)}%): $${summary.tax.toFixed(2)}`
      );
    } else if (summary.tax > 0) {
      parts.push(`- Tax: $${summary.tax.toFixed(2)}`);
    }

    if (discounts.length > 0) {
      for (const discount of discounts) {
        parts.push(`- Discount (${discount.code}): -$${discount.amount.toFixed(2)}`);
      }
    }

    if (summary.amountRefunded && summary.amountRefunded > 0) {
      parts.push(`\nNote: $${summary.amountRefunded.toFixed(2)} has been refunded.`);
      parts.push(`Net amount charged: $${summary.netAmount?.toFixed(2)}`);
    }

    return parts.join('\n');
  }

  // ==================== REPORT GENERATION ====================

  /**
   * Generate a charge explanation report for a date range
   */
  async generateChargeReport(
    startDate: Date,
    endDate: Date,
    options?: {
      customerId?: string;
      status?: string;
      includeRefunds?: boolean;
    },
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
    this.logger.log(`Generating charge report for ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const events = await this.queryEvents({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      actorId: options?.customerId,
    });

    // Filter for charge and refund events
    const chargeEvents = events.filter(
      e => e.eventType === BillingEventType.CHARGE_CREATED ||
           e.eventType === BillingEventType.CHARGE_CAPTURED
    );

    const refundEvents = events.filter(
      e => e.eventType === BillingEventType.REFUND_COMPLETED ||
           e.eventType === BillingEventType.CHARGE_REFUNDED
    );

    // Calculate totals
    const totalCharges = chargeEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalRefunded = refundEvents.reduce((sum, e) => sum + e.amount, 0);

    // Group by status
    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const event of chargeEvents) {
      const status = event.gatewayResponse?.status || 'unknown';
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, amount: 0 };
      }
      byStatus[status].count++;
      byStatus[status].amount += event.amount;
    }

    // Group by payment method
    const byPaymentMethod: Record<string, { count: number; amount: number }> = {};
    for (const event of chargeEvents) {
      const method = event.gatewayResponse?.gateway || 'unknown';
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, amount: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].amount += event.amount;
    }

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalCharges,
        totalAmount: totalCharges,
        totalRefunded,
        netAmount: totalCharges - totalRefunded,
        chargeCount: chargeEvents.length,
        refundCount: refundEvents.length,
      },
      byStatus,
      byPaymentMethod,
    };
  }

  // ==================== STORAGE METHODS ====================

  /**
   * Store a billing event
   * Using Redis for fast access with fallback to Prisma for persistence
   */
  private async storeEvent(event: StoredBillingEvent): Promise<void> {
    // Store in Redis for fast retrieval
    const eventKey = `${this.AUDIT_EVENT_PREFIX}event:${event.id}`;
    await this.redis.set(eventKey, event, 86400 * 30); // 30 days TTL

    // Add to order's event list
    const orderEventsKey = `${this.AUDIT_EVENT_PREFIX}order:${event.orderId}:events`;
    await this.redis.lpush(orderEventsKey, event.id);

    // Add to charge's event list if chargeId exists
    if (event.chargeId) {
      const chargeEventsKey = `${this.AUDIT_EVENT_PREFIX}charge:${event.chargeId}:events`;
      await this.redis.lpush(chargeEventsKey, event.id);
    }

    // Store idempotency key mapping
    if (event.idempotencyKey) {
      const idempotencyKey = `${this.AUDIT_EVENT_PREFIX}idempotency:${event.idempotencyKey}`;
      await this.redis.set(idempotencyKey, event.id, 86400); // 24 hours
    }

    // Persist to database for long-term storage
    try {
      await this.prisma.billingAuditLog.create({
        data: {
          id: event.id,
          eventType: event.eventType,
          orderId: event.orderId,
          chargeId: event.chargeId,
          amount: event.amount,
          currency: event.currency,
          actor: event.actor as any,
          feeCalculation: event.feeCalculation as any,
          gatewayResponse: event.gatewayResponse as any,
          currencyConversion: event.currencyConversion as any,
          idempotencyKey: event.idempotencyKey,
          reason: event.reason,
          metadata: event.metadata,
          timestamp: event.timestamp,
          createdAt: event.createdAt,
        },
      });
    } catch (error: any) {
      // Log but don't fail - Redis is the primary store
      this.logger.warn(`Failed to persist billing event to database: ${error.message}`);
    }
  }

  /**
   * Get events for an order
   */
  private async getEventsForOrder(
    orderId: string,
    query?: BillingEventQueryDto,
  ): Promise<StoredBillingEvent[]> {
    // Try Redis first
    const orderEventsKey = `${this.AUDIT_EVENT_PREFIX}order:${orderId}:events`;
    const eventIds = await this.redis.lrange(orderEventsKey, 0, -1);

    if (eventIds && eventIds.length > 0) {
      const events: StoredBillingEvent[] = [];
      for (const eventId of eventIds) {
        const event = await this.redis.get(`${this.AUDIT_EVENT_PREFIX}event:${eventId}`);
        if (event) {
          events.push(event as StoredBillingEvent);
        }
      }

      // Apply filters
      let filteredEvents = events;
      if (query?.eventType) {
        filteredEvents = filteredEvents.filter(e => e.eventType === query.eventType);
      }
      if (query?.actorType) {
        filteredEvents = filteredEvents.filter(e => e.actor?.type === query.actorType);
      }
      if (query?.startDate) {
        const start = new Date(query.startDate);
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= start);
      }
      if (query?.endDate) {
        const end = new Date(query.endDate);
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= end);
      }

      // Sort by timestamp descending
      filteredEvents.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply pagination
      const offset = query?.offset || 0;
      const limit = query?.limit || 50;
      return filteredEvents.slice(offset, offset + limit);
    }

    // Fallback to database
    return this.getEventsFromDatabase(orderId, query);
  }

  /**
   * Get events by charge ID
   */
  private async getEventsByChargeId(chargeId: string): Promise<StoredBillingEvent[]> {
    // Try Redis first
    const chargeEventsKey = `${this.AUDIT_EVENT_PREFIX}charge:${chargeId}:events`;
    const eventIds = await this.redis.lrange(chargeEventsKey, 0, -1);

    if (eventIds && eventIds.length > 0) {
      const events: StoredBillingEvent[] = [];
      for (const eventId of eventIds) {
        const event = await this.redis.get(`${this.AUDIT_EVENT_PREFIX}event:${eventId}`);
        if (event) {
          events.push(event as StoredBillingEvent);
        }
      }
      return events.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    // Fallback to database
    const dbEvents = await this.prisma.billingAuditLog.findMany({
      where: { chargeId },
      orderBy: { timestamp: 'asc' },
    });

    return dbEvents.map(this.mapDbEventToStored);
  }

  /**
   * Find event by idempotency key
   */
  private async findEventByIdempotencyKey(idempotencyKey: string): Promise<BillingEventDto | null> {
    const idempotencyRedisKey = `${this.AUDIT_EVENT_PREFIX}idempotency:${idempotencyKey}`;
    const eventId = await this.redis.get(idempotencyRedisKey);

    if (eventId) {
      const event = await this.redis.get(`${this.AUDIT_EVENT_PREFIX}event:${eventId}`);
      if (event) {
        return this.transformStoredEventToDto(event as StoredBillingEvent);
      }
    }

    // Fallback to database
    const dbEvent = await this.prisma.billingAuditLog.findFirst({
      where: { idempotencyKey },
    });

    if (dbEvent) {
      return this.transformStoredEventToDto(this.mapDbEventToStored(dbEvent));
    }

    return null;
  }

  /**
   * Query events with filters
   */
  private async queryEvents(query: BillingEventQueryDto): Promise<StoredBillingEvent[]> {
    const where: any = {};

    if (query.orderId) {
      where.orderId = query.orderId;
    }
    if (query.chargeId) {
      where.chargeId = query.chargeId;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const dbEvents = await this.prisma.billingAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return dbEvents.map(this.mapDbEventToStored);
  }

  /**
   * Count events with filters
   */
  private async countEvents(query: BillingEventQueryDto): Promise<number> {
    const where: any = {};

    if (query.orderId) {
      where.orderId = query.orderId;
    }
    if (query.chargeId) {
      where.chargeId = query.chargeId;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    return this.prisma.billingAuditLog.count({ where });
  }

  /**
   * Get events from database
   */
  private async getEventsFromDatabase(
    orderId: string,
    query?: BillingEventQueryDto,
  ): Promise<StoredBillingEvent[]> {
    const where: any = { orderId };

    if (query?.eventType) {
      where.eventType = query.eventType;
    }
    if (query?.startDate || query?.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const dbEvents = await this.prisma.billingAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query?.limit || 50,
      skip: query?.offset || 0,
    });

    return dbEvents.map(this.mapDbEventToStored);
  }

  /**
   * Get line items for an order (mock implementation - would integrate with order service)
   */
  private async getLineItemsForOrder(orderId: string): Promise<LineItemDto[]> {
    // In a real implementation, this would fetch from the orders table
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (order?.items) {
        return order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          sku: item.variant?.sku || item.product?.sku,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
          discountAmount: Number(item.discount || 0),
          taxAmount: Number(item.tax || 0),
          total: Number(item.price) * item.quantity - Number(item.discount || 0) + Number(item.tax || 0),
          taxable: true,
          category: item.product?.category,
          variant: item.variant?.attributes,
        }));
      }
    } catch {
      // Return empty array if order lookup fails
    }

    return [];
  }

  /**
   * Get shipping details for an order
   */
  private async getShippingDetails(orderId: string): Promise<ShippingDetailsDto | undefined> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          shippingMethod: true,
          shippingCost: true,
          trackingNumber: true,
        },
      });

      if (order?.shippingMethod) {
        return {
          method: order.shippingMethod,
          description: `${order.shippingMethod} Shipping`,
          carrier: 'Standard Carrier',
          baseCost: Number(order.shippingCost || 0),
          totalCost: Number(order.shippingCost || 0),
          trackingNumber: order.trackingNumber || undefined,
        };
      }
    } catch {
      // Return undefined if shipping lookup fails
    }

    return undefined;
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Invalidate audit cache for an order
   */
  private async invalidateAuditCache(orderId: string): Promise<void> {
    const cacheKey = `${this.AUDIT_EVENT_PREFIX}order:${orderId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Invalidate charge cache
   */
  private async invalidateChargeCache(chargeId: string): Promise<void> {
    const cacheKey = `${this.CHARGE_PREFIX}explain:${chargeId}`;
    await this.redis.del(cacheKey);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Transform stored event to DTO
   */
  private transformStoredEventToDto = (event: StoredBillingEvent): BillingEventDto => {
    return {
      id: event.id,
      eventType: event.eventType,
      orderId: event.orderId,
      chargeId: event.chargeId,
      amount: event.amount,
      currency: event.currency,
      actor: event.actor,
      feeCalculation: event.feeCalculation,
      gatewayResponse: event.gatewayResponse,
      currencyConversion: event.currencyConversion,
      idempotencyKey: event.idempotencyKey,
      reason: event.reason,
      metadata: event.metadata,
      timestamp: event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : event.timestamp,
      createdAt: event.createdAt instanceof Date
        ? event.createdAt.toISOString()
        : event.createdAt,
    };
  };

  /**
   * Map database event to stored event format
   */
  private mapDbEventToStored = (dbEvent: any): StoredBillingEvent => {
    return {
      id: dbEvent.id,
      eventType: dbEvent.eventType as BillingEventType,
      orderId: dbEvent.orderId,
      chargeId: dbEvent.chargeId,
      amount: Number(dbEvent.amount),
      currency: dbEvent.currency,
      actor: dbEvent.actor as ActorDto,
      feeCalculation: dbEvent.feeCalculation as FeeCalculationDto,
      gatewayResponse: dbEvent.gatewayResponse as GatewayResponseDto,
      currencyConversion: dbEvent.currencyConversion as CurrencyConversionDto,
      idempotencyKey: dbEvent.idempotencyKey,
      reason: dbEvent.reason,
      metadata: dbEvent.metadata,
      timestamp: dbEvent.timestamp,
      createdAt: dbEvent.createdAt,
    };
  };
}
