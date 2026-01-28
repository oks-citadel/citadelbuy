import { IsString, IsNotEmpty, Length, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

/**
 * DTO for MFA challenge verification during login
 * Used when a user with MFA enabled logs in and needs to verify their TOTP code
 */
export class MfaChallengeDto {
  @ApiProperty({
    description: 'User ID from the initial login response',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'The 6-digit TOTP code from the authenticator app, or a backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint hash for trusted device feature',
    example: 'a1b2c3d4e5f6g7h8i9j0',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'User-friendly device name',
    example: 'Chrome on MacBook Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Whether to trust this device for future logins (skip MFA)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;

  @ApiPropertyOptional({
    description: 'Device platform',
    example: 'web',
  })
  @IsOptional()
  @IsString()
  platform?: string;
}

/**
 * DTO for revoking a trusted device
 */
export class RevokeTrustedDeviceDto {
  @ApiProperty({
    description: 'Device ID (fingerprint hash) to revoke',
    example: 'a1b2c3d4e5f6g7h8i9j0',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Reason for revoking the device',
    example: 'Device lost or stolen',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
