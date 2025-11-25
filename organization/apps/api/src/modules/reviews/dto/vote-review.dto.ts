import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteReviewDto {
  @ApiProperty({
    description: 'Whether the review was helpful',
    example: true,
  })
  @IsBoolean()
  isHelpful: boolean;
}
