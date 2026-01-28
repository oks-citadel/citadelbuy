/**
 * BNPL Webhook DTOs
 *
 * Data Transfer Objects for handling webhooks from BNPL providers.
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BnplProvider } from '@prisma/client';

export class BnplWebhookDto {
  @ApiProperty({ description: 'Raw webhook payload' })
  payload: any;

  @ApiPropertyOptional({ description: 'Webhook headers' })
  headers?: Record<string, string>;
}

export class KlarnaWebhookDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiPropertyOptional({ description: 'Merchant reference' })
  @IsString()
  @IsOptional()
  merchant_reference1?: string;

  @ApiPropertyOptional({ description: 'Order amount in cents' })
  @IsNumber()
  @IsOptional()
  order_amount?: number;

  @ApiPropertyOptional({ description: 'Purchase currency' })
  @IsString()
  @IsOptional()
  purchase_currency?: string;

  @ApiPropertyOptional({ description: 'Event timestamp' })
  @IsString()
  @IsOptional()
  event_timestamp?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  data?: any;
}

export class AffirmWebhookDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Charge ID' })
  @IsString()
  @IsNotEmpty()
  charge_id: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsString()
  @IsOptional()
  order_id?: string;

  @ApiPropertyOptional({ description: 'Amount in cents' })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Created timestamp' })
  @IsNumber()
  @IsOptional()
  created?: number;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  data?: any;
}

export class AfterpayWebhookDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Payment ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ description: 'Merchant reference' })
  @IsString()
  @IsOptional()
  merchantReference?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Amount' })
  @IsOptional()
  amount?: {
    amount: string;
    currency: string;
  };

  @ApiPropertyOptional({ description: 'Created timestamp' })
  @IsString()
  @IsOptional()
  created?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  data?: any;
}

export class WebhookResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiPropertyOptional({ description: 'Event type that was processed' })
  eventType?: string;

  @ApiPropertyOptional({ description: 'Provider order ID' })
  providerOrderId?: string;
}

export class BnplWebhookEventDto {
  @ApiProperty({ enum: BnplProvider, description: 'BNPL provider' })
  @IsEnum(BnplProvider)
  provider: BnplProvider;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Provider order ID' })
  @IsString()
  @IsNotEmpty()
  providerOrderId: string;

  @ApiPropertyOptional({ description: 'Internal order ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Amount' })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Raw webhook data' })
  @IsOptional()
  rawData?: any;
}
