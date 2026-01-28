import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RetryWebhookDto {
  @ApiProperty({
    description: 'Webhook delivery ID to retry',
    example: 'delivery_1234567890',
  })
  @IsString()
  deliveryId: string;
}

export class RetryDeadLetterDto {
  @ApiProperty({
    description: 'Dead letter ID to retry',
    example: 'dl_1234567890',
  })
  @IsString()
  deadLetterId: string;
}
