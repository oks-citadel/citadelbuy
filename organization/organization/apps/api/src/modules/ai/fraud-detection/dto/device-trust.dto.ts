import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsDate,
  ValidateNested,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Risk level enumeration
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Trust level enumeration for user-device associations
 */
export enum DeviceTrustLevel {
  NEW = 'new',
  RECOGNIZED = 'recognized',
  TRUSTED = 'trusted',
  SUSPICIOUS = 'suspicious',
  BLOCKED = 'blocked',
}

/**
 * Suspicion level enumeration
 */
export enum SuspicionLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Device Trust Score DTO
 * Represents the trust assessment of a device
 */
export class DeviceTrustScoreDto {
  @ApiProperty({
    description: 'Unique hash identifying the device fingerprint',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  @IsString()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Trust score from 0 to 100, higher is more trusted',
    minimum: 0,
    maximum: 100,
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  trustScore: number;

  @ApiProperty({
    description: 'List of risk indicators detected',
    type: [String],
    example: ['New device', 'Different timezone from usual'],
  })
  @IsArray()
  @IsString({ each: true })
  riskIndicators: string[];

  @ApiProperty({
    description: 'Whether bot activity was detected',
    example: false,
  })
  @IsBoolean()
  isBot: boolean;

  @ApiProperty({
    description: 'Whether the device is an emulator',
    example: false,
  })
  @IsBoolean()
  isEmulator: boolean;

  @ApiProperty({
    description: 'Whether proxy usage was detected',
    example: false,
  })
  @IsBoolean()
  isProxy: boolean;

  @ApiProperty({
    description: 'Whether VPN usage was detected',
    example: false,
  })
  @IsBoolean()
  isVpn: boolean;

  @ApiProperty({
    description: 'Whether Tor network usage was detected',
    example: false,
  })
  @IsBoolean()
  isTor: boolean;

  @ApiProperty({
    description: 'When the device was first seen',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  firstSeenAt: Date;

  @ApiProperty({
    description: 'When the device was last seen',
    example: '2024-01-17T14:20:00Z',
  })
  @IsDate()
  @Type(() => Date)
  lastSeenAt: Date;

  @ApiProperty({
    description: 'User IDs associated with this device',
    type: [String],
    example: ['user-123', 'user-456'],
  })
  @IsArray()
  @IsString({ each: true })
  associatedUsers: string[];

  @ApiProperty({
    description: 'Total number of logins from this device',
    example: 25,
  })
  @IsNumber()
  loginCount: number;

  @ApiProperty({
    description: 'Number of fraud reports associated with this device',
    example: 0,
  })
  @IsNumber()
  fraudReportCount: number;
}

/**
 * Trust score factors breakdown
 */
export class TrustScoreFactorsDto {
  @ApiProperty({ description: 'Base trust score', example: 50 })
  @IsNumber()
  baseScore: number;

  @ApiProperty({ description: 'Bonus for device age', example: 10 })
  @IsNumber()
  deviceAgeBonus: number;

  @ApiProperty({ description: 'Bonus for successful logins', example: 15 })
  @IsNumber()
  successfulLoginsBonus: number;

  @ApiProperty({ description: 'Bonus for device verification', example: 15 })
  @IsNumber()
  verificationBonus: number;

  @ApiProperty({ description: 'Bonus for consistent location', example: 5 })
  @IsNumber()
  consistentLocationBonus: number;

  @ApiProperty({ description: 'Penalty for bot detection', example: -30 })
  @IsNumber()
  botPenalty: number;

  @ApiProperty({ description: 'Penalty for emulator detection', example: -20 })
  @IsNumber()
  emulatorPenalty: number;

  @ApiProperty({ description: 'Penalty for suspicious activity', example: -15 })
  @IsNumber()
  suspiciousActivityPenalty: number;

  @ApiProperty({ description: 'Penalty for failed logins', example: -10 })
  @IsNumber()
  failedLoginsPenalty: number;

  @ApiProperty({ description: 'Penalty for multiple users', example: -5 })
  @IsNumber()
  multiUserPenalty: number;

  @ApiProperty({ description: 'Penalty for fraud incidents', example: -25 })
  @IsNumber()
  fraudIncidentPenalty: number;
}

/**
 * Device history activity event
 */
export class DeviceActivityEventDto {
  @ApiProperty({
    description: 'When the event occurred',
    example: '2024-01-17T14:20:00Z',
  })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({
    description: 'Type of event',
    example: 'user_associated',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Human-readable description of the event',
    example: 'Device verified via email',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'User ID associated with the event',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Severity of the event (for incidents)',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsString()
  severity?: string;
}

/**
 * User-device association details
 */
export class UserDeviceAssociationDto {
  @ApiProperty({ description: 'User ID', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Trust level for this user-device pair',
    enum: DeviceTrustLevel,
    example: DeviceTrustLevel.TRUSTED,
  })
  @IsEnum(DeviceTrustLevel)
  trustLevel: DeviceTrustLevel;

  @ApiPropertyOptional({
    description: 'User-assigned device nickname',
    example: 'My Work Laptop',
  })
  @IsOptional()
  @IsString()
  deviceNickname?: string;

  @ApiProperty({ description: 'Whether device is verified', example: true })
  @IsBoolean()
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'When device was verified',
    example: '2024-01-16T09:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'Verification method used',
    example: 'email',
  })
  @IsOptional()
  @IsString()
  verificationMethod?: string;

  @ApiProperty({
    description: 'When device was first used by this user',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  firstUsedAt: Date;

  @ApiProperty({
    description: 'When device was last used by this user',
    example: '2024-01-17T14:20:00Z',
  })
  @IsDate()
  @Type(() => Date)
  lastUsedAt: Date;

  @ApiProperty({ description: 'Number of times device has been used', example: 50 })
  @IsNumber()
  useCount: number;

  @ApiProperty({ description: 'Successful login count', example: 48 })
  @IsNumber()
  successfulLogins: number;

  @ApiProperty({ description: 'Failed login count', example: 2 })
  @IsNumber()
  failedLogins: number;

  @ApiPropertyOptional({
    description: 'Last IP address used',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  lastIpAddress?: string;
}

/**
 * Fraud incident details
 */
export class FraudIncidentDto {
  @ApiProperty({ description: 'Incident ID', example: 'incident-123' })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Type of incident',
    example: 'account_takeover',
  })
  @IsString()
  incidentType: string;

  @ApiProperty({
    description: 'Severity level',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @IsString()
  severity: string;

  @ApiProperty({
    description: 'Incident description',
    example: 'Multiple failed login attempts from different user accounts',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Current status',
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    example: 'open',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'When incident was created',
    example: '2024-01-17T12:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'When incident was resolved',
    example: '2024-01-17T15:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Resolution details',
    example: 'False positive - legitimate user activity',
  })
  @IsOptional()
  @IsString()
  resolution?: string;
}

/**
 * Device information details
 */
export class DeviceInfoDto {
  @ApiProperty({ description: 'Device record ID', example: 'device-123' })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Platform type',
    enum: ['IOS', 'ANDROID', 'WEB'],
    example: 'WEB',
  })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ description: 'Browser family', example: 'Chrome' })
  @IsOptional()
  @IsString()
  browserFamily?: string;

  @ApiPropertyOptional({ description: 'Browser version', example: '120' })
  @IsOptional()
  @IsString()
  browserVersion?: string;

  @ApiPropertyOptional({ description: 'Operating system family', example: 'Windows' })
  @IsOptional()
  @IsString()
  osFamily?: string;

  @ApiPropertyOptional({ description: 'Operating system version', example: '10' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    enum: ['desktop', 'mobile', 'tablet'],
    example: 'desktop',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Screen resolution', example: '1920x1080' })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Language', example: 'en-US' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Current trust score', example: 75 })
  @IsNumber()
  trustScore: number;

  @ApiProperty({
    description: 'Risk level',
    enum: RiskLevel,
    example: RiskLevel.LOW,
  })
  @IsString()
  riskLevel: string;

  @ApiProperty({ description: 'Whether device is trusted', example: true })
  @IsBoolean()
  isTrusted: boolean;

  @ApiProperty({ description: 'Whether device is blocked', example: false })
  @IsBoolean()
  isBlocked: boolean;

  @ApiPropertyOptional({ description: 'Reason for blocking', example: null })
  @IsOptional()
  @IsString()
  blockReason?: string;

  @ApiProperty({ description: 'Whether bot activity detected', example: false })
  @IsBoolean()
  isBot: boolean;

  @ApiProperty({ description: 'Whether emulator detected', example: false })
  @IsBoolean()
  isEmulator: boolean;

  @ApiProperty({ description: 'Bot detection confidence', example: 0.1 })
  @IsNumber()
  botConfidence: number;

  @ApiProperty({ description: 'Total login count', example: 100 })
  @IsNumber()
  loginCount: number;

  @ApiProperty({ description: 'Total transaction count', example: 25 })
  @IsNumber()
  transactionCount: number;

  @ApiProperty({ description: 'Failed login count', example: 3 })
  @IsNumber()
  failedLoginCount: number;

  @ApiProperty({ description: 'Suspicious activity count', example: 0 })
  @IsNumber()
  suspiciousActivityCount: number;

  @ApiProperty({ description: 'When device was first seen' })
  @IsDate()
  @Type(() => Date)
  firstSeenAt: Date;

  @ApiProperty({ description: 'When device was last seen' })
  @IsDate()
  @Type(() => Date)
  lastSeenAt: Date;
}

/**
 * Complete device history response
 */
export class DeviceHistoryResponseDto {
  @ApiProperty({ description: 'Device fingerprint hash' })
  @IsString()
  fingerprintHash: string;

  @ApiProperty({ description: 'Whether device exists in database' })
  @IsBoolean()
  exists: boolean;

  @ApiPropertyOptional({
    description: 'Device details',
    type: DeviceInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;

  @ApiProperty({
    description: 'User associations for this device',
    type: [UserDeviceAssociationDto],
  })
  @ValidateNested({ each: true })
  @Type(() => UserDeviceAssociationDto)
  userAssociations: UserDeviceAssociationDto[];

  @ApiProperty({
    description: 'Fraud incidents for this device',
    type: [FraudIncidentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => FraudIncidentDto)
  fraudIncidents: FraudIncidentDto[];

  @ApiProperty({
    description: 'IP addresses seen with this device',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ipAddresses: string[];

  @ApiProperty({
    description: 'Activity timeline for the device',
    type: [DeviceActivityEventDto],
  })
  @ValidateNested({ each: true })
  @Type(() => DeviceActivityEventDto)
  activityTimeline: DeviceActivityEventDto[];
}

/**
 * Detected anomaly details
 */
export class DeviceAnomalyDto {
  @ApiProperty({
    description: 'Type of anomaly detected',
    example: 'new_device',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Severity of the anomaly',
    enum: RiskLevel,
    example: RiskLevel.MEDIUM,
  })
  @IsEnum(RiskLevel)
  severity: RiskLevel;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Login from a new device not previously associated with this user',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Anomaly contribution to total score',
    example: 25,
  })
  @IsNumber()
  score: number;
}

/**
 * Anomaly detection result
 */
export class DeviceAnomalyResultDto {
  @ApiProperty({ description: 'User ID analyzed' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Device fingerprint hash' })
  @IsString()
  fingerprintHash: string;

  @ApiProperty({
    description: 'Total anomaly score',
    example: 35,
  })
  @IsNumber()
  anomalyScore: number;

  @ApiProperty({
    description: 'Overall risk level based on anomalies',
    enum: RiskLevel,
    example: RiskLevel.MEDIUM,
  })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({
    description: 'List of anomalies detected',
    type: [DeviceAnomalyDto],
  })
  @ValidateNested({ each: true })
  @Type(() => DeviceAnomalyDto)
  anomalies: DeviceAnomalyDto[];

  @ApiProperty({
    description: 'Recommended actions',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({
    description: 'Whether the action should be blocked',
    example: false,
  })
  @IsBoolean()
  shouldBlock: boolean;

  @ApiProperty({
    description: 'Whether MFA should be required',
    example: true,
  })
  @IsBoolean()
  requireMfa: boolean;

  @ApiProperty({
    description: 'Whether additional verification is needed',
    example: true,
  })
  @IsBoolean()
  requireVerification: boolean;
}

/**
 * Suspicious device check details
 */
export class SuspiciousDeviceDetailsDto {
  @ApiProperty({ description: 'Whether bot activity detected' })
  @IsBoolean()
  isBot: boolean;

  @ApiProperty({
    description: 'Bot detection confidence (0-1)',
    example: 0.85,
  })
  @IsNumber()
  botConfidence: number;

  @ApiProperty({
    description: 'Bot detection signals',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  botSignals: string[];

  @ApiProperty({ description: 'Whether emulator detected' })
  @IsBoolean()
  isEmulator: boolean;

  @ApiProperty({
    description: 'Emulator detection confidence (0-1)',
    example: 0.0,
  })
  @IsNumber()
  emulatorConfidence: number;

  @ApiProperty({
    description: 'Emulator detection signals',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  emulatorSignals: string[];

  @ApiProperty({ description: 'Whether device is blocked' })
  @IsBoolean()
  isBlocked: boolean;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  @IsOptional()
  @IsString()
  blockReason?: string;

  @ApiProperty({ description: 'Whether device has fraud history' })
  @IsBoolean()
  hasFraudHistory: boolean;

  @ApiProperty({ description: 'Number of fraud incidents' })
  @IsNumber()
  fraudIncidentCount: number;
}

/**
 * Suspicious device check result
 */
export class SuspiciousDeviceResultDto {
  @ApiProperty({
    description: 'Whether the device is considered suspicious',
    example: false,
  })
  @IsBoolean()
  isSuspicious: boolean;

  @ApiProperty({
    description: 'Level of suspicion',
    enum: SuspicionLevel,
    example: SuspicionLevel.NONE,
  })
  @IsEnum(SuspicionLevel)
  suspicionLevel: SuspicionLevel;

  @ApiProperty({
    description: 'Reasons for suspicion',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];

  @ApiProperty({
    description: 'Detailed detection information',
    type: SuspiciousDeviceDetailsDto,
  })
  @ValidateNested()
  @Type(() => SuspiciousDeviceDetailsDto)
  details: SuspiciousDeviceDetailsDto;
}

/**
 * Link device to user request
 */
export class LinkDeviceToUserDto {
  @ApiProperty({
    description: 'Device fingerprint hash',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  @IsString()
  fingerprintHash: string;

  @ApiProperty({ description: 'User ID to link', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'IP address of the request',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User-friendly device nickname',
    example: 'My Work Laptop',
  })
  @IsOptional()
  @IsString()
  deviceNickname?: string;

  @ApiPropertyOptional({
    description: 'Whether to mark device as verified',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  markAsVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Verification method if marking as verified',
    example: 'email',
  })
  @IsOptional()
  @IsString()
  verificationMethod?: string;
}

/**
 * Link device to user response
 */
export class LinkDeviceToUserResponseDto {
  @ApiProperty({ description: 'Whether the operation succeeded' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Whether this is a new association' })
  @IsBoolean()
  isNewAssociation: boolean;

  @ApiProperty({
    description: 'Current trust level',
    enum: DeviceTrustLevel,
  })
  @IsString()
  trustLevel: string;
}

/**
 * Get device trust for user request
 */
export class GetDeviceTrustDto {
  @ApiProperty({ description: 'User ID', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Device fingerprint hash',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  @IsString()
  fingerprintHash: string;
}

/**
 * Device trust for user response
 */
export class DeviceTrustForUserResponseDto {
  @ApiProperty({ description: 'Trust score (0-100)', example: 75 })
  @IsNumber()
  trustScore: number;

  @ApiProperty({
    description: 'Trust level',
    enum: DeviceTrustLevel,
    example: DeviceTrustLevel.TRUSTED,
  })
  @IsString()
  trustLevel: string;

  @ApiProperty({ description: 'Whether this is a known device for the user' })
  @IsBoolean()
  isKnownDevice: boolean;

  @ApiProperty({ description: 'Whether the device is verified' })
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({ description: 'Device age in days', example: 30 })
  @IsNumber()
  deviceAge: number;

  @ApiProperty({ description: 'Number of times device has been used', example: 50 })
  @IsNumber()
  useCount: number;
}
