import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdType, AdStatus, CampaignStatus } from '@prisma/client';

export class AdQueryDto {
  @ApiPropertyOptional({ enum: AdStatus, description: 'Filter by ad status' })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;

  @ApiPropertyOptional({ enum: AdType, description: 'Filter by ad type' })
  @IsEnum(AdType)
  @IsOptional()
  type?: AdType;

  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsUUID()
  @IsOptional()
  campaignId?: string;
}

export class CampaignQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus, description: 'Filter by campaign status' })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;
}
