import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, ActivityType } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Security & Compliance')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

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

  @Post('sessions/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions' })
  async revokeSessions(@Request() req: AuthRequest) {
    return this.securityService.revokeSessions(req.user.id);
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
