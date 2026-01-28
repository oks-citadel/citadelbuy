import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class StockMovementQueryDto {
  @ApiProperty({ description: 'Product ID filter', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Warehouse ID filter', required: false })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({
    description: 'Movement type filter',
    enum: StockMovementType,
    required: false
  })
  @IsEnum(StockMovementType)
  @IsOptional()
  type?: StockMovementType;

  @ApiProperty({ description: 'Start date (ISO)', required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO)', required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Results limit', default: 20, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ description: 'Results offset', default: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}
