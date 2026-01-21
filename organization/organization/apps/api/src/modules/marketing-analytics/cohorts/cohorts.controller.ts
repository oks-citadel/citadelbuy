import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CohortsService } from './cohorts.service';
import {
  CreateCohortDto,
  CohortQueryDto,
  RetentionQueryDto,
  LtvQueryDto,
  ChurnQueryDto,
  CohortResponseDto,
  RetentionAnalysisDto,
  LtvAnalysisDto,
  ChurnAnalysisDto,
} from './dto/cohort.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Cohorts')
@Controller('analytics/cohorts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CohortsController {
  constructor(private readonly cohortsService: CohortsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all cohorts',
    description: 'Retrieve all cohort definitions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cohorts retrieved successfully',
    type: [CohortResponseDto],
  })
  async listCohorts(
    @Query('organizationId') organizationId?: string,
  ): Promise<CohortResponseDto[]> {
    return this.cohortsService.listCohorts(organizationId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new cohort',
    description: `
      Create a new cohort definition for analysis.

      Cohorts can be based on:
      - Time (signup date, first purchase date)
      - Acquisition (source, campaign)
      - Behavior (plan type, user segment)
      - Custom filters
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Cohort created successfully',
    type: CohortResponseDto,
  })
  async createCohort(@Body() dto: CreateCohortDto): Promise<CohortResponseDto> {
    return this.cohortsService.createCohort(dto);
  }

  @Get('retention')
  @ApiOperation({
    summary: 'Get retention curves',
    description: `
      Analyze user retention across cohorts.

      Returns a retention matrix showing:
      - Cohort size per period
      - Retention percentage for each subsequent period
      - Average retention across all cohorts

      The retention metric can be:
      - any_event: Any activity counts as retention
      - specific_event: A specific event type
      - purchase: Made a purchase
      - login: Logged in
      - feature_use: Used a specific feature
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Retention analysis retrieved successfully',
    type: RetentionAnalysisDto,
  })
  async getRetentionCurves(
    @Query() query: RetentionQueryDto,
  ): Promise<RetentionAnalysisDto> {
    return this.cohortsService.getRetentionCurves(query);
  }

  @Get('ltv')
  @ApiOperation({
    summary: 'Get customer lifetime value analysis',
    description: `
      Analyze customer lifetime value across cohorts.

      Returns:
      - Average LTV per cohort
      - Cumulative LTV over time
      - Projected LTV based on trends
      - Optional breakdowns by acquisition source and plan type
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'LTV analysis retrieved successfully',
    type: LtvAnalysisDto,
  })
  async getLtvAnalysis(@Query() query: LtvQueryDto): Promise<LtvAnalysisDto> {
    return this.cohortsService.getLtvAnalysis(query);
  }

  @Get('churn')
  @ApiOperation({
    summary: 'Get churn analysis',
    description: `
      Analyze customer churn across cohorts.

      A user is considered churned if they have not been active
      for the specified number of inactive days (default 30).

      Returns:
      - Overall churn rate
      - Monthly churn trend
      - Churn rate per cohort
      - Optional breakdown of voluntary vs involuntary churn
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Churn analysis retrieved successfully',
    type: ChurnAnalysisDto,
  })
  async getChurnAnalysis(@Query() query: ChurnQueryDto): Promise<ChurnAnalysisDto> {
    return this.cohortsService.getChurnAnalysis(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get cohort by ID',
    description: 'Retrieve a specific cohort definition.',
  })
  @ApiParam({ name: 'id', description: 'Cohort ID' })
  @ApiResponse({
    status: 200,
    description: 'Cohort retrieved successfully',
    type: CohortResponseDto,
  })
  async getCohort(@Param('id') id: string): Promise<CohortResponseDto> {
    return this.cohortsService.getCohort(id);
  }

  @Get(':id/analysis')
  @ApiOperation({
    summary: 'Get cohort-specific analysis',
    description: 'Analyze a specific cohort with custom parameters.',
  })
  @ApiParam({ name: 'id', description: 'Cohort ID' })
  @ApiResponse({
    status: 200,
    description: 'Cohort analysis retrieved successfully',
  })
  async analyzeCohort(
    @Param('id') id: string,
    @Query() query: CohortQueryDto,
  ): Promise<any> {
    return this.cohortsService.analyzeCohort(id, query);
  }
}
