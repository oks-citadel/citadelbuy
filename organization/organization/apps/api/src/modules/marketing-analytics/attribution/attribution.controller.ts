import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AttributionService } from './attribution.service';
import {
  AttributionQueryDto,
  JourneyQueryDto,
  TouchpointQueryDto,
  AttributionModelDto,
  AttributionReportDto,
  JourneyMappingDto,
  TouchpointAnalysisDto,
} from './dto/attribution.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Attribution')
@Controller('analytics/attribution')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttributionController {
  constructor(private readonly attributionService: AttributionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get multi-touch attribution report',
    description: `
      Generate an attribution report analyzing how different marketing channels
      contribute to conversions.

      Attribution models available:
      - **first_touch**: 100% credit to first touchpoint
      - **last_touch**: 100% credit to last touchpoint before conversion
      - **linear**: Equal credit to all touchpoints
      - **time_decay**: More credit to touchpoints closer to conversion
      - **position_based**: 40% first, 40% last, 20% middle

      The conversion window determines how far back to look for touchpoints
      that may have contributed to a conversion.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Attribution report generated successfully',
    type: AttributionReportDto,
  })
  async getAttributionReport(
    @Query() query: AttributionQueryDto,
  ): Promise<AttributionReportDto> {
    return this.attributionService.getAttributionReport(query);
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get available attribution models',
    description: `
      Returns a list of all supported attribution models with their
      descriptions, credit distribution logic, and recommended use cases.

      Use this endpoint to understand which model is best for your analysis needs.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Attribution models retrieved successfully',
    type: [AttributionModelDto],
  })
  getAttributionModels(): AttributionModelDto[] {
    return this.attributionService.getAttributionModels();
  }

  @Get('journey')
  @ApiOperation({
    summary: 'Get customer journey mapping',
    description: `
      Analyze customer journeys from first touchpoint to conversion (or abandonment).

      Returns:
      - Individual journey paths with all touchpoints
      - Most common paths to conversion
      - Average journey metrics (touchpoints, duration)
      - Conversion rates by path

      Filter by specific user or session ID, or analyze all journeys
      within a date range.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Journey mapping retrieved successfully',
    type: JourneyMappingDto,
  })
  async getJourneyMapping(
    @Query() query: JourneyQueryDto,
  ): Promise<JourneyMappingDto> {
    return this.attributionService.getJourneyMapping(query);
  }

  @Get('touchpoints')
  @ApiOperation({
    summary: 'Get touchpoint analysis',
    description: `
      Analyze marketing touchpoints and their effectiveness.

      Group touchpoints by:
      - **channel**: Marketing channel (organic, paid, social, email, etc.)
      - **source**: Traffic source (google, facebook, newsletter, etc.)
      - **medium**: Marketing medium (cpc, email, referral, etc.)
      - **campaign**: Specific campaign names

      Returns:
      - Touchpoint counts and unique users per group
      - Conversion rates
      - Position analysis (first touch, middle, last touch)
      - Path transition patterns
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Touchpoint analysis retrieved successfully',
    type: TouchpointAnalysisDto,
  })
  async getTouchpointAnalysis(
    @Query() query: TouchpointQueryDto,
  ): Promise<TouchpointAnalysisDto> {
    return this.attributionService.getTouchpointAnalysis(query);
  }
}
