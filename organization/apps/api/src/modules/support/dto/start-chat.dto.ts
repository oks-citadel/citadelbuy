import { IsString, IsOptional, IsEmail } from 'class-validator';

export class StartChatDto {
  @IsString()
  @IsOptional()
  guestName?: string;

  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @IsString()
  @IsOptional()
  initialMessage?: string;
}
