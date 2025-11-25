import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod } from './update-banking-info.dto';

export class PayoutRequestDto {
  @ApiPropertyOptional({
    description: 'Start date for payout period',
    example: '2025-11-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'End date for payout period',
    example: '2025-11-15T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional({
    description: 'Specific payout method (overrides default)',
    enum: PayoutMethod,
    example: PayoutMethod.BANK_TRANSFER,
  })
  @IsEnum(PayoutMethod)
  @IsOptional()
  method?: PayoutMethod;

  @ApiPropertyOptional({
    description: 'Minimum payout amount requested',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;
}
