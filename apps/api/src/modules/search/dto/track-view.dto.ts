import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackViewDto {
  @ApiProperty({ description: 'Product ID', example: 'prod-123' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'User ID (optional for guests)', example: 'user-123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID for tracking', example: 'session-abc' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Traffic source', example: 'search' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { position: 5 } })
  @IsOptional()
  metadata?: Record<string, any>;
}
