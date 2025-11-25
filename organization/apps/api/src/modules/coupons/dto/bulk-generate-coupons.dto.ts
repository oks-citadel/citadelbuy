import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCouponDto, CouponType } from './create-coupon.dto';

export class BulkGenerateCouponsDto extends CreateCouponDto {
  @ApiProperty({ description: 'Number of coupons to generate', example: 100 })
  @IsNumber()
  @Min(1)
  @Max(10000)
  quantity: number;

  @ApiProperty({ description: 'Code prefix', example: 'PROMO' })
  @IsString()
  codePrefix: string;

  @ApiPropertyOptional({ description: 'Code length (random part)', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(20)
  codeLength?: number;
}
