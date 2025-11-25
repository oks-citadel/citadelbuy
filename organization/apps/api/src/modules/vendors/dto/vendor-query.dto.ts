import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VendorStatus } from './vendor-verification.dto';

export class VendorQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by vendor status',
    enum: VendorStatus,
    example: VendorStatus.ACTIVE,
  })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by sell permission',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  canSell?: boolean;

  @ApiPropertyOptional({
    description: 'Search by business name',
    example: 'Acme',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
    default: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
