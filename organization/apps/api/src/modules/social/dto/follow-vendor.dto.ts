import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class FollowVendorDto {
  @IsString()
  vendorId: string;

  @IsBoolean()
  @IsOptional()
  notifyOnNewProducts?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyOnDeals?: boolean;
}
