import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/modules/auth/guards/admin.guard';
import { ResultsService } from '../services/results.service';
import {
  ResultsQueryDto,
  SignificanceQueryDto,
  SegmentResultsQueryDto,
  ExperimentResultsDto,
  StatisticalSignificanceDto,
  ConfidenceIntervalDto,
  SegmentedResultsDto,
} from '../dto/results.dto';

@ApiTags('Experiment Results')
@Controller('experiments')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get(':id/results')
  @ApiOperation({ summary: 'Get experiment results' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Experiment results with conversion rates per variant',
    type: ExperimentResultsDto,
  })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async getResults(
    @Param('id') experimentId: string,
    @Query() query: ResultsQueryDto,
  ): Promise<ExperimentResultsDto> {
    return this.resultsService.getResults(experimentId, query);
  }

  @Get(':id/results/significance')
  @ApiOperation({ summary: 'Get statistical significance analysis' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistical significance results with p-values and recommendations',
    type: StatisticalSignificanceDto,
  })
  @ApiResponse({ status: 404, description: 'Experiment or control variant not found' })
  async getSignificance(
    @Param('id') experimentId: string,
    @Query() query: SignificanceQueryDto,
  ): Promise<StatisticalSignificanceDto> {
    return this.resultsService.getSignificance(experimentId, query);
  }

  @Get(':id/results/confidence')
  @ApiOperation({ summary: 'Get confidence intervals for each variant' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Confidence intervals with upper and lower bounds',
    type: ConfidenceIntervalDto,
  })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async getConfidenceIntervals(
    @Param('id') experimentId: string,
    @Query() query: SignificanceQueryDto,
  ): Promise<ConfidenceIntervalDto> {
    return this.resultsService.getConfidenceIntervals(experimentId, query);
  }

  @Get(':id/results/segments')
  @ApiOperation({ summary: 'Get results segmented by user attribute' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({
    status: 200,
    description: 'Results broken down by segment (country, plan, device, etc.)',
    type: SegmentedResultsDto,
  })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async getSegmentedResults(
    @Param('id') experimentId: string,
    @Query() query: SegmentResultsQueryDto,
  ): Promise<SegmentedResultsDto> {
    return this.resultsService.getSegmentedResults(experimentId, query);
  }
}
