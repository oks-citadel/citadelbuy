import { IsString } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  message: string;
}
