import { Controller, Get, Post, Delete, Put, Body, Param, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SecurityService, SessionLimitConfig } from './security.service';
import { SessionManagerService } from './session-manager.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, ActivityType, DevicePlatform } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Security & Compliance')
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly sessionManagerService: SessionManagerService,
  ) {}

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit logs (Admin)' })
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('activityType') activityType?: ActivityType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.securityService.getAuditLogs({
      userId,
      activityType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create API key' })
  async createApiKey(
    @Request() req: AuthRequest,
    @Body() dto: { name: string; scopes: string[]; expiresInDays?: number },
  ) {
    return this.securityService.createApiKey(req.user.id, dto.name, dto.scopes, dto.expiresInDays);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke API key' })
  async revokeApiKey(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.securityService.revokeApiKey(id, req.user.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA' })
  async setup2FA(@Request() req: AuthRequest) {
    return this.securityService.setup2FA(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA' })
  async enable2FA(@Request() req: AuthRequest, @Body() dto: { token: string }) {
    return this.securityService.enable2FA(req.user.id, dto.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@Request() req: AuthRequest, @Body() dto: { token: string }) {
    return this.securityService.disable2FA(req.user.id, dto.token);
  }

  // ==================== Session Management ====================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          deviceType: { type: 'string', enum: ['WEB', 'IOS', 'ANDROID'] },
          deviceName: { type: 'string' },
          location: { type: 'object' },
          lastActivityAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          isCurrent: { type: 'boolean' },
        },
      },
    },
  })
  async getActiveSessions(
    @Request() req: AuthRequest,
    @Headers('x-session-id') currentSessionId?: string,
  ) {
    return this.securityService.getUserActiveSessions(req.user.id, currentSessionId);
  }

  @Get('sessions/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active session count for current user' })
  @ApiResponse({
    status: 200,
    description: 'Session count information',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        maxAllowed: { type: 'number' },
        remaining: { type: 'number' },
      },
    },
  })
  async getSessionCount(@Request() req: AuthRequest) {
    const count = await this.securityService.getActiveSessionCount(req.user.id);
    const config = await this.securityService.getSessionLimitConfig();
    return {
      total: count,
      maxAllowed: config.maxConcurrentSessions,
      remaining: Math.max(0, config.maxConcurrentSessions - count),
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session (remote logout)' })
  @ApiParam({ name: 'sessionId', description: 'The session ID to revoke' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 400, description: 'Session not found or already revoked' })
  async revokeSessionById(
    @Request() req: AuthRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.securityService.revokeSessionById(req.user.id, sessionId, 'user_remote_logout');
  }

  @Post('sessions/revoke-others')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except the current one (POST)' })
  @ApiResponse({
    status: 200,
    description: 'Other sessions revoked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        count: { type: 'number' },
      },
    },
  })
  async revokeOtherSessions(
    @Request() req: AuthRequest,
    @Headers('x-session-id') currentSessionId?: string,
  ) {
    return this.securityService.revokeSessions(req.user.id, currentSessionId, 'user_logout_others');
  }

  @Delete('sessions/others')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate all sessions except the current one (DELETE)' })
  @ApiResponse({
    status: 200,
    description: 'Other sessions terminated',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async terminateOtherSessions(
    @Request() req: AuthRequest,
    @Headers('x-session-id') currentSessionId?: string,
  ) {
    return this.sessionManagerService.terminateAllSessions(
      req.user.id,
      currentSessionId,
      'user_terminate_others',
    );
  }

  @Post('sessions/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions (including current)' })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        count: { type: 'number' },
      },
    },
  })
  async revokeSessions(@Request() req: AuthRequest) {
    return this.securityService.revokeSessions(req.user.id);
  }

  @Get('sessions/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get session limit settings (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Current session limit configuration',
  })
  async getSessionSettings() {
    return this.securityService.getSessionLimitConfig();
  }

  @Put('sessions/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update session limit settings (Admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        maxConcurrentSessions: { type: 'number', minimum: 1, maximum: 100 },
        maxMobileSessions: { type: 'number', minimum: 1, maximum: 50 },
        maxWebSessions: { type: 'number', minimum: 1, maximum: 50 },
        enforcementMode: { type: 'string', enum: ['block', 'evict_oldest', 'evict_idle'] },
        idleTimeoutMinutes: { type: 'number', minimum: 5, maximum: 1440 },
        notifyOnNewSession: { type: 'boolean' },
        notifyOnEviction: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSessionSettings(@Body() settings: Partial<SessionLimitConfig>) {
    return this.securityService.updateSessionSettings(settings);
  }

  @Get('sessions/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get session statistics for current user' })
  @ApiResponse({
    status: 200,
    description: 'Session statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total active sessions' },
        mobile: { type: 'number', description: 'Active mobile sessions (iOS + Android)' },
        web: { type: 'number', description: 'Active web sessions' },
        limits: {
          type: 'object',
          properties: {
            maxConcurrentSessions: { type: 'number' },
            maxMobileSessions: { type: 'number' },
            maxWebSessions: { type: 'number' },
            enforcementMode: { type: 'string', enum: ['block', 'evict_oldest', 'evict_idle'] },
          },
        },
      },
    },
  })
  async getSessionStats(@Request() req: AuthRequest) {
    return this.sessionManagerService.getSessionStats(req.user.id);
  }

  @Post('data-export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request data export (GDPR)' })
  async requestDataExport(@Request() req: AuthRequest, @Body() dto: { format?: 'JSON' | 'CSV' }) {
    return this.securityService.requestDataExport(req.user.id, dto.format);
  }

  @Get('security-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get security events (Admin)' })
  async getSecurityEvents(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.securityService.getSecurityEvents({
      type,
      severity,
      resolved,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
