import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PayoutMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  CHECK = 'CHECK',
}

export class UpdateBankingInfoDto {
  @ApiProperty({
    description: 'Preferred payout method',
    enum: PayoutMethod,
    example: PayoutMethod.BANK_TRANSFER,
  })
  @IsEnum(PayoutMethod)
  @IsNotEmpty()
  payoutMethod: PayoutMethod;

  @ApiPropertyOptional({
    description: 'Bank name (for BANK_TRANSFER)',
    example: 'Chase Bank',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (will be encrypted)',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank routing number',
    example: '021000021',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  routingNumber?: string;

  @ApiPropertyOptional({
    description: 'Account holder name',
    example: 'Acme Electronics LLC',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  accountHolderName?: string;

  @ApiPropertyOptional({
    description: 'PayPal email (for PAYPAL method)',
    example: 'paypal@acmeelectronics.com',
  })
  @IsEmail()
  @IsOptional()
  paypalEmail?: string;

  @ApiPropertyOptional({
    description: 'Stripe account ID (for STRIPE method)',
    example: 'acct_1234567890',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  stripeAccountId?: string;

  @ApiPropertyOptional({
    description: 'Swift/BIC code for international transfers',
    example: 'CHASUS33',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional({
    description: 'IBAN for international accounts',
    example: 'GB82 WEST 1234 5698 7654 32',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  iban?: string;
}
