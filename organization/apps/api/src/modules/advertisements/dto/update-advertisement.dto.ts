import { PartialType } from '@nestjs/swagger';
import { CreateAdvertisementDto } from './create-advertisement.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdStatus } from '@prisma/client';

export class UpdateAdvertisementDto extends PartialType(CreateAdvertisementDto) {
  @ApiPropertyOptional({ enum: AdStatus, description: 'Advertisement status' })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;
}
