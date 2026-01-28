import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  SessionQueryDto,
  SessionDetailDto,
  SessionMetricsDto,
  SessionsListResponseDto,
  SessionEventsResponseDto,
} from './dto/session.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Sessions')
@Controller('analytics/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get session metrics',
    description: `
      Get aggregated session metrics for a date range.

      Metrics include:
      - Total sessions and unique users
      - New vs returning sessions
      - Page views and pages per session
      - Average session duration
      - Bounce rate
      - Conversion rate
      - Breakdown by device type, source, and country
      - Daily trend and hourly distribution
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Session metrics retrieved successfully',
    type: SessionMetricsDto,
  })
  async getSessionMetrics(@Query() query: SessionQueryDto): Promise<SessionMetricsDto> {
    return this.sessionsService.getSessionMetrics(query);
  }

  @Get('list')
  @ApiOperation({
    summary: 'List sessions',
    description: `
      Get a paginated list of individual sessions.

      Filter by:
      - User ID
      - Device type
      - Traffic source
      - Converted sessions only

      Results include session details like duration, page views,
      conversion status, device info, and landing/exit pages.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: SessionsListResponseDto,
  })
  async listSessions(@Query() query: SessionQueryDto): Promise<SessionsListResponseDto> {
    return this.sessionsService.listSessions(query);
  }

  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get session by ID',
    description: 'Get detailed information about a specific session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
    type: SessionDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSession(@Param('sessionId') sessionId: string): Promise<SessionDetailDto> {
    return this.sessionsService.getSession(sessionId);
  }

  @Get(':sessionId/events')
  @ApiOperation({
    summary: 'Get events in session',
    description: `
      Get all events that occurred within a specific session,
      ordered chronologically.

      Use this to replay user behavior or debug issues.
    `,
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session events retrieved successfully',
    type: SessionEventsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSessionEvents(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionEventsResponseDto> {
    return this.sessionsService.getSessionEvents(sessionId);
  }
}
