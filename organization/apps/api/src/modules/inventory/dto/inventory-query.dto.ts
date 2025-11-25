import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { StockStatus } from '@prisma/client';

export class InventoryQueryDto {
  @ApiProperty({ description: 'Product ID filter', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Warehouse ID filter', required: false })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({
    description: 'Stock status filter',
    enum: StockStatus,
    required: false
  })
  @IsEnum(StockStatus)
  @IsOptional()
  status?: StockStatus;

  @ApiProperty({ description: 'Low stock only (below reorder point)', required: false })
  @IsOptional()
  lowStockOnly?: boolean;

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
