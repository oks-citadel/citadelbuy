import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class BackorderQueryDto {
  @ApiProperty({ description: 'Customer ID filter', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Product ID filter', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Active backorders only', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

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
