import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'team-uuid' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ example: 'Welcome to the team!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class BulkInviteMembersDto {
  @ApiProperty({ type: [InviteMemberDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  invitations: InviteMemberDto[];
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'invitation-token' })
  @IsString()
  token: string;
}
