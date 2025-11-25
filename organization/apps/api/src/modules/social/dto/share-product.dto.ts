import { IsString, IsOptional } from 'class-validator';

export class ShareProductDto {
  @IsString()
  productId: string;

  @IsString()
  platform: string; // facebook, twitter, whatsapp, email, etc.

  @IsString()
  @IsOptional()
  shareUrl?: string;
}
