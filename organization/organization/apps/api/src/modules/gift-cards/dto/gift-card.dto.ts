import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { GiftCardType, GiftCardStatus } from '@prisma/client';

export class PurchaseGiftCardDto {
  @IsNumber()
  @Min(5)
  @Max(1000)
  amount: number;

  @IsEnum(GiftCardType)
  @IsOptional()
  type?: GiftCardType;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  personalMessage?: string;

  @IsString()
  @IsOptional()
  designTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledDelivery?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}

export class CreatePromotionalGiftCardDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  recipientEmail?: string;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumPurchase?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedProducts?: string[];
}

export class RedeemGiftCardDto {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number; // For partial redemption
}

export class CheckGiftCardBalanceDto {
  @IsString()
  code: string;
}

export class UpdateGiftCardDto {
  @IsEnum(GiftCardStatus)
  @IsOptional()
  status?: GiftCardStatus;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsNumber()
  @IsOptional()
  minimumPurchase?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedProducts?: string[];
}

export class SendGiftCardEmailDto {
  @IsString()
  giftCardId: string;

  @IsBoolean()
  @IsOptional()
  resend?: boolean;
}

export class ConvertToStoreCreditDto {
  @IsString()
  giftCardCode: string;
}

export class GetGiftCardsQueryDto {
  @IsEnum(GiftCardStatus)
  @IsOptional()
  status?: GiftCardStatus;

  @IsEnum(GiftCardType)
  @IsOptional()
  type?: GiftCardType;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TransferGiftCardDto {
  @IsString()
  giftCardCode: string;

  @IsString()
  toUserId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number; // Optional for partial transfer
}

export class BulkCreateGiftCardsDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(GiftCardType)
  @IsOptional()
  type?: GiftCardType;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumPurchase?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedProducts?: string[];
}
