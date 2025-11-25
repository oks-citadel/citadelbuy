import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateReorderRequestDto {
  @ApiProperty({ description: 'Inventory item ID' })
  @IsString()
  inventoryItemId: string;

  @ApiProperty({ description: 'Quantity to reorder' })
  @IsInt()
  quantityRequested: number;

  @ApiProperty({ description: 'Supplier ID', required: false })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ description: 'Estimated cost', required: false })
  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @ApiProperty({ description: 'Expected delivery date', required: false })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class FulfillReorderDto {
  @ApiProperty({ description: 'Quantity received' })
  @IsInt()
  quantityReceived: number;

  @ApiProperty({ description: 'Actual cost', required: false })
  @IsNumber()
  @IsOptional()
  actualCost?: number;

  @ApiProperty({ description: 'Purchase order ID', required: false })
  @IsString()
  @IsOptional()
  purchaseOrderId?: string;
}
