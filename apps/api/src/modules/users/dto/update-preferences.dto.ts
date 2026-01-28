import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Subscribe to newsletter',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  newsletter?: boolean;

  @ApiProperty({
    description: 'Enable push notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @ApiProperty({
    description: 'Email notifications',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiProperty({
    description: 'SMS notifications',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @ApiProperty({
    description: 'Preferred language (ISO 639-1 code)',
    example: 'en',
    required: false,
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'Preferred currency (ISO 4217 code)',
    example: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}
