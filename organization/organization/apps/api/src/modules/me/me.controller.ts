import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MeService } from './me.service';

@ApiTags('User Profile (Me)')
@Controller('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeController {
  constructor(private meService: MeService) {}

  @Get('sessions')
  @ApiOperation({
    summary: 'Get all active sessions for current user',
    description: 'Retrieves a list of all active sessions (devices) for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user sessions',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows 10',
            device: 'Desktop',
          },
          isCurrent: true,
          lastActiveAt: '2024-01-15T10:30:00Z',
          createdAt: '2024-01-10T08:00:00Z',
        },
        {
          id: '456e7890-e89b-12d3-a456-426614174001',
          ipAddress: '10.0.0.5',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          deviceInfo: {
            browser: 'Safari',
            os: 'iOS 17',
            device: 'Mobile',
          },
          isCurrent: false,
          lastActiveAt: '2024-01-14T15:45:00Z',
          createdAt: '2024-01-12T12:30:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async getSessions(@Request() req: any) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    return this.meService.getUserSessions(req.user.id, currentToken);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Revokes/deletes a specific session by ID. The user cannot revoke their current session.',
  })
  @ApiParam({
    name: 'id',
    description: 'Session UUID to revoke',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      example: {
        message: 'Session revoked successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot revoke current session' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(@Param('id') sessionId: string, @Request() req: any) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    return this.meService.revokeSession(req.user.id, sessionId, currentToken);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all other sessions',
    description: 'Revokes all sessions except the current one. Useful for security purposes.',
  })
  @ApiResponse({
    status: 200,
    description: 'All other sessions revoked successfully',
    schema: {
      example: {
        message: 'All other sessions revoked',
        revokedCount: 3,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async revokeAllOtherSessions(@Request() req: any) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    return this.meService.revokeAllOtherSessions(req.user.id, currentToken);
  }
}
