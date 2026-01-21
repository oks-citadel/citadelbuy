import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/modules/auth/guards/admin.guard';
import { TrackingService } from '../services/tracking.service';
import {
  TrackEventDto,
  BulkTrackEventDto,
  EventQueryDto,
  EventResponseDto,
  EventSummaryDto,
  TrackEventResponseDto,
} from '../dto/tracking.dto';

@ApiTags('Experiment Tracking')
@Controller('experiments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post(':id/track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track conversion event for an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Event tracked successfully',
    type: TrackEventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Experiment is not running' })
  @ApiResponse({ status: 404, description: 'User not assigned to experiment' })
  async trackEvent(
    @Param('id') experimentId: string,
    @Body() dto: TrackEventDto,
  ): Promise<TrackEventResponseDto> {
    return this.trackingService.trackEvent(experimentId, dto);
  }

  @Post(':id/track/bulk')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track multiple events in batch' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk tracking results',
  })
  async trackBulkEvents(
    @Param('id') experimentId: string,
    @Body() dto: BulkTrackEventDto,
  ) {
    return this.trackingService.trackBulkEvents(experimentId, dto);
  }

  @Get(':id/events')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get tracked events for an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'List of tracked events',
  })
  async getEvents(
    @Param('id') experimentId: string,
    @Query() query: EventQueryDto,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    return this.trackingService.getEvents(experimentId, query);
  }

  @Get(':id/events/summary')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get event summary for an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Event summary with counts by variant and event type',
    type: EventSummaryDto,
  })
  async getEventSummary(
    @Param('id') experimentId: string,
  ): Promise<EventSummaryDto> {
    return this.trackingService.getEventSummary(experimentId);
  }

  @Get(':id/events/realtime')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get real-time event counts from Redis' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Real-time event counts',
  })
  async getRealtimeCounts(@Param('id') experimentId: string) {
    return this.trackingService.getRealtimeCounts(experimentId);
  }
}
