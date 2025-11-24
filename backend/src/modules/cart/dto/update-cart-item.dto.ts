import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity', example: 3 })
  @IsNumber()
  @Min(0)
  quantity: number;
}
