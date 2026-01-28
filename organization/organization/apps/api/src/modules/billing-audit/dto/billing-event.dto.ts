import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  IsUUID,
  IsBoolean,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Billing event types for comprehensive tracking
 */
export enum BillingEventType {
  CHARGE_CREATED = 'charge.created',
  CHARGE_CAPTURED = 'charge.captured',
  CHARGE_FAILED = 'charge.failed',
  CHARGE_REFUNDED = 'charge.refunded',
  CHARGE_DISPUTED = 'charge.disputed',
  CHARGE_ADJUSTED = 'charge.adjusted',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
  REFUND_FAILED = 'refund.failed',
  ADJUSTMENT_APPLIED = 'adjustment.applied',
  TAX_CALCULATED = 'tax.calculated',
  DISCOUNT_APPLIED = 'discount.applied',
  SHIPPING_CALCULATED = 'shipping.calculated',
  CURRENCY_CONVERTED = 'currency.converted',
  FEE_CALCULATED = 'fee.calculated',
  PAYMENT_METHOD_ADDED = 'payment_method.added',
  PAYMENT_METHOD_REMOVED = 'payment_method.removed',
  INVOICE_GENERATED = 'invoice.generated',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_VOIDED = 'invoice.voided',
}

/**
 * Actor types - who triggered the event
 */
export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  ADMIN = 'admin',
  API = 'api',
  WEBHOOK = 'webhook',
  SCHEDULER = 'scheduler',
}

/**
 * Payment gateway types
 */
export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BRAINTREE = 'braintree',
  SQUARE = 'square',
  ADYEN = 'adyen',
  OTHER = 'other',
}

/**
 * Tax details for a specific jurisdiction
 */
export class TaxDetailDto {
  @ApiProperty({ example: 'California' })
  @IsString()
  jurisdiction: string;

  @ApiPropertyOptional({ example: 'CA' })
  @IsOptional()
  @IsString()
  jurisdictionCode?: string;

  @ApiProperty({ example: 'state' })
  @IsString()
  type: string;

  @ApiProperty({ example: 0.0875 })
  @IsNumber()
  rate: number;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  taxableAmount: number;

  @ApiProperty({ example: 8.75 })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiPropertyOptional({ example: 'Sales Tax' })
  @IsOptional()
  @IsString()
  name?: string;
}

/**
 * Discount details for tracking applied discounts
 */
export class DiscountDetailDto {
  @ApiProperty({ example: 'SAVE10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed', 'bogo', 'free_shipping'] })
  @IsString()
  type: string;

  @ApiProperty({ example: 10.00 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional({ example: 'disc_abc123' })
  @IsOptional()
  @IsString()
  discountId?: string;

  @ApiPropertyOptional({ example: 'Summer Sale 10% Off' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['product_123', 'product_456'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedToItems?: string[];
}

/**
 * Currency conversion details
 */
export class CurrencyConversionDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  fromCurrency: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  toCurrency: string;

  @ApiProperty({ example: 0.92 })
  @IsNumber()
  exchangeRate: number;

  @ApiProperty({ example: 100.00 })
  @IsNumber()
  originalAmount: number;

  @ApiProperty({ example: 92.00 })
  @IsNumber()
  convertedAmount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  rateTimestamp: string;

  @ApiPropertyOptional({ example: 'xe.com' })
  @IsOptional()
  @IsString()
  rateSource?: string;
}

/**
 * Payment gateway response details
 */
export class GatewayResponseDto {
  @ApiProperty({ enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ example: 'pi_3ABC123XYZ' })
  @IsString()
  transactionId: string;

  @ApiPropertyOptional({ example: 'ch_ABC123' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiPropertyOptional({ example: 'cus_ABC123' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: 'succeeded' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'ABC123XYZ' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @ApiPropertyOptional({ example: 'card_ending_4242' })
  @IsOptional()
  @IsString()
  paymentMethodDetails?: string;

  @ApiPropertyOptional({ example: '{"risk_level": "normal", "risk_score": 25}' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ example: '{"network_transaction_id": "XYZ123"}' })
  @IsOptional()
  @IsObject()
  rawResponse?: Record<string, any>;
}

/**
 * Fee calculation details
 */
export class FeeCalculationDto {
  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @ApiProperty({ example: 8.75 })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  @Min(0)
  shippingAmount: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  handlingFee: number;

  @ApiProperty({ example: 2.99 })
  @IsNumber()
  @Min(0)
  platformFee: number;

  @ApiProperty({ example: 10.00 })
  @IsNumber()
  discountAmount: number;

  @ApiProperty({ example: 107.72 })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaxDetailDto)
  taxBreakdown?: TaxDetailDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DiscountDetailDto)
  discountsApplied?: DiscountDetailDto[];
}

/**
 * Actor information - who triggered the billing event
 */
export class ActorDto {
  @ApiProperty({ enum: ActorType })
  @IsEnum(ActorType)
  type: ActorType;

  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ example: 'stripe-webhook' })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * Create billing event DTO
 */
export class CreateBillingEventDto {
  @ApiProperty({ enum: BillingEventType })
  @IsEnum(BillingEventType)
  eventType: BillingEventType;

  @ApiProperty({ example: 'ORD-123456' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ example: 'CHG-789ABC' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiProperty({ example: 104.73 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ActorDto)
  actor?: ActorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => FeeCalculationDto)
  feeCalculation?: FeeCalculationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GatewayResponseDto)
  gatewayResponse?: GatewayResponseDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @ApiPropertyOptional({ example: 'idem_ABC123XYZ' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Customer requested price adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: { custom_field: 'value' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Billing event response DTO
 */
export class BillingEventDto {
  @ApiProperty({ example: 'evt_123456789' })
  @IsString()
  id: string;

  @ApiProperty({ enum: BillingEventType })
  @IsEnum(BillingEventType)
  eventType: BillingEventType;

  @ApiProperty({ example: 'ORD-123456' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ example: 'CHG-789ABC' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiProperty({ example: 104.73 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => FeeCalculationDto)
  feeCalculation?: FeeCalculationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GatewayResponseDto)
  gatewayResponse?: GatewayResponseDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @ApiPropertyOptional({ example: 'idem_ABC123XYZ' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Customer requested price adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  createdAt: string;
}

/**
 * Billing event query DTO for filtering audit logs
 */
export class BillingEventQueryDto {
  @ApiPropertyOptional({ example: 'ORD-123456' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'CHG-789ABC' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiPropertyOptional({ enum: BillingEventType })
  @IsOptional()
  @IsEnum(BillingEventType)
  eventType?: BillingEventType;

  @ApiPropertyOptional({ enum: ActorType })
  @IsOptional()
  @IsEnum(ActorType)
  actorType?: ActorType;

  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 50, default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

/**
 * Billing audit trail response
 */
export class BillingAuditTrailDto {
  @ApiProperty({ example: 'ORD-123456' })
  @IsString()
  orderId: string;

  @ApiProperty({ type: [BillingEventDto] })
  @ValidateNested({ each: true })
  @Type(() => BillingEventDto)
  events: BillingEventDto[];

  @ApiProperty({ example: 15 })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  limit: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  offset: number;
}
