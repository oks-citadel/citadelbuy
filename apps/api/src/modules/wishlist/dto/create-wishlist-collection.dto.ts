import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWishlistCollectionDto {
  @ApiProperty({ description: 'Wishlist name', example: 'Birthday Ideas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Make wishlist public', example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
