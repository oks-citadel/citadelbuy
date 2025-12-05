import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  GITHUB = 'github',
}

export class SocialLoginDto {
  @ApiProperty({
    description: 'Social provider name',
    enum: SocialProvider,
    example: SocialProvider.GOOGLE,
  })
  @IsEnum(SocialProvider)
  @IsNotEmpty()
  provider: SocialProvider;

  @ApiProperty({
    description: 'OAuth access token from the social provider',
    example: 'ya29.a0AfH6SMBx...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
