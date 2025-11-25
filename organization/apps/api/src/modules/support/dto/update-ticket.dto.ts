import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsBoolean()
  @IsOptional()
  slaBreached?: boolean;
}
