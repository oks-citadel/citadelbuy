import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Impersonation access mode
 * VIEW_ONLY: Can only read data, cannot perform actions
 * FULL_ACCESS: Can perform actions on behalf of the user
 */
export enum ImpersonationMode {
  VIEW_ONLY = 'VIEW_ONLY',
  FULL_ACCESS = 'FULL_ACCESS',
}

export class StartImpersonationDto {
  @ApiProperty({
    description: 'The reason for impersonating this user (required for audit purposes)',
    example: 'Customer reported they cannot complete checkout - investigating issue #12345',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason for impersonation is required' })
  @MinLength(10, { message: 'Reason must be at least 10 characters for audit purposes' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason: string;

  @ApiProperty({
    description: 'The MFA verification code to authorize impersonation',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'MFA code is required to authorize impersonation' })
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  mfaCode: string;

  @ApiPropertyOptional({
    description: 'The impersonation access mode',
    enum: ImpersonationMode,
    default: ImpersonationMode.VIEW_ONLY,
    example: ImpersonationMode.VIEW_ONLY,
  })
  @IsOptional()
  @IsEnum(ImpersonationMode, { message: 'Mode must be VIEW_ONLY or FULL_ACCESS' })
  mode?: ImpersonationMode;

  @ApiPropertyOptional({
    description: 'Support ticket or issue reference number',
    example: 'TICKET-12345',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ticketReference?: string;
}

export class StopImpersonationDto {
  @ApiPropertyOptional({
    description: 'Notes about what was done during impersonation',
    example: 'Verified cart contents and updated shipping address per customer request',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Resolution status of the support case',
    example: 'resolved',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  resolution?: string;
}
