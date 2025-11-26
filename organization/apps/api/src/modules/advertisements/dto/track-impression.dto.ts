import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackImpressionDto {
  @ApiProperty({ description: 'Advertisement ID' })
  @IsUUID()
  @IsNotEmpty()
  adId: string;

  @ApiPropertyOptional({ description: 'User ID (if authenticated)' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Placement location (e.g., homepage, search, product_page)' })
  @IsString()
  @IsOptional()
  placement?: string;

  @ApiPropertyOptional({ description: 'User location (country/city)' })
  @IsString()
  @IsOptional()
  location?: string;
}
