import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePhoneDto {
  @ApiProperty({
    description: 'Phone number in E.164 format or local format',
    example: '+1 (555) 123-4567',
  })
  @IsString()
  phoneNumber: string;
}

export class VerifyPhoneDto {
  @ApiProperty({
    description: 'Verification code sent to phone number',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  code: string;
}
