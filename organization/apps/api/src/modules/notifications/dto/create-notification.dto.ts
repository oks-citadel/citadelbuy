import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body/message' })
  @IsString()
  body: string;

  @ApiProperty({ enum: NotificationCategory, description: 'Notification category' })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Notification priority' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Image URL for rich notifications' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Action URL when notification is tapped' })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
