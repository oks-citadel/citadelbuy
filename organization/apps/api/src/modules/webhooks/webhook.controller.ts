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
  Request,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookEventDto,
  RetryWebhookDto,
  RetryDeadLetterDto,
} from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

/**
 * Webhook Controller
 *
 * Provides REST API endpoints for managing webhooks and viewing delivery history.
 *
 * Endpoints:
 * - Create/Update/Delete webhook endpoints
 * - Rotate webhook secrets
 * - View delivery history and statistics
 * - Retry failed deliveries
 * - Manage dead letter queue
 * - Trigger test events
 */
@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Create a new webhook endpoint
   */
  @Post()
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully. Returns the webhook with secret (only shown once).',
  })
  async createWebhook(@Body() createWebhookDto: CreateWebhookDto, @Req() req: ExpressRequest & { user?: { id?: string; organizationId?: string } }) {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    return this.webhookService.createWebhook(
      createWebhookDto,
      userId,
      organizationId,
    );
  }

  /**
   * Get all webhooks for the current user/organization
   */
  @Get()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async getWebhooks(@Req() req: ExpressRequest & { user?: { id?: string; organizationId?: string } }) {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    return this.webhookService.getWebhooks(userId, organizationId);
  }

  /**
   * Get a single webhook by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhook(@Param('id') id: string) {
    return this.webhookService.getWebhook(id);
  }

  /**
   * Update a webhook
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    return this.webhookService.updateWebhook(id, updateWebhookDto);
  }

  /**
   * Delete a webhook
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') id: string) {
    return this.webhookService.deleteWebhook(id);
  }

  /**
   * Rotate webhook secret
   */
  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({
    status: 200,
    description: 'Secret rotated successfully. Returns new secret (only shown once).',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async rotateSecret(@Param('id') id: string) {
    return this.webhookService.rotateSecret(id);
  }

  /**
   * Get delivery history for a webhook
   */
  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for a webhook' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Delivery history' })
  async getDeliveryHistory(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.webhookService.getDeliveryHistory(
      id,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  /**
   * Get delivery statistics for a webhook
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get delivery statistics for a webhook' })
  @ApiResponse({ status: 200, description: 'Delivery statistics' })
  async getDeliveryStats(@Param('id') id: string) {
    return this.webhookService.getDeliveryStats(id);
  }

  /**
   * Retry a failed delivery
   */
  @Post('deliveries/retry')
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiResponse({ status: 200, description: 'Delivery retry queued' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async retryDelivery(@Body() retryDto: RetryWebhookDto) {
    return this.webhookService.retryDelivery(retryDto.deliveryId);
  }

  /**
   * Get dead letter queue entries
   */
  @Get('admin/dead-letter-queue')
  @ApiOperation({ summary: 'Get dead letter queue entries' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Dead letter queue entries' })
  async getDeadLetterQueue(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.webhookService.getDeadLetterQueue(
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  /**
   * Retry from dead letter queue
   */
  @Post('admin/dead-letter-queue/retry')
  @ApiOperation({ summary: 'Retry a webhook from dead letter queue' })
  @ApiResponse({ status: 200, description: 'Retry queued successfully' })
  @ApiResponse({ status: 404, description: 'Dead letter entry not found' })
  async retryFromDeadLetter(@Body() retryDto: RetryDeadLetterDto) {
    return this.webhookService.retryFromDeadLetter(retryDto.deadLetterId);
  }

  /**
   * Trigger a test webhook event (for testing purposes)
   */
  @Post('admin/trigger-test-event')
  @ApiOperation({ summary: 'Trigger a test webhook event' })
  @ApiResponse({ status: 200, description: 'Test event triggered' })
  async triggerTestEvent(@Body() eventDto: WebhookEventDto) {
    return this.webhookService.triggerEvent(eventDto);
  }
}
