import { IsString, IsOptional, IsArray } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
