import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReturnStatus,
  ReturnReason,
  ReturnType,
  RefundStatus,
  RefundMethod,
  ShippingCarrier,
} from '@prisma/client';

// ==================== Return Request DTOs ====================

export class ReturnItemDto {
  @IsString()
  orderItemId: string;

  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  itemPrice: number;
}

export class CreateReturnRequestDto {
  @IsString()
  orderId: string;

  @IsEnum(ReturnType)
  returnType: ReturnType;

  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}

export class UpdateReturnRequestDto {
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @IsOptional()
  @IsEnum(ReturnType)
  returnType?: ReturnType;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  rejectedReason?: string;

  @IsOptional()
  @IsNumber()
  restockingFee?: number;

  @IsOptional()
  @IsNumber()
  shippingRefund?: number;
}

export class ApproveReturnDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  restockingFee?: number;

  @IsOptional()
  @IsBoolean()
  includeShippingRefund?: boolean;
}

export class InspectReturnDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  inspectionNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inspectionPhotos?: string[];

  @IsOptional()
  @IsNumber()
  adjustedRefundAmount?: number;
}

// ==================== Refund DTOs ====================

export class CreateRefundDto {
  @IsString()
  returnRequestId: string;

  @IsEnum(RefundMethod)
  method: RefundMethod;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  shippingRefund?: number;

  @IsOptional()
  @IsNumber()
  taxRefund?: number;

  @IsOptional()
  @IsNumber()
  restockingFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessRefundDto {
  @IsString()
  refundId: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ==================== Restock DTOs ====================

export class RestockItemDto {
  @IsString()
  returnItemId: string;

  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class RestockReturnDto {
  @IsString()
  returnRequestId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockItemDto)
  items: RestockItemDto[];
}

// ==================== Store Credit DTOs ====================

export class IssueStoreCreditDto {
  @IsString()
  returnRequestId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// ==================== Return Label DTOs ====================

export class GenerateReturnLabelDto {
  @IsString()
  returnRequestId: string;

  @IsOptional()
  @IsEnum(ShippingCarrier)
  carrier?: ShippingCarrier;

  @IsOptional()
  @IsString()
  serviceLevel?: string;
}

// ==================== Query DTOs ====================

export class ReturnFiltersDto {
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsEnum(ReturnType)
  returnType?: ReturnType;

  @IsOptional()
  @IsEnum(ReturnReason)
  reason?: ReturnReason;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  rmaNumber?: string;
}

// ==================== Analytics DTOs ====================

export class ReturnAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' | 'reason' | 'product';
}

// ==================== Cancel Return DTO ====================

export class CancelReturnDto {
  @IsString()
  returnRequestId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
