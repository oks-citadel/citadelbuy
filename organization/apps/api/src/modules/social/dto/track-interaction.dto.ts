import { IsString, IsEnum, IsOptional } from 'class-validator';
import { InteractionType } from '@prisma/client';

export class TrackInteractionDto {
  @IsEnum(InteractionType)
  targetType: InteractionType;

  @IsString()
  targetId: string;

  @IsString()
  interactionType: string; // like, comment, share, view, etc.

  @IsOptional()
  metadata?: any;
}
