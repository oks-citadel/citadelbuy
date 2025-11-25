import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateCannedResponseDto {
  @IsString()
  title: string;

  @IsString()
  shortcut: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
