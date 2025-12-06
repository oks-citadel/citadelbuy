import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentMethodDto {
  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Stripe payment method ID (tokenized from client)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  paymentMethodId: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set as default payment method',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}
