import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExperimentsService } from './experiments.service';
import {
  CreateExperimentDto,
  UpdateExperimentDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  GetAssignmentDto,
  TrackConversionDto,
  AnalysisQueryDto,
  ExperimentQueryDto,
} from './dto/experiments.dto';

@ApiTags('Marketing - Experiments')
@Controller('marketing/experiments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  // A/B Test Endpoints
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createExperiment(@Body() dto: CreateExperimentDto) {
    return this.experimentsService.createExperiment({
      name: dto.name,
      description: dto.description,
      organizationId: dto.organizationId,
      type: dto.type,
      variants: dto.variants,
      primaryMetric: dto.primaryMetric,
      secondaryMetrics: dto.secondaryMetrics,
      targetSampleSize: dto.targetSampleSize,
      minDetectableEffect: dto.minDetectableEffect,
      targeting: dto.targeting,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List experiments' })
  @ApiResponse({ status: 200, description: 'Experiments retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async listExperiments(@Query() query: ExperimentQueryDto) {
    return this.experimentsService.listExperiments({
      organizationId: query.organizationId,
      status: query.status,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getExperiment(@Param('id') id: string) {
    return this.experimentsService.getExperiment(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment updated' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateExperiment(@Param('id') id: string, @Body() dto: UpdateExperimentDto) {
    return this.experimentsService.updateExperiment(id, dto);
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Start experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment started' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async startExperiment(@Param('id') id: string) {
    return this.experimentsService.startExperiment(id);
  }

  @Post(':id/stop')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Stop experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiResponse({ status: 200, description: 'Experiment stopped' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async stopExperiment(@Param('id') id: string) {
    return this.experimentsService.stopExperiment(id);
  }

  // Feature Flag Endpoints
  @Post('flags')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create feature flag' })
  @ApiResponse({ status: 201, description: 'Flag created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createFeatureFlag(@Body() dto: CreateFeatureFlagDto) {
    return this.experimentsService.createFeatureFlag({
      key: dto.key,
      description: dto.description,
      organizationId: dto.organizationId,
      defaultValue: dto.defaultValue,
      rolloutPercentage: dto.rolloutPercentage,
      targetingRules: dto.targetingRules,
    });
  }

  @Get('flags')
  @ApiOperation({ summary: 'List feature flags' })
  @ApiResponse({ status: 200, description: 'Flags retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async listFeatureFlags(@Query('organizationId') organizationId: string) {
    return this.experimentsService.listFeatureFlags(organizationId);
  }

  @Get('flags/:key')
  @ApiOperation({ summary: 'Get feature flag' })
  @ApiParam({ name: 'key', description: 'Flag key' })
  @ApiResponse({ status: 200, description: 'Flag retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getFeatureFlag(@Param('key') key: string) {
    return this.experimentsService.getFeatureFlag(key);
  }

  @Put('flags/:key')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update feature flag' })
  @ApiParam({ name: 'key', description: 'Flag key' })
  @ApiResponse({ status: 200, description: 'Flag updated' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateFeatureFlag(@Param('key') key: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.experimentsService.updateFeatureFlag(key, dto);
  }

  @Delete('flags/:key')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Delete feature flag' })
  @ApiParam({ name: 'key', description: 'Flag key' })
  @ApiResponse({ status: 204, description: 'Flag deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteFeatureFlag(@Param('key') key: string) {
    await this.experimentsService.deleteFeatureFlag(key);
  }

  // Assignment Endpoints
  @Post('assign')
  @ApiOperation({ summary: 'Get experiment/flag assignment for user' })
  @ApiResponse({ status: 200, description: 'Assignment returned' })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async getAssignment(@Body() dto: GetAssignmentDto) {
    return this.experimentsService.getAssignment(dto.userId, dto.key, dto.attributes);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Track conversion event' })
  @ApiResponse({ status: 201, description: 'Conversion tracked' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackConversion(@Body() dto: TrackConversionDto) {
    await this.experimentsService.trackConversion({
      experimentId: dto.experimentId,
      userId: dto.userId,
      metric: dto.metric,
      value: dto.value,
      variantId: dto.variantId,
    });
    return { success: true };
  }

  // Analysis Endpoints
  @Post('analyze')
  @ApiOperation({ summary: 'Get statistical analysis of experiment' })
  @ApiResponse({ status: 200, description: 'Analysis returned' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async analyzeExperiment(@Body() dto: AnalysisQueryDto) {
    return this.experimentsService.analyzeExperiment(dto.experimentId, dto.confidenceLevel);
  }
}
