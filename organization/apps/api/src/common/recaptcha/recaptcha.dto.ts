import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported reCAPTCHA actions for verification
 */
export enum RecaptchaAction {
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  CHECKOUT = 'checkout',
  CONTACT = 'contact',
  COMMENT = 'comment',
  SUBMIT_FORM = 'submit_form',
}

/**
 * reCAPTCHA version
 */
export enum RecaptchaVersion {
  V2_CHECKBOX = 'v2_checkbox',
  V2_INVISIBLE = 'v2_invisible',
  V3 = 'v3',
}

/**
 * DTO for reCAPTCHA token validation request
 */
export class RecaptchaTokenDto {
  @ApiProperty({
    description: 'The reCAPTCHA token received from the client',
    example: '03AGdBq26...',
  })
  @IsString()
  @IsNotEmpty({ message: 'reCAPTCHA token is required' })
  recaptchaToken: string;

  @ApiPropertyOptional({
    description: 'The action name for reCAPTCHA v3 verification',
    enum: RecaptchaAction,
    example: RecaptchaAction.LOGIN,
  })
  @IsOptional()
  @IsEnum(RecaptchaAction, { message: 'Invalid reCAPTCHA action' })
  recaptchaAction?: RecaptchaAction;

  @ApiPropertyOptional({
    description: 'The reCAPTCHA version used',
    enum: RecaptchaVersion,
    default: RecaptchaVersion.V3,
  })
  @IsOptional()
  @IsEnum(RecaptchaVersion, { message: 'Invalid reCAPTCHA version' })
  recaptchaVersion?: RecaptchaVersion;
}

/**
 * Interface for Google reCAPTCHA verification response
 */
export interface GoogleRecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number; // v3 only (0.0 - 1.0)
  action?: string; // v3 only
  'error-codes'?: string[];
}

/**
 * Interface for internal reCAPTCHA verification result
 */
export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challengeTimestamp?: string;
  errorCodes?: string[];
  isBot: boolean;
  version: RecaptchaVersion;
}

/**
 * Interface for reCAPTCHA configuration
 */
export interface RecaptchaConfig {
  siteKey: string;
  secretKey: string;
  scoreThreshold: number;
  enabled: boolean;
  exemptIps: string[];
  verifyUrl: string;
  cacheTtl: number;
}

/**
 * Interface for reCAPTCHA verification log entry
 */
export interface RecaptchaLogEntry {
  timestamp: Date;
  ip: string;
  token: string;
  action?: RecaptchaAction;
  version: RecaptchaVersion;
  success: boolean;
  score?: number;
  isBot: boolean;
  errorCodes?: string[];
  userAgent?: string;
  requestPath?: string;
}
