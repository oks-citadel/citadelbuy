import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  targetType: string; // product, review, article, etc.

  @IsString()
  targetId: string;

  @IsString()
  comment: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
