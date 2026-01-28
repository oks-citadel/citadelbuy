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
import { LifecycleService } from './lifecycle.service';
import {
  CreateEmailListDto,
  AddSubscriberDto,
  CreateSegmentDto,
  CreateTriggerDto,
  CreateFlowDto,
  TrackEventDto,
  UpdateLifecycleStageDto,
  LifecycleQueryDto,
} from './dto/lifecycle.dto';

@ApiTags('Marketing - Lifecycle')
@Controller('marketing/lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  // Email List Endpoints
  @Post('lists')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create email list' })
  @ApiResponse({ status: 201, description: 'List created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createList(@Body() dto: CreateEmailListDto) {
    return this.lifecycleService.createList({
      name: dto.name,
      description: dto.description,
      organizationId: dto.organizationId,
      type: dto.type,
      doubleOptIn: dto.doubleOptIn,
    });
  }

  @Get('lists')
  @ApiOperation({ summary: 'Get email lists' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Lists retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getLists(@Query('organizationId') organizationId: string) {
    return this.lifecycleService.getLists(organizationId);
  }

  @Post('lists/:id/subscribers')
  @ApiOperation({ summary: 'Add subscriber to list' })
  @ApiParam({ name: 'id', description: 'List ID' })
  @ApiResponse({ status: 201, description: 'Subscriber added' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async addSubscriber(@Param('id') id: string, @Body() dto: AddSubscriberDto) {
    return this.lifecycleService.addSubscriber(id, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields: dto.customFields,
      tags: dto.tags,
    });
  }

  @Delete('lists/:id/subscribers/:email')
  @ApiOperation({ summary: 'Remove subscriber from list' })
  @ApiParam({ name: 'id', description: 'List ID' })
  @ApiParam({ name: 'email', description: 'Subscriber email' })
  @ApiResponse({ status: 204, description: 'Subscriber removed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async removeSubscriber(@Param('id') id: string, @Param('email') email: string) {
    await this.lifecycleService.removeSubscriber(id, email);
  }

  @Get('lists/:id/subscribers')
  @ApiOperation({ summary: 'Get list subscribers' })
  @ApiParam({ name: 'id', description: 'List ID' })
  @ApiResponse({ status: 200, description: 'Subscribers retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getSubscribers(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.lifecycleService.getSubscribers(id, { status, page, limit });
  }

  // Segment Endpoints
  @Post('segments')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create segment' })
  @ApiResponse({ status: 201, description: 'Segment created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createSegment(@Body() dto: CreateSegmentDto) {
    return this.lifecycleService.createSegment({
      name: dto.name,
      description: dto.description,
      organizationId: dto.organizationId,
      conditions: dto.conditions,
      conditionLogic: dto.conditionLogic,
    });
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get segments' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Segments retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getSegments(@Query('organizationId') organizationId: string) {
    return this.lifecycleService.getSegments(organizationId);
  }

  @Post('segments/:id/evaluate')
  @ApiOperation({ summary: 'Evaluate segment membership' })
  @ApiParam({ name: 'id', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Segment evaluated' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async evaluateSegment(@Param('id') id: string) {
    return this.lifecycleService.evaluateSegment(id);
  }

  // Trigger Endpoints
  @Post('triggers')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create behavioral trigger' })
  @ApiResponse({ status: 201, description: 'Trigger created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createTrigger(@Body() dto: CreateTriggerDto) {
    return this.lifecycleService.createTrigger({
      name: dto.name,
      organizationId: dto.organizationId,
      triggerType: dto.triggerType,
      conditions: dto.conditions,
      actions: dto.actions,
      isActive: dto.isActive,
    });
  }

  @Get('triggers')
  @ApiOperation({ summary: 'Get triggers' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Triggers retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getTriggers(@Query('organizationId') organizationId: string) {
    return this.lifecycleService.getTriggers(organizationId);
  }

  @Put('triggers/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({ status: 200, description: 'Trigger updated' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateTrigger(@Param('id') id: string, @Body() dto: Partial<CreateTriggerDto>) {
    return this.lifecycleService.updateTrigger(id, dto);
  }

  @Post('triggers/:id/fire')
  @ApiOperation({ summary: 'Manually fire trigger' })
  @ApiParam({ name: 'id', description: 'Trigger ID' })
  @ApiResponse({ status: 200, description: 'Trigger fired' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async fireTrigger(
    @Param('id') id: string,
    @Body() body: { userId: string; context?: Record<string, any> },
  ) {
    await this.lifecycleService.fireTrigger(id, body.userId, body.context);
    return { success: true };
  }

  // Flow Endpoints
  @Post('flows')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create nurture flow' })
  @ApiResponse({ status: 201, description: 'Flow created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createFlow(@Body() dto: CreateFlowDto) {
    return this.lifecycleService.createFlow({
      name: dto.name,
      description: dto.description,
      organizationId: dto.organizationId,
      entryTrigger: dto.entryTrigger,
      entryConditions: dto.entryConditions,
      steps: dto.steps,
      exitConditions: dto.exitConditions,
    });
  }

  @Get('flows')
  @ApiOperation({ summary: 'Get flows' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Flows retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getFlows(@Query('organizationId') organizationId: string) {
    return this.lifecycleService.getFlows(organizationId);
  }

  @Post('flows/:id/enroll')
  @ApiOperation({ summary: 'Enroll user in flow' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 201, description: 'User enrolled' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async enrollInFlow(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.lifecycleService.enrollInFlow(id, body.userId);
  }

  @Get('flows/:id/enrollment/:userId')
  @ApiOperation({ summary: 'Get enrollment status' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Enrollment status retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getEnrollmentStatus(@Param('id') id: string, @Param('userId') userId: string) {
    return this.lifecycleService.getEnrollmentStatus(id, userId);
  }

  // Event Endpoints
  @Post('events')
  @ApiOperation({ summary: 'Track lifecycle event' })
  @ApiResponse({ status: 201, description: 'Event tracked' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackEvent(@Body() dto: TrackEventDto) {
    return this.lifecycleService.trackEvent({
      event: dto.event,
      userId: dto.userId,
      properties: dto.properties,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
    });
  }

  @Get('events/:userId')
  @ApiOperation({ summary: 'Get user events' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Events retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getEvents(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.lifecycleService.getEvents(userId, { limit });
  }

  // Lifecycle Stage Endpoints
  @Put('stage')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update user lifecycle stage' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async updateLifecycleStage(@Body() dto: UpdateLifecycleStageDto) {
    return this.lifecycleService.updateLifecycleStage(dto.userId, dto.stage, dto.reason);
  }

  @Get('stage/:userId')
  @ApiOperation({ summary: 'Get user lifecycle stage' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Stage retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getLifecycleStage(@Param('userId') userId: string) {
    return this.lifecycleService.getLifecycleStage(userId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get lifecycle metrics' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getLifecycleMetrics(@Query('organizationId') organizationId: string) {
    return this.lifecycleService.getLifecycleMetrics(organizationId);
  }
}
