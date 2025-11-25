import { IsString, IsEmail, IsArray, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailType } from '@prisma/client';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address', example: 'user@example.com' })
  @IsEmail()
  to: string;

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC recipients' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({ description: 'Email subject', example: 'Order Confirmation' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML content' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiProperty({ description: 'Email type', enum: EmailType })
  @IsEnum(EmailType)
  type: EmailType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
