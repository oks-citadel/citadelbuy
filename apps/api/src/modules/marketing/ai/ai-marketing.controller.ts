import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AiMarketingService } from './ai-marketing.service';
import {
  ScoreLeadDto,
  UpdateScoringModelDto,
  PredictChurnDto,
  GetChurnRiskUsersDto,
  ForecastCampaignDto,
  AnalyzeCampaignPerformanceDto,
  GenerateContentDto,
  OptimizeContentDto,
} from './dto/ai-marketing.dto';

@ApiTags('Marketing - AI')
@Controller('marketing/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiMarketingController {
  constructor(private readonly aiService: AiMarketingService) {}

  // Lead Scoring Endpoints
  @Post('leads/score')
  @ApiOperation({ summary: 'Score a lead' })
  @ApiResponse({ status: 200, description: 'Lead scored' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async scoreLead(@Body() dto: ScoreLeadDto) {
    return this.aiService.scoreLeadml(dto.userId, dto.attributes);
  }

  @Get('leads/score/:userId')
  @ApiOperation({ summary: 'Get lead score' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Lead score retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getLeadScore(@Param('userId') userId: string) {
    return this.aiService.getLeadScore(userId);
  }

  @Put('leads/model')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update scoring model' })
  @ApiResponse({ status: 200, description: 'Model updated' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async updateScoringModel(@Body() dto: UpdateScoringModelDto) {
    await this.aiService.updateScoringModel(dto.organizationId || 'default', dto.weights, dto.thresholds);
    return { success: true };
  }

  // Churn Prediction Endpoints
  @Post('churn/predict')
  @ApiOperation({ summary: 'Predict churn for user' })
  @ApiResponse({ status: 200, description: 'Churn prediction' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async predictChurn(@Body() dto: PredictChurnDto) {
    return this.aiService.predictChurn(dto.userId);
  }

  @Get('churn/risk-users')
  @ApiOperation({ summary: 'Get users at churn risk' })
  @ApiResponse({ status: 200, description: 'Risk users retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getChurnRiskUsers(@Query() query: GetChurnRiskUsersDto) {
    return this.aiService.getChurnRiskUsers(
      query.organizationId || 'default',
      query.minRiskScore,
      query.page,
      query.limit,
    );
  }

  // Campaign Forecasting Endpoints
  @Post('campaigns/forecast')
  @ApiOperation({ summary: 'Forecast campaign performance' })
  @ApiResponse({ status: 200, description: 'Campaign forecast' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async forecastCampaign(@Body() dto: ForecastCampaignDto) {
    return this.aiService.forecastCampaign(dto.campaignParams, dto.metrics);
  }

  @Post('campaigns/analyze')
  @ApiOperation({ summary: 'Analyze campaign performance' })
  @ApiResponse({ status: 200, description: 'Campaign analysis' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async analyzeCampaignPerformance(@Body() dto: AnalyzeCampaignPerformanceDto) {
    return this.aiService.analyzeCampaignPerformance(dto.campaignId, dto.includeRecommendations);
  }

  // Content Generation Endpoints
  @Post('content/generate')
  @ApiOperation({ summary: 'Generate marketing content' })
  @ApiResponse({ status: 201, description: 'Content generated' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async generateContent(@Body() dto: GenerateContentDto) {
    return this.aiService.generateContent({
      type: dto.type,
      topic: dto.topic,
      targetAudience: dto.targetAudience,
      tone: dto.tone,
      keyPoints: dto.keyPoints,
      variations: dto.variations,
      maxLength: dto.maxLength,
    });
  }

  @Post('content/optimize')
  @ApiOperation({ summary: 'Optimize existing content' })
  @ApiResponse({ status: 200, description: 'Content optimized' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async optimizeContent(@Body() dto: OptimizeContentDto) {
    return this.aiService.optimizeContent(dto.content, dto.goal, dto.targetAudience);
  }
}
