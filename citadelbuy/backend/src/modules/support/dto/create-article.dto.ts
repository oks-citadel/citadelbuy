import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ArticleStatus } from '@prisma/client';

export class CreateArticleDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
