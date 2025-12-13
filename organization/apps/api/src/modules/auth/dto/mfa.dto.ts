import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupDto {
  @ApiProperty({
    description: 'MFA type - currently only TOTP is supported',
    example: 'totp',
    default: 'totp',
  })
  @IsOptional()
  @IsString()
  type?: 'totp';
}

export class MfaVerifyDto {
  @ApiProperty({
    description: 'The 6-digit TOTP code from the authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}

export class MfaSetupResponse {
  @ApiProperty({
    description: 'The secret key for manual entry',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'QR code data URL for scanning',
    example: 'data:image/png;base64,...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'Backup codes for account recovery',
    example: ['ABC123', 'DEF456', 'GHI789'],
  })
  backupCodes: string[];
}
