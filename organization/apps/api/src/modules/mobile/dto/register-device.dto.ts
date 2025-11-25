import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class RegisterDeviceDto {
  @IsString()
  deviceId: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  token: string;

  @IsString()
  @IsOptional()
  deviceName?: string;
}
