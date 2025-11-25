import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeCartDto {
  @ApiProperty({ description: 'Guest session ID to merge from', example: 'session-abc123' })
  @IsString()
  guestSessionId: string;
}
