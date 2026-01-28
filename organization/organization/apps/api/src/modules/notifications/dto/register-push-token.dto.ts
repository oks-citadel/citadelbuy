import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DevicePlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Unique device identifier' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Push notification token from FCM/APNs' })
  @IsString()
  token: string;

  @ApiProperty({ enum: DevicePlatform, description: 'Device platform' })
  @IsEnum(DevicePlatform)
  platform: 'IOS' | 'ANDROID' | 'WEB';
}
