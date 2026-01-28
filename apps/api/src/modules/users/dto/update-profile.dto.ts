import { IsString, IsOptional, IsEmail, IsObject, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1 (555) 123-4567',
    required: false,
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://cdn.broxiva.com/avatars/user-123.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'User preferences',
    example: {
      newsletter: true,
      notifications: true,
      language: 'en',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  preferences?: {
    newsletter?: boolean;
    notifications?: boolean;
    language?: string;
  };
}
