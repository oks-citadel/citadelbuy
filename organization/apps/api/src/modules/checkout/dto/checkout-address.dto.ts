import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new saved address
 */
export class CreateCheckoutAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name for the address' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: '123 Main St, Apt 4B', description: 'Street address' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: 'New York', description: 'City name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal/ZIP code' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: 'United States', description: 'Country' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({ example: false, description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * DTO for updating an existing saved address
 */
export class UpdateCheckoutAddressDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name for the address' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St, Apt 4B', description: 'Street address' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'City name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'NY', description: 'State or province' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '10001', description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'United States', description: 'Country' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: false, description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * DTO for guest checkout shipping address (all fields required)
 */
export class GuestShippingAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name for shipping' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1 (555) 123-4567', description: 'Phone number' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '123 Main St, Apt 4B', description: 'Street address' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: 'New York', description: 'City name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal/ZIP code' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: 'United States', description: 'Country' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;
}

/**
 * DTO for guest checkout billing address
 */
export class GuestBillingAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name for billing' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '123 Main St, Apt 4B', description: 'Street address' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: 'New York', description: 'City name' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal/ZIP code' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: 'United States', description: 'Country' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;
}
