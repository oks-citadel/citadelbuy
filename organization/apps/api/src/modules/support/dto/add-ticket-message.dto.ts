import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class AddTicketMessageDto {
  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
