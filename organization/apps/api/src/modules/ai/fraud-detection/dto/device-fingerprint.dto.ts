import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for device fingerprint data sent from frontend
 */
export class DeviceFingerprintDto {
  @ApiProperty({
    description: 'User agent string from the browser/device',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  })
  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @ApiPropertyOptional({
    description: 'Canvas fingerprint hash',
    example: 'a1b2c3d4e5f6...',
  })
  @IsOptional()
  @IsString()
  canvas?: string;

  @ApiPropertyOptional({
    description: 'WebGL fingerprint hash',
    example: 'f6e5d4c3b2a1...',
  })
  @IsOptional()
  @IsString()
  webgl?: string;

  @ApiPropertyOptional({
    description: 'Audio context fingerprint hash',
    example: '123abc456def...',
  })
  @IsOptional()
  @IsString()
  audio?: string;

  @ApiPropertyOptional({
    description: 'List of available fonts',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fonts?: string[];

  @ApiPropertyOptional({
    description: 'List of browser plugins',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plugins?: string[];

  @ApiPropertyOptional({
    description: 'Screen resolution (e.g., "1920x1080")',
    example: '1920x1080',
  })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional({
    description: 'Color depth of the display',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  colorDepth?: number;

  @ApiPropertyOptional({
    description: 'Browser timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Primary browser language',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'List of browser languages',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({
    description: 'Navigator platform',
    example: 'Win32',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: 'Whether cookies are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  cookiesEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Do Not Track setting',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  doNotTrack?: boolean;

  @ApiPropertyOptional({
    description: 'Number of logical CPU cores',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(128)
  hardwareConcurrency?: number;

  @ApiPropertyOptional({
    description: 'Device memory in GB',
    example: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deviceMemory?: number;

  @ApiPropertyOptional({
    description: 'Maximum touch points supported',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTouchPoints?: number;

  @ApiPropertyOptional({
    description: 'WebGL vendor string',
    example: 'Google Inc. (NVIDIA)',
  })
  @IsOptional()
  @IsString()
  webglVendor?: string;

  @ApiPropertyOptional({
    description: 'WebGL renderer string',
    example: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11...)',
  })
  @IsOptional()
  @IsString()
  webglRenderer?: string;

  // Bot detection flags
  @ApiPropertyOptional({
    description: 'Whether WebDriver is detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasWebdriver?: boolean;

  @ApiPropertyOptional({
    description: 'Whether automation tools are detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasAutomation?: boolean;

  @ApiPropertyOptional({
    description: 'Whether PhantomJS is detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPhantom?: boolean;

  @ApiPropertyOptional({
    description: 'Whether Nightmare is detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasNightmare?: boolean;

  @ApiPropertyOptional({
    description: 'Whether Selenium is detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasSelenium?: boolean;

  @ApiPropertyOptional({
    description: 'Whether Cypress driver is detected',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasCypressDriver?: boolean;

  // Behavioral signals
  @ApiPropertyOptional({
    description: 'Number of mouse movements during session',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mouseMovements?: number;

  @ApiPropertyOptional({
    description: 'Number of keystrokes during session',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  keystrokes?: number;

  @ApiPropertyOptional({
    description: 'Number of touch events during session',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  touchEvents?: number;

  @ApiPropertyOptional({
    description: 'Number of scroll events during session',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  scrollEvents?: number;

  @ApiPropertyOptional({
    description: 'Session duration in milliseconds',
    example: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sessionDuration?: number;

  // Mobile-specific
  @ApiPropertyOptional({
    description: 'Device model (for mobile devices)',
    example: 'iPhone 14 Pro',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({
    description: 'OS version',
    example: '16.2',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'App version (for mobile apps)',
    example: '2.5.0',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Whether device is rooted/jailbroken',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;

  @ApiPropertyOptional({
    description: 'Whether device is an emulator',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;
}

/**
 * DTO for validating a device fingerprint
 */
export class ValidateDeviceFingerprintDto {
  @ApiProperty({
    description: 'Device fingerprint data',
    type: DeviceFingerprintDto,
  })
  @ValidateNested()
  @Type(() => DeviceFingerprintDto)
  fingerprint: DeviceFingerprintDto;

  @ApiPropertyOptional({
    description: 'User ID (if authenticated)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'IP address of the request',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

/**
 * DTO for recording login with fingerprint
 */
export class RecordLoginWithFingerprintDto {
  @ApiProperty({
    description: 'Fingerprint hash',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @ApiProperty({
    description: 'User ID',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Whether the login was successful',
  })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({
    description: 'IP address',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

/**
 * DTO for blocking a device
 */
export class BlockDeviceDto {
  @ApiProperty({
    description: 'Fingerprint hash of the device to block',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Reason for blocking',
    example: 'Confirmed bot activity',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'User ID associated with the incident',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional evidence',
  })
  @IsOptional()
  evidence?: any;
}

/**
 * DTO for unblocking a device
 */
export class UnblockDeviceDto {
  @ApiProperty({
    description: 'Fingerprint hash of the device to unblock',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Resolution explanation',
    example: 'False positive - legitimate user verified',
  })
  @IsString()
  @IsNotEmpty()
  resolution: string;
}

/**
 * DTO for verifying a user's device
 */
export class VerifyDeviceDto {
  @ApiProperty({
    description: 'Fingerprint hash of the device to verify',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Verification method used',
    example: 'email',
    enum: ['email', 'sms', '2fa', 'manual'],
  })
  @IsString()
  @IsNotEmpty()
  verificationMethod: string;
}

/**
 * DTO for recording suspicious activity
 */
export class RecordSuspiciousActivityDto {
  @ApiProperty({
    description: 'Fingerprint hash of the device',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  @IsString()
  @IsNotEmpty()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Type of suspicious activity',
    example: 'credential_stuffing',
    enum: [
      'credential_stuffing',
      'brute_force',
      'account_takeover',
      'payment_fraud',
      'bot_activity',
      'scraping',
      'other',
    ],
  })
  @IsString()
  @IsNotEmpty()
  activityType: string;

  @ApiProperty({
    description: 'Description of the suspicious activity',
    example: 'Multiple failed login attempts from different user accounts',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'User ID if known',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'IP address',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Additional evidence',
  })
  @IsOptional()
  evidence?: any;
}

/**
 * Response DTO for device validation
 */
export class DeviceValidationResponseDto {
  @ApiProperty({
    description: 'Whether the device fingerprint is valid for the action',
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Unique hash of the device fingerprint',
  })
  fingerprintHash: string;

  @ApiProperty({
    description: 'Trust score from 0-100',
    minimum: 0,
    maximum: 100,
  })
  trustScore: number;

  @ApiProperty({
    description: 'Risk level assessment',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  riskLevel: string;

  @ApiProperty({
    description: 'Whether this is a new device',
  })
  isNewDevice: boolean;

  @ApiProperty({
    description: 'Whether bot activity is detected',
  })
  isBot: boolean;

  @ApiProperty({
    description: 'Whether emulator is detected',
  })
  isEmulator: boolean;

  @ApiProperty({
    description: 'Whether the device is trusted',
  })
  isTrusted: boolean;

  @ApiProperty({
    description: 'Whether the device is blocked',
  })
  isBlocked: boolean;

  @ApiPropertyOptional({
    description: 'Reason for blocking if blocked',
  })
  blockReason?: string;

  @ApiProperty({
    description: 'Warning messages',
    type: [String],
  })
  warnings: string[];

  @ApiProperty({
    description: 'Recommended actions',
    type: [String],
  })
  recommendations: string[];

  @ApiProperty({
    description: 'Device information',
  })
  deviceInfo: {
    platform: string;
    browserFamily?: string;
    browserVersion?: string;
    osFamily?: string;
    osVersion?: string;
    deviceType?: string;
  };
}

/**
 * Response DTO for user device list
 */
export class UserDeviceDto {
  @ApiProperty({
    description: 'Fingerprint hash',
  })
  fingerprintHash: string;

  @ApiPropertyOptional({
    description: 'User-assigned device nickname',
  })
  deviceNickname?: string;

  @ApiProperty({
    description: 'Trust level for this user-device pair',
    enum: ['new', 'recognized', 'trusted', 'suspicious', 'blocked'],
  })
  trustLevel: string;

  @ApiProperty({
    description: 'Whether device is verified',
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'First time device was used by this user',
  })
  firstUsedAt: Date;

  @ApiProperty({
    description: 'Last time device was used by this user',
  })
  lastUsedAt: Date;

  @ApiProperty({
    description: 'Number of times device has been used',
  })
  useCount: number;

  @ApiPropertyOptional({
    description: 'Last IP address used with this device',
  })
  lastIpAddress?: string;

  @ApiPropertyOptional({
    description: 'Device platform',
    enum: ['IOS', 'ANDROID', 'WEB'],
  })
  platform?: string;

  @ApiPropertyOptional({
    description: 'Browser family',
  })
  browserFamily?: string;

  @ApiPropertyOptional({
    description: 'Operating system family',
  })
  osFamily?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    enum: ['desktop', 'mobile', 'tablet'],
  })
  deviceType?: string;

  @ApiProperty({
    description: 'Whether bot activity is detected',
  })
  isBot: boolean;

  @ApiProperty({
    description: 'Whether device is an emulator',
  })
  isEmulator: boolean;
}
