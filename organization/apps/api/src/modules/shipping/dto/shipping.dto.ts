import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ShippingCarrierEnum {
  UPS = 'UPS',
  FEDEX = 'FEDEX',
  USPS = 'USPS',
  DHL = 'DHL',
  CANADA_POST = 'CANADA_POST',
  CUSTOM = 'CUSTOM',
}

export enum ServiceLevelEnum {
  GROUND = 'GROUND',
  TWO_DAY = 'TWO_DAY',
  NEXT_DAY = 'NEXT_DAY',
  INTERNATIONAL = 'INTERNATIONAL',
  FREIGHT = 'FREIGHT',
}

export enum PackageTypeEnum {
  ENVELOPE = 'ENVELOPE',
  SMALL_PACKAGE = 'SMALL_PACKAGE',
  MEDIUM_PACKAGE = 'MEDIUM_PACKAGE',
  LARGE_PACKAGE = 'LARGE_PACKAGE',
  PALLET = 'PALLET',
  CUSTOM = 'CUSTOM',
}

// ==================== Address DTOs ====================

export class AddressDto {
  @IsString()
  name: string;

  @IsString()
  street1: string;

  @IsOptional()
  @IsString()
  street2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

// ==================== Package DTOs ====================

export class PackageDto {
  @IsEnum(PackageTypeEnum)
  type: PackageTypeEnum;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;
}

// ==================== Rate Calculation ====================

export class CalculateRateDto {
  @ValidateNested()
  @Type(() => AddressDto)
  fromAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  toAddress: AddressDto;

  @ValidateNested()
  @Type(() => PackageDto)
  package: PackageDto;

  @IsOptional()
  @IsEnum(ShippingCarrierEnum, { each: true })
  carriers?: ShippingCarrierEnum[];

  @IsOptional()
  @IsEnum(ServiceLevelEnum, { each: true })
  serviceLevels?: ServiceLevelEnum[];

  @IsOptional()
  @IsBoolean()
  signature?: boolean;

  @IsOptional()
  @IsNumber()
  insurance?: number;
}

// ==================== Label Generation ====================

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsEnum(ShippingCarrierEnum)
  carrier: ShippingCarrierEnum;

  @IsEnum(ServiceLevelEnum)
  serviceLevel: ServiceLevelEnum;

  @ValidateNested()
  @Type(() => AddressDto)
  fromAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  toAddress: AddressDto;

  @ValidateNested()
  @Type(() => PackageDto)
  package: PackageDto;

  @IsOptional()
  @IsBoolean()
  signature?: boolean;

  @IsOptional()
  @IsNumber()
  insurance?: number;

  @IsOptional()
  @IsString()
  customsDescription?: string;

  @IsOptional()
  @IsNumber()
  customsValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ==================== Tracking ====================

export class TrackShipmentDto {
  @IsString()
  trackingNumber: string;

  @IsOptional()
  @IsEnum(ShippingCarrierEnum)
  carrier?: ShippingCarrierEnum;
}

// ==================== Return Labels ====================

export class CreateReturnLabelDto {
  @IsString()
  shipmentId: string;

  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  validDays?: number; // Default 30 days
}

// ==================== Shipping Provider ====================

export class CreateShippingProviderDto {
  @IsEnum(ShippingCarrierEnum)
  carrier: ShippingCarrierEnum;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  meterNumber?: string;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;

  @IsOptional()
  config?: any;
}

export class UpdateShippingProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  meterNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;

  @IsOptional()
  config?: any;
}

// ==================== Shipping Zones ====================

export class CreateShippingZoneDto {
  @IsString()
  providerId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  countries: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

// ==================== Shipping Rules ====================

export class CreateShippingRuleDto {
  @IsString()
  zoneId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsEnum(ServiceLevelEnum)
  serviceLevel?: ServiceLevelEnum;

  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perPoundRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perItemRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeThreshold?: number;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateShippingRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsEnum(ServiceLevelEnum)
  serviceLevel?: ServiceLevelEnum;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perPoundRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perItemRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

// ==================== Delivery Confirmation ====================

export class DeliveryConfirmationWebhookDto {
  @IsString()
  trackingNumber: string;

  @IsString()
  status: string;

  @IsString()
  deliveredAt: string;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  webhookData?: any;
}
