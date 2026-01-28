import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto, ShippingCarrierEnum } from './shipping.dto';

// ==================== Pickup Scheduling ====================

export class SchedulePickupDto {
  @IsEnum(ShippingCarrierEnum)
  carrier: ShippingCarrierEnum;

  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @IsString()
  pickupDate: string; // ISO date string

  @IsString()
  readyTime: string; // HH:MM format

  @IsString()
  closeTime: string; // HH:MM format

  @IsNumber()
  @Min(1)
  packageCount: number;

  @IsNumber()
  @Min(0)
  totalWeight: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackingNumbers?: string[];
}

export class CancelPickupDto {
  @IsEnum(ShippingCarrierEnum)
  carrier: ShippingCarrierEnum;

  @IsString()
  confirmationNumber: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PickupScheduleResponse {
  @IsString()
  confirmationNumber: string;

  @IsString()
  pickupDate: string;

  @IsString()
  readyTime: string;

  @IsString()
  closeTime: string;

  @IsString()
  location: string;

  @IsString()
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  message?: string;
}
