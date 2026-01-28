import { IsString, IsEnum, IsOptional, IsArray, IsDateString, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum CampaignType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  MULTI_CHANNEL = 'MULTI_CHANNEL',
  SOCIAL = 'SOCIAL',
  DISPLAY = 'DISPLAY',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CampaignTargetingDto {
  @IsOptional()
  @IsArray()
  regions?: string[];

  @IsOptional()
  @IsArray()
  countries?: string[];

  @IsOptional()
  @IsArray()
  industries?: string[];

  @IsOptional()
  @IsArray()
  companySize?: string[];

  @IsOptional()
  @IsArray()
  segments?: string[];

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  maxOrderValue?: number;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTargetingDto)
  targeting?: CampaignTargetingDto;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTargetingDto)
  targeting?: CampaignTargetingDto;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class CampaignMetricsDto {
  @IsString()
  campaignId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  metrics?: string[];
}
