import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: 'Email address to resend verification email to',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
