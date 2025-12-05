import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookDeliveryStatus } from '@prisma/client';
import { CreateWebhookDto, UpdateWebhookDto, WebhookEventDto } from './dto';
import { generateWebhookSecret } from './utils/webhook-signature.util';

export const WEBHOOK_QUEUE = 'webhooks';

export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  eventType: string;
  eventId: string;
  payload: any;
  attempt: number;
}

/**
 * Webhook Service
 *
 * Manages webhook endpoints, event triggering, and delivery tracking.
 * Implements retry logic with exponential backoff for failed deliveries.
 *
 * Retry Schedule:
 * - Attempt 1: Immediate
 * - Attempt 2: 5 minutes
 * - Attempt 3: 30 minutes
 * - Attempt 4: 2 hours
 * - Attempt 5: 24 hours
 *
 * After 5 failed attempts, the delivery is moved to the dead letter queue.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // Retry delays in milliseconds
  private readonly RETRY_DELAYS = [
    0,              // Attempt 1: immediate
    5 * 60 * 1000,  // Attempt 2: 5 minutes
    30 * 60 * 1000, // Attempt 3: 30 minutes
    2 * 60 * 60 * 1000,  // Attempt 4: 2 hours
    24 * 60 * 60 * 1000, // Attempt 5: 24 hours
  ];

  private readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
  ) {}

  /**
   * Create a new webhook endpoint
   */
  async createWebhook(
    createWebhookDto: CreateWebhookDto,
    userId?: string,
    organizationId?: string,
  ) {
    const secret = generateWebhookSecret();

    const webhook = await this.prisma.webhook.create({
      data: {
        url: createWebhookDto.url,
        secret,
        description: createWebhookDto.description,
        events: createWebhookDto.events,
        isActive: createWebhookDto.isActive ?? true,
        metadata: createWebhookDto.metadata || {},
        userId,
        organizationId,
      },
    });

    this.logger.log(`Webhook created: ${webhook.id} for URL: ${webhook.url}`);

    // Don't expose secret in response, only return it once
    return {
      ...webhook,
      secret, // Only returned on creation
    };
  }

  /**
   * Get all webhooks for a user or organization
   */
  async getWebhooks(userId?: string, organizationId?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (organizationId) where.organizationId = organizationId;

    const webhooks = await this.prisma.webhook.findMany({
      where,
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't expose secrets in list view
    return webhooks.map(({ secret, ...webhook }) => webhook);
  }

  /**
   * Get a single webhook by ID
   */
  async getWebhook(id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }

    // Don't expose secret
    const { secret, ...webhookData } = webhook;
    return webhookData;
  }

  /**
   * Update a webhook
   */
  async updateWebhook(id: string, updateWebhookDto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.update({
      where: { id },
      data: {
        url: updateWebhookDto.url,
        description: updateWebhookDto.description,
        events: updateWebhookDto.events,
        isActive: updateWebhookDto.isActive,
        metadata: updateWebhookDto.metadata,
      },
    });

    this.logger.log(`Webhook updated: ${webhook.id}`);

    const { secret, ...webhookData } = webhook;
    return webhookData;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string) {
    await this.prisma.webhook.delete({
      where: { id },
    });

    this.logger.log(`Webhook deleted: ${id}`);

    return { success: true, message: 'Webhook deleted successfully' };
  }

  /**
   * Rotate webhook secret
   */
  async rotateSecret(id: string) {
    const newSecret = generateWebhookSecret();

    await this.prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    this.logger.log(`Webhook secret rotated: ${id}`);

    return {
      success: true,
      secret: newSecret, // Only returned on rotation
    };
  }

  /**
   * Trigger a webhook event
   * This is the main entry point for sending webhook notifications
   */
  async triggerEvent(event: WebhookEventDto) {
    this.logger.log(`Triggering webhook event: ${event.eventType} (${event.eventId})`);

    // Log the event
    const eventLog = await this.prisma.webhookEventLog.create({
      data: {
        eventType: event.eventType,
        eventId: event.eventId,
        payload: event.payload,
        source: event.source,
        triggeredBy: event.triggeredBy,
        metadata: event.metadata || {},
      },
    });

    // Find all active webhooks subscribed to this event type
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: event.eventType,
        },
      },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`No webhooks subscribed to event: ${event.eventType}`);
      await this.prisma.webhookEventLog.update({
        where: { id: eventLog.id },
        data: { processed: true, processedAt: new Date() },
      });
      return { webhooksTriggered: 0 };
    }

    // Create delivery records and queue jobs for each webhook
    const deliveryPromises = webhooks.map(async (webhook) => {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType: event.eventType,
          eventId: event.eventId,
          payload: event.payload,
          status: WebhookDeliveryStatus.PENDING,
          attempts: 0,
          maxAttempts: this.MAX_ATTEMPTS,
          metadata: {
            source: event.source,
            triggeredBy: event.triggeredBy,
          },
        },
      });

      // Queue the delivery job
      await this.queueDelivery(delivery.id, webhook, event, 1);

      return delivery;
    });

    const deliveries = await Promise.all(deliveryPromises);

    // Update event log
    await this.prisma.webhookEventLog.update({
      where: { id: eventLog.id },
      data: {
        webhooksTriggered: webhooks.length,
        processed: true,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `Event ${event.eventId} triggered ${webhooks.length} webhook(s)`,
    );

    return {
      webhooksTriggered: webhooks.length,
      deliveries: deliveries.map((d) => d.id),
    };
  }

  /**
   * Queue a webhook delivery job
   */
  private async queueDelivery(
    deliveryId: string,
    webhook: any,
    event: WebhookEventDto,
    attempt: number,
  ) {
    const delay = attempt > 1 ? this.RETRY_DELAYS[attempt - 1] : 0;

    const jobData: WebhookDeliveryJobData = {
      deliveryId,
      webhookId: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      eventType: event.eventType,
      eventId: event.eventId,
      payload: event.payload,
      attempt,
    };

    // Calculate next retry time
    if (attempt > 1) {
      const nextRetryAt = new Date(Date.now() + delay);
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.RETRYING,
          nextRetryAt,
        },
      });
    }

    await this.webhookQueue.add('deliver', jobData, {
      delay,
      attempts: 1, // We handle retries manually
      removeOnComplete: false, // Keep for history
      removeOnFail: false,
    });

    this.logger.debug(
      `Queued delivery ${deliveryId} (attempt ${attempt}) with delay ${delay}ms`,
    );
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status === WebhookDeliveryStatus.DELIVERED) {
      throw new Error('Cannot retry a successful delivery');
    }

    // Reset attempts and retry
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        errorMessage: null,
      },
    });

    const event: WebhookEventDto = {
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      payload: delivery.payload as any,
    };

    await this.queueDelivery(deliveryId, delivery.webhook, event, 1);

    this.logger.log(`Manual retry queued for delivery: ${deliveryId}`);

    return { success: true, message: 'Delivery retry queued' };
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveryHistory(webhookId: string, limit = 50, offset = 0) {
    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookDelivery.count({
        where: { webhookId },
      }),
    ]);

    return {
      deliveries,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get delivery statistics for a webhook
   */
  async getDeliveryStats(webhookId: string) {
    const stats = await this.prisma.webhookDelivery.groupBy({
      by: ['status'],
      where: { webhookId },
      _count: true,
    });

    const statsMap = {
      [WebhookDeliveryStatus.PENDING]: 0,
      [WebhookDeliveryStatus.DELIVERED]: 0,
      [WebhookDeliveryStatus.FAILED]: 0,
      [WebhookDeliveryStatus.RETRYING]: 0,
    };

    stats.forEach((stat) => {
      statsMap[stat.status] = stat._count;
    });

    return statsMap;
  }

  /**
   * Get dead letter queue entries
   */
  async getDeadLetterQueue(limit = 50, offset = 0) {
    const [entries, total] = await Promise.all([
      this.prisma.webhookDeadLetter.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookDeadLetter.count(),
    ]);

    return {
      entries,
      total,
      limit,
      offset,
    };
  }

  /**
   * Retry from dead letter queue
   */
  async retryFromDeadLetter(deadLetterId: string) {
    const deadLetter = await this.prisma.webhookDeadLetter.findUnique({
      where: { id: deadLetterId },
    });

    if (!deadLetter) {
      throw new NotFoundException(`Dead letter entry ${deadLetterId} not found`);
    }

    const webhook = await this.prisma.webhook.findUnique({
      where: { id: deadLetter.webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook ${deadLetter.webhookId} not found`);
    }

    // Create a new delivery
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType: deadLetter.eventType,
        eventId: deadLetter.eventId,
        payload: deadLetter.payload as any,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        metadata: {
          ...(deadLetter.metadata as any),
          retriedFromDeadLetter: true,
          originalDeadLetterId: deadLetterId,
        },
      },
    });

    const event: WebhookEventDto = {
      eventType: deadLetter.eventType,
      eventId: deadLetter.eventId,
      payload: deadLetter.payload as any,
    };

    await this.queueDelivery(delivery.id, webhook, event, 1);

    // Mark dead letter as processed
    await this.prisma.webhookDeadLetter.update({
      where: { id: deadLetterId },
      data: { retriedAt: new Date() },
    });

    this.logger.log(`Retrying from dead letter queue: ${deadLetterId}`);

    return { success: true, deliveryId: delivery.id };
  }

  /**
   * Process delivery failure and move to dead letter queue if needed
   */
  async handleDeliveryFailure(
    deliveryId: string,
    statusCode: number | null,
    errorMessage: string,
    responseBody?: string,
  ) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      this.logger.error(`Delivery not found: ${deliveryId}`);
      return;
    }

    const attempts = delivery.attempts + 1;

    if (attempts >= this.MAX_ATTEMPTS) {
      // Move to dead letter queue
      await this.prisma.webhookDeadLetter.create({
        data: {
          webhookId: delivery.webhookId,
          originalDeliveryId: deliveryId,
          eventType: delivery.eventType,
          eventId: delivery.eventId,
          payload: delivery.payload as any,
          errorMessage,
          statusCode,
          responseBody,
          attemptsMade: attempts,
          lastAttemptAt: new Date(),
          metadata: delivery.metadata || {},
        },
      });

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          attempts,
          statusCode,
          errorMessage,
          responseBody,
          failedAt: new Date(),
          lastAttemptAt: new Date(),
        },
      });

      this.logger.error(
        `Delivery ${deliveryId} failed after ${attempts} attempts, moved to dead letter queue`,
      );
    } else {
      // Schedule retry
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts,
          statusCode,
          errorMessage,
          responseBody,
          lastAttemptAt: new Date(),
        },
      });

      const event: WebhookEventDto = {
        eventType: delivery.eventType,
        eventId: delivery.eventId,
        payload: delivery.payload as any,
      };

      await this.queueDelivery(
        deliveryId,
        delivery.webhook,
        event,
        attempts + 1,
      );

      this.logger.warn(
        `Delivery ${deliveryId} failed (attempt ${attempts}/${this.MAX_ATTEMPTS}), scheduling retry`,
      );
    }
  }

  /**
   * Mark delivery as successful
   */
  async handleDeliverySuccess(
    deliveryId: string,
    statusCode: number,
    responseBody?: string,
  ) {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.DELIVERED,
        statusCode,
        responseBody,
        deliveredAt: new Date(),
        lastAttemptAt: new Date(),
      },
    });

    this.logger.log(`Delivery ${deliveryId} succeeded`);
  }
}
