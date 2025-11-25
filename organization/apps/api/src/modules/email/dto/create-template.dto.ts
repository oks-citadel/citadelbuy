import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailType } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name (unique)', example: 'order_confirmation' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email subject template', example: 'Order #{{orderNumber}} Confirmed' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML content template' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text content template' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiProperty({ description: 'Email type', enum: EmailType })
  @IsEnum(EmailType)
  type: EmailType;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Available variables for this template' })
  @IsOptional()
  @IsObject()
  variables?: any;

  @ApiPropertyOptional({ description: 'Is template active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
