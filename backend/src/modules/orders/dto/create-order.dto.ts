import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1 (555) 123-4567' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Main St, Apt 4B' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'United States' })
  @IsNotEmpty()
  @IsString()
  country: string;
}

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 49.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ example: 145.43 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ example: 14.54 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  tax: number;

  @ApiProperty({ example: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  shipping: number;

  @ApiProperty({ example: 159.97 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total: number;
}
