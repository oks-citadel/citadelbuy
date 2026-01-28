import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BehaviorService } from './behavior.service';
import {
  BehaviorQueryDto,
  HeatmapDataDto,
  ClickmapDataDto,
  ScrollmapDataDto,
  RecordingsQueryDto,
  RecordingsListDto,
  BehaviorSummaryDto,
} from './dto/behavior.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Behavior')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  @Get('heatmaps')
  @ApiOperation({
    summary: 'Get heatmap data',
    description: `
      Get click heatmap data for a specific page.

      Heatmap data shows where users are clicking on the page,
      aggregated into a grid for visualization.

      Use this to identify:
      - Hot zones where users click frequently
      - Dead zones that receive no interaction
      - Unexpected click patterns
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Heatmap data retrieved successfully',
    type: HeatmapDataDto,
  })
  async getHeatmapData(@Query() query: BehaviorQueryDto): Promise<HeatmapDataDto> {
    return this.behaviorService.getHeatmapData(query);
  }

  @Get('clickmaps')
  @ApiOperation({
    summary: 'Get clickmap data',
    description: `
      Get clickmap data showing which elements users click on a page.

      Unlike heatmaps which show position, clickmaps identify
      specific elements (buttons, links, etc.) and their click rates.

      Includes:
      - Top clicked elements
      - Click-through rates
      - Click density by page zone
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Clickmap data retrieved successfully',
    type: ClickmapDataDto,
  })
  async getClickmapData(@Query() query: BehaviorQueryDto): Promise<ClickmapDataDto> {
    return this.behaviorService.getClickmapData(query);
  }

  @Get('scrollmaps')
  @ApiOperation({
    summary: 'Get scroll depth analysis',
    description: `
      Get scroll depth analysis for a page.

      Shows how far users scroll down the page, including:
      - Average scroll depth
      - Percentage of users reaching each depth zone
      - Time spent above/below the fold
      - Comparison with page view duration
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Scrollmap data retrieved successfully',
    type: ScrollmapDataDto,
  })
  async getScrollmapData(@Query() query: BehaviorQueryDto): Promise<ScrollmapDataDto> {
    return this.behaviorService.getScrollmapData(query);
  }

  @Get('recordings')
  @ApiOperation({
    summary: 'Get session replay metadata',
    description: `
      Get metadata for recorded user sessions.

      Session recordings capture user behavior for replay and analysis.
      This endpoint returns metadata about available recordings.

      Filter by:
      - Date range
      - Duration
      - User ID
      - Converted sessions only
      - Sessions with errors

      Note: Actual replay data would be served from a separate
      storage system (S3/CloudFront) in production.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Recording metadata retrieved successfully',
    type: RecordingsListDto,
  })
  async getRecordings(@Query() query: RecordingsQueryDto): Promise<RecordingsListDto> {
    return this.behaviorService.getRecordings(query);
  }

  @Get('behavior/summary')
  @ApiOperation({
    summary: 'Get behavior analytics summary',
    description: `
      Get a high-level summary of user behavior across the site.

      Includes:
      - Top visited pages
      - Top entry pages (landing pages)
      - Top exit pages
      - Average scroll depth
      - Average time on page
      - Total recorded sessions
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Behavior summary retrieved successfully',
    type: BehaviorSummaryDto,
  })
  async getBehaviorSummary(@Query() query: BehaviorQueryDto): Promise<BehaviorSummaryDto> {
    return this.behaviorService.getBehaviorSummary(query);
  }
}
