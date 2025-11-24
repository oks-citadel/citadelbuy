import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackAbandonmentDto {
  @ApiProperty({ description: 'Contact email for recovery', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;
}
