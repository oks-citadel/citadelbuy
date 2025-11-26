import { IsString, IsOptional, IsEnum, IsEmail, IsArray } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  relatedOrderId?: string;

  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
