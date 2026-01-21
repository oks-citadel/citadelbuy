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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MarketingPersonalizationService } from './personalization.service';
import {
  UpdateUserProfileDto,
  TrackUserBehaviorDto,
  GetNextBestActionDto,
  CreatePersonalizationRuleDto,
  EvaluateRulesDto,
} from './dto/personalization.dto';

@ApiTags('Marketing - Personalization')
@Controller('marketing/personalization')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingPersonalizationController {
  constructor(private readonly personalizationService: MarketingPersonalizationService) {}

  // User Profile Endpoints
  @Get('profiles/:userId')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getUserProfile(@Param('userId') userId: string) {
    return this.personalizationService.getUserProfile(userId);
  }

  @Put('profiles')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async updateUserProfile(@Body() dto: UpdateUserProfileDto) {
    return this.personalizationService.updateUserProfile(dto.userId, dto.data);
  }

  @Post('behavior')
  @ApiOperation({ summary: 'Track user behavior' })
  @ApiResponse({ status: 201, description: 'Behavior tracked' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackBehavior(@Body() dto: TrackUserBehaviorDto) {
    await this.personalizationService.trackBehavior(dto.userId, dto.behaviorType, dto.data);
    return { success: true };
  }

  // Next Best Action Endpoints
  @Post('next-best-action')
  @ApiOperation({ summary: 'Get next best actions for user' })
  @ApiResponse({ status: 200, description: 'Actions retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getNextBestActions(@Body() dto: GetNextBestActionDto) {
    return this.personalizationService.getNextBestActions(
      dto.userId,
      dto.context,
      dto.availableActions,
      dto.limit,
    );
  }

  // Rule Endpoints
  @Post('rules')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create personalization rule' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createRule(@Body() dto: CreatePersonalizationRuleDto) {
    return this.personalizationService.createRule({
      name: dto.name,
      organizationId: dto.organizationId,
      conditions: dto.conditions,
      conditionLogic: dto.conditionLogic,
      action: dto.action,
      priority: dto.priority,
      isActive: dto.isActive,
    });
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get personalization rules' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Rules retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getRules(@Query('organizationId') organizationId: string) {
    return this.personalizationService.getRules(organizationId);
  }

  @Put('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update personalization rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateRule(@Param('id') id: string, @Body() dto: Partial<CreatePersonalizationRuleDto>) {
    return this.personalizationService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Delete personalization rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 204, description: 'Rule deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRule(@Param('id') id: string) {
    await this.personalizationService.deleteRule(id);
  }

  @Post('rules/evaluate')
  @ApiOperation({ summary: 'Evaluate rules for user' })
  @ApiResponse({ status: 200, description: 'Rules evaluated' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async evaluateRules(@Body() dto: EvaluateRulesDto) {
    return this.personalizationService.evaluateRules(dto.userId, dto.context, dto.ruleIds);
  }
}
