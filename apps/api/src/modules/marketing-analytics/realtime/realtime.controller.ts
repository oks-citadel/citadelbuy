import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import {
  RealtimeUsersQueryDto,
  RealtimeEventsQueryDto,
  RealtimeUsersDto,
  RealtimeEventsDto,
  RealtimeMetricsDto,
} from './dto/realtime.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Real-time')
@Controller('analytics/realtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Get('users')
  @ApiOperation({
    summary: 'Get active users right now',
    description: `
      Get the count and details of currently active users.

      A user is considered "active" if they've had activity within
      the specified time window (default 5 minutes).

      Returns:
      - Total active users (authenticated + anonymous)
      - Breakdown by page, device type, country, and source
      - Individual user details (limited to 100)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Active users retrieved successfully',
    type: RealtimeUsersDto,
  })
  async getActiveUsers(
    @Query() query: RealtimeUsersQueryDto,
  ): Promise<RealtimeUsersDto> {
    return this.realtimeService.getActiveUsers(query);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get recent events stream',
    description: `
      Get the most recent analytics events.

      Returns events in reverse chronological order (newest first).
      Includes events per second calculation and breakdown by type.

      For real-time streaming, use the WebSocket endpoint:
      ws://[host]/analytics/realtime/stream
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent events retrieved successfully',
    type: RealtimeEventsDto,
  })
  async getRecentEvents(
    @Query() query: RealtimeEventsQueryDto,
  ): Promise<RealtimeEventsDto> {
    return this.realtimeService.getRecentEvents(query);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get real-time metrics snapshot',
    description: `
      Get a snapshot of real-time metrics including:
      - Active users count
      - Page views per minute
      - Events per second
      - Conversions and revenue in the last hour
      - Top pages and events right now

      For live updates, subscribe to the 'metrics' channel
      via WebSocket at ws://[host]/analytics/realtime/stream
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics snapshot retrieved successfully',
    type: RealtimeMetricsDto,
  })
  async getMetricsSnapshot(): Promise<RealtimeMetricsDto> {
    return this.realtimeService.getMetricsSnapshot();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get real-time system status',
    description: 'Get the status of the real-time analytics system including connected WebSocket clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'System status retrieved successfully',
  })
  async getStatus(): Promise<{
    status: string;
    connectedClients: number;
    subscribersPerChannel: Record<string, number>;
    timestamp: string;
  }> {
    return {
      status: 'healthy',
      connectedClients: this.realtimeGateway.getConnectedClientsCount(),
      subscribersPerChannel: this.realtimeGateway.getSubscribersPerChannel(),
      timestamp: new Date().toISOString(),
    };
  }
}
