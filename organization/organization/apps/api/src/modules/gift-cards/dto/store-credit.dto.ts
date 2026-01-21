import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { StoreCreditType } from '@prisma/client';

export class AddStoreCreditDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(StoreCreditType)
  type: StoreCreditType;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  orderId?: string; // For refunds
}

export class DeductStoreCreditDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AdjustStoreCreditDto {
  @IsNumber()
  amount: number; // Can be positive or negative

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GetStoreCreditHistoryDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;

  @IsEnum(StoreCreditType)
  @IsOptional()
  type?: StoreCreditType;
}
