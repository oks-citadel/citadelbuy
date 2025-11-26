import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class AdjustStockDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Quantity to adjust (positive or negative)' })
  @IsInt()
  quantity: number;

  @ApiProperty({
    description: 'Type of stock movement',
    enum: StockMovementType
  })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'Reason for adjustment', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Unit cost', required: false })
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiProperty({ description: 'Related order ID', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;
}
