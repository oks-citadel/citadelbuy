import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ description: 'Source warehouse ID' })
  @IsString()
  fromWarehouseId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  toWarehouseId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Quantity to transfer' })
  @IsInt()
  quantity: number;

  @ApiProperty({ description: 'Shipping carrier', required: false })
  @IsString()
  @IsOptional()
  carrier?: string;

  @ApiProperty({ description: 'Tracking number', required: false })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiProperty({ description: 'Estimated arrival date', required: false })
  @IsDateString()
  @IsOptional()
  estimatedArrival?: string;

  @ApiProperty({ description: 'Transfer notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
