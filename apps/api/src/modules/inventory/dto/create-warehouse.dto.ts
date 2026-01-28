import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Warehouse name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Warehouse code (e.g., WH-NYC-01)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Manager user ID', required: false })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiProperty({ description: 'Is primary warehouse', default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
