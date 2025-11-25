import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BnplProvider } from '@prisma/client';

export class CreatePaymentPlanDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ enum: BnplProvider, description: 'BNPL provider' })
  @IsEnum(BnplProvider)
  provider: BnplProvider;

  @ApiProperty({ description: 'Number of installments', minimum: 2, maximum: 12 })
  @IsInt()
  @Min(2)
  numberOfInstallments: number;

  @ApiPropertyOptional({ description: 'Down payment amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  downPayment?: number;

  @ApiPropertyOptional({ description: 'Payment frequency' })
  @IsString()
  @IsOptional()
  frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
}
