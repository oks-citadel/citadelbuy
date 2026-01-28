import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TaxDetailDto,
  DiscountDetailDto,
  CurrencyConversionDto,
  GatewayResponseDto,
  BillingEventDto,
} from './billing-event.dto';

/**
 * Line item in an order
 */
export class LineItemDto {
  @ApiProperty({ example: 'item_123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'prod_456' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'Premium Wireless Headphones' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'SKU-ABC123' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 99.98 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 8.75 })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiProperty({ example: 103.73 })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  taxable?: boolean;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: { color: 'Black', size: 'M' } })
  @IsOptional()
  @IsObject()
  variant?: Record<string, string>;
}

/**
 * Shipping details breakdown
 */
export class ShippingDetailsDto {
  @ApiProperty({ example: 'standard' })
  @IsString()
  method: string;

  @ApiProperty({ example: 'Standard Shipping (5-7 business days)' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'UPS' })
  @IsString()
  carrier: string;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  @Min(0)
  baseCost: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  handlingFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiPropertyOptional({ example: '1Z999AA10123456784' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-20' })
  @IsOptional()
  @IsString()
  estimatedDelivery?: string;
}

/**
 * Order summary with financial breakdown
 */
export class OrderSummaryDto {
  @ApiProperty({ example: 99.99 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  shipping: number;

  @ApiProperty({ example: 8.75 })
  @IsNumber()
  tax: number;

  @ApiProperty({ example: -10.00 })
  @IsNumber()
  discount: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  handlingFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  platformFee?: number;

  @ApiProperty({ example: 104.73 })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  amountRefunded?: number;

  @ApiPropertyOptional({ example: 104.73 })
  @IsOptional()
  @IsNumber()
  netAmount?: number;
}

/**
 * Tax breakdown by jurisdiction
 */
export class TaxBreakdownDto {
  @ApiProperty({ example: 'California' })
  @IsString()
  jurisdiction: string;

  @ApiPropertyOptional({ example: 'CA-123456789' })
  @IsOptional()
  @IsString()
  taxRegistrationNumber?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxDetailDto)
  components?: TaxDetailDto[];
}

/**
 * Payment information for the charge
 */
export class PaymentInfoDto {
  @ApiProperty({ example: 'stripe' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 'card' })
  @IsString()
  method: string;

  @ApiPropertyOptional({ example: 'Visa' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: '4242' })
  @IsOptional()
  @IsString()
  last4?: string;

  @ApiPropertyOptional({ example: '12/2026' })
  @IsOptional()
  @IsString()
  expiry?: string;

  @ApiProperty({ example: 'pi_3ABC123XYZ' })
  @IsString()
  transactionId: string;

  @ApiPropertyOptional({ example: 'ch_ABC123' })
  @IsOptional()
  @IsString()
  chargeId?: string;

  @ApiProperty({ example: 'succeeded' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GatewayResponseDto)
  gatewayResponse?: GatewayResponseDto;
}

/**
 * Refund details if applicable
 */
export class RefundInfoDto {
  @ApiProperty({ example: 'ref_ABC123' })
  @IsString()
  refundId: string;

  @ApiProperty({ example: 10.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'partial' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Customer requested' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiProperty({ example: '2024-01-16T14:00:00Z' })
  @IsDateString()
  processedAt: string;

  @ApiPropertyOptional({ example: 'admin-user-123' })
  @IsOptional()
  @IsString()
  processedBy?: string;
}

/**
 * Charge explanation response DTO
 * Provides a customer-friendly breakdown of all charges
 */
export class ChargeExplanationDto {
  @ApiProperty({ example: 'ORD-123' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'CHG-789ABC' })
  @IsString()
  chargeId: string;

  @ApiProperty({ example: 'completed' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ type: OrderSummaryDto })
  @ValidateNested()
  @Type(() => OrderSummaryDto)
  summary: OrderSummaryDto;

  @ApiProperty({ type: [LineItemDto] })
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems: LineItemDto[];

  @ApiProperty({ type: TaxBreakdownDto })
  @ValidateNested()
  @Type(() => TaxBreakdownDto)
  taxDetails: TaxBreakdownDto;

  @ApiPropertyOptional({ type: ShippingDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  shippingDetails?: ShippingDetailsDto;

  @ApiProperty({ type: [DiscountDetailDto] })
  @ValidateNested({ each: true })
  @Type(() => DiscountDetailDto)
  discounts: DiscountDetailDto[];

  @ApiProperty({ type: PaymentInfoDto })
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  paymentInfo: PaymentInfoDto;

  @ApiPropertyOptional({ type: [RefundInfoDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RefundInfoDto)
  refunds?: RefundInfoDto[];

  @ApiPropertyOptional({ type: CurrencyConversionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @ApiProperty({ type: [BillingEventDto] })
  @ValidateNested({ each: true })
  @Type(() => BillingEventDto)
  auditTrail: BillingEventDto[];

  @ApiPropertyOptional({ example: 'Your order total includes 8.75% California sales tax and standard shipping.' })
  @IsOptional()
  @IsString()
  customerExplanation?: string;
}

/**
 * Simplified charge summary for lists
 */
export class ChargeListItemDto {
  @ApiProperty({ example: 'CHG-789ABC' })
  @IsString()
  chargeId: string;

  @ApiProperty({ example: 'ORD-123' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 104.73 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'succeeded' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'stripe' })
  @IsString()
  provider: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  refundedAmount?: number;
}

/**
 * Charge list response
 */
export class ChargeListResponseDto {
  @ApiProperty({ type: [ChargeListItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ChargeListItemDto)
  charges: ChargeListItemDto[];

  @ApiProperty({ example: 100 })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  limit: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  offset: number;
}

/**
 * Query parameters for listing charges
 */
export class ChargeQueryDto {
  @ApiPropertyOptional({ example: 'cus_ABC123' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'succeeded' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'stripe' })
  @IsOptional()
  @IsString()
  provider?: string;

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
