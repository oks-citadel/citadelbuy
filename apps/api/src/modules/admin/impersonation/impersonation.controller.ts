import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationAuditGuard } from './impersonation.guard';
import {
  StartImpersonationDto,
  StopImpersonationDto,
} from './dto/start-impersonation.dto';
import {
  ImpersonationHistoryQueryDto,
  ImpersonationHistoryResponseDto,
  ImpersonationSessionDto,
  ActiveImpersonationDto,
} from './dto/impersonation-history.dto';

@ApiTags('Admin - Impersonation')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  /**
   * Start impersonating a user
   * Requires ADMIN or SUPPORT role and MFA verification
   */
  @Post('impersonate/:userId')
  @Roles('ADMIN', 'SUPPORT')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Start impersonating a user',
    description: `
      Start an impersonation session to access the platform as the specified user.

      **Security Requirements:**
      - Requires ADMIN or SUPPORT role
      - Requires valid MFA verification code
      - Cannot impersonate ADMIN users
      - Sessions are limited to 1 hour maximum

      **Audit Trail:**
      - All actions during impersonation are logged
      - Target user receives email notification
      - Session details are permanently stored for compliance

      **Modes:**
      - VIEW_ONLY: Can only read data, cannot perform any mutating operations
      - FULL_ACCESS: Can perform actions on behalf of the user (use with caution)
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to impersonate',
    example: 'usr_12345',
  })
  @ApiResponse({
    status: 201,
    description: 'Impersonation session started successfully',
    schema: {
      example: {
        impersonationToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        session: {
          sessionId: 'sess_abc123',
          targetUserId: 'usr_67890',
          targetUserName: 'John Doe',
          mode: 'VIEW_ONLY',
          startedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2024-01-15T11:30:00Z',
          timeRemainingSeconds: 3600,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Already have an active session or invalid request' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or cannot impersonate admin users' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @ApiResponse({ status: 429, description: 'Too many impersonation attempts' })
  async startImpersonation(
    @Param('userId') targetUserId: string,
    @Body() dto: StartImpersonationDto,
    @Request() req: any,
  ): Promise<{
    impersonationToken: string;
    session: ActiveImpersonationDto;
  }> {
    return this.impersonationService.startImpersonation(
      req.user.id,
      targetUserId,
      dto,
      {
        ip: req.ip,
        headers: req.headers,
      },
    );
  }

  /**
   * Stop the current impersonation session
   */
  @Post('stop-impersonation')
  @Roles('ADMIN', 'SUPPORT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop the current impersonation session',
    description: `
      End the active impersonation session and return to your normal account.

      **Notes:**
      - Optionally provide notes about what was done during the session
      - All session details and actions are preserved for audit
      - The impersonation token becomes invalid after this call
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Impersonation session ended successfully',
    schema: {
      example: {
        message: 'Impersonation session ended successfully',
        sessionSummary: {
          id: 'sess_abc123',
          impersonatorId: 'usr_admin123',
          impersonatorName: 'Admin User',
          impersonatorEmail: 'admin@broxiva.com',
          targetUserId: 'usr_67890',
          targetUserName: 'John Doe',
          targetUserEmail: 'john@example.com',
          reason: 'Customer reported checkout issue - investigating',
          ticketReference: 'TICKET-12345',
          mode: 'VIEW_ONLY',
          startedAt: '2024-01-15T10:30:00Z',
          endedAt: '2024-01-15T10:45:00Z',
          expiresAt: '2024-01-15T11:30:00Z',
          isActive: false,
          notes: 'Identified and resolved the issue',
          resolution: 'resolved',
          actionCount: 15,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No active impersonation session' })
  async stopImpersonation(
    @Body() dto: StopImpersonationDto,
    @Request() req: any,
  ): Promise<{ message: string; sessionSummary: ImpersonationSessionDto }> {
    return this.impersonationService.stopImpersonation(req.user.id, dto);
  }

  /**
   * Get the current active impersonation session (if any)
   */
  @Get('impersonation-status')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({
    summary: 'Get current impersonation session status',
    description: 'Check if you have an active impersonation session and get its details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current impersonation status',
    schema: {
      example: {
        active: true,
        session: {
          sessionId: 'sess_abc123',
          targetUserId: 'usr_67890',
          targetUserName: 'John Doe',
          mode: 'VIEW_ONLY',
          startedAt: '2024-01-15T10:30:00Z',
          expiresAt: '2024-01-15T11:30:00Z',
          timeRemainingSeconds: 2700,
        },
      },
    },
  })
  getImpersonationStatus(
    @Request() req: any,
  ): { active: boolean; session: ActiveImpersonationDto | null } {
    const session = this.impersonationService.getActiveSession(req.user.id);
    return {
      active: !!session,
      session,
    };
  }

  /**
   * View impersonation audit log / history
   */
  @Get('impersonation-history')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'View impersonation audit history',
    description: `
      Retrieve the audit log of all impersonation sessions.

      **Access:** ADMIN role only

      **Filters:**
      - By impersonator ID
      - By target user ID
      - By date range
      - By impersonation mode
      - Active sessions only

      **Includes:**
      - Full session details
      - All actions performed during each session
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Impersonation history retrieved successfully',
    type: ImpersonationHistoryResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getImpersonationHistory(
    @Query() query: ImpersonationHistoryQueryDto,
  ): Promise<ImpersonationHistoryResponseDto> {
    return this.impersonationService.getImpersonationHistory(query);
  }

  /**
   * Get details of a specific impersonation session
   */
  @Get('impersonation-history/:sessionId')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get details of a specific impersonation session',
    description: 'Retrieve full details and action log for a specific impersonation session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The session ID to retrieve',
    example: 'sess_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved successfully',
    type: ImpersonationSessionDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getImpersonationSession(
    @Param('sessionId') sessionId: string,
  ): Promise<ImpersonationSessionDto | null> {
    const result = await this.impersonationService.getImpersonationHistory({
      page: 1,
      limit: 1,
    });

    // Find the specific session
    const sessions = result.sessions.filter((s) => s.id === sessionId);
    return sessions[0] || null;
  }

  /**
   * Get list of currently active impersonation sessions (admin monitoring)
   */
  @Get('active-impersonations')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List all active impersonation sessions',
    description: `
      Get a list of all currently active impersonation sessions across the platform.
      Useful for monitoring and security oversight.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    schema: {
      example: {
        activeSessions: [
          {
            sessionId: 'sess_abc123',
            impersonatorId: 'usr_admin123',
            impersonatorEmail: 'admin@broxiva.com',
            targetUserId: 'usr_67890',
            targetUserEmail: 'john@example.com',
            mode: 'VIEW_ONLY',
            startedAt: '2024-01-15T10:30:00Z',
            expiresAt: '2024-01-15T11:30:00Z',
            timeRemainingSeconds: 2700,
          },
        ],
        count: 1,
      },
    },
  })
  async getActiveImpersonations(): Promise<{
    activeSessions: any[];
    count: number;
  }> {
    const result = await this.impersonationService.getImpersonationHistory({
      activeOnly: true,
      limit: 100,
    });

    return {
      activeSessions: result.sessions.map((s) => ({
        sessionId: s.id,
        impersonatorId: s.impersonatorId,
        impersonatorEmail: s.impersonatorEmail,
        targetUserId: s.targetUserId,
        targetUserEmail: s.targetUserEmail,
        mode: s.mode,
        startedAt: s.startedAt,
        expiresAt: s.expiresAt,
        timeRemainingSeconds: Math.max(
          0,
          Math.floor((new Date(s.expiresAt).getTime() - Date.now()) / 1000),
        ),
      })),
      count: result.sessions.length,
    };
  }
}
