import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockPricesDto {
  @ApiProperty({ description: 'Lock duration in hours', example: 24, minimum: 1, maximum: 168 })
  @IsNumber()
  @Min(1)
  @Max(168) // Max 7 days
  durationHours: number;
}
