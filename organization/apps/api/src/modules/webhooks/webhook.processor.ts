import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WebhookService, WebhookDeliveryJobData, WEBHOOK_QUEUE } from './webhook.service';
import { createWebhookHeaders } from './utils/webhook-signature.util';

/**
 * Webhook Processor
 *
 * Processes webhook delivery jobs from the Bull queue.
 * Handles HTTP requests to webhook endpoints with proper error handling.
 *
 * Features:
 * - Sends HTTP POST requests to webhook endpoints
 * - Adds signature headers for verification
 * - Handles network errors and HTTP errors
 * - Tracks delivery status and response
 * - Integrates with retry mechanism
 */
@Processor(WEBHOOK_QUEUE)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(
    private readonly webhookService: WebhookService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Process webhook delivery job
   */
  @Process('deliver')
  async processDelivery(job: Job<WebhookDeliveryJobData>) {
    const { deliveryId, url, secret, eventType, eventId, payload, attempt } = job.data;

    this.logger.log(
      `Processing webhook delivery ${deliveryId} (attempt ${attempt}/${5})`,
    );

    try {
      // Update job progress
      await job.progress(10);

      // Create webhook headers with signature
      const headers = createWebhookHeaders(payload, secret, eventType, eventId);

      await job.progress(30);

      // Send HTTP POST request to webhook endpoint
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers,
          timeout: this.REQUEST_TIMEOUT,
          validateStatus: (status) => status >= 200 && status < 300,
        }),
      );

      const duration = Date.now() - startTime;

      await job.progress(80);

      // Handle successful delivery
      await this.webhookService.handleDeliverySuccess(
        deliveryId,
        response.status,
        JSON.stringify(response.data).substring(0, 1000), // Limit response body
      );

      await job.progress(100);

      this.logger.log(
        `Webhook delivery ${deliveryId} succeeded in ${duration}ms (status: ${response.status})`,
      );

      return {
        success: true,
        deliveryId,
        statusCode: response.status,
        duration,
      };
    } catch (error) {
      await job.progress(90);

      // Extract error details
      let statusCode: number | null = null;
      let errorMessage = error.message || 'Unknown error';
      let responseBody: string | undefined;

      if (error.response) {
        // HTTP error response
        statusCode = error.response.status;
        errorMessage = `HTTP ${statusCode}: ${error.response.statusText}`;
        responseBody = JSON.stringify(error.response.data).substring(0, 1000);
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timeout';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Host not found';
      }

      // Handle delivery failure (will schedule retry if needed)
      await this.webhookService.handleDeliveryFailure(
        deliveryId,
        statusCode,
        errorMessage,
        responseBody,
      );

      this.logger.error(
        `Webhook delivery ${deliveryId} failed (attempt ${attempt}): ${errorMessage}`,
      );

      // Don't throw - we handle retries manually
      return {
        success: false,
        deliveryId,
        statusCode,
        errorMessage,
        attempt,
      };
    }
  }

  /**
   * Event handler: Job becomes active
   */
  @OnQueueActive()
  onActive(job: Job<WebhookDeliveryJobData>) {
    this.logger.debug(
      `Processing webhook delivery job ${job.id} for ${job.data.url}`,
      {
        deliveryId: job.data.deliveryId,
        eventType: job.data.eventType,
        attempt: job.data.attempt,
      },
    );
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnQueueCompleted()
  async onCompleted(job: Job<WebhookDeliveryJobData>, result: any) {
    if (result.success) {
      this.logger.log(
        `Webhook delivery job ${job.id} completed successfully`,
        {
          deliveryId: job.data.deliveryId,
          statusCode: result.statusCode,
          duration: result.duration,
        },
      );
    } else {
      this.logger.warn(
        `Webhook delivery job ${job.id} completed with failure`,
        {
          deliveryId: job.data.deliveryId,
          attempt: result.attempt,
          errorMessage: result.errorMessage,
        },
      );
    }
  }

  /**
   * Event handler: Job failed
   */
  @OnQueueFailed()
  async onFailed(job: Job<WebhookDeliveryJobData>, error: Error) {
    this.logger.error(
      `Webhook delivery job ${job.id} failed unexpectedly`,
      {
        deliveryId: job.data.deliveryId,
        eventType: job.data.eventType,
        url: job.data.url,
        error: error.message,
        stack: error.stack,
      },
    );

    // This should rarely happen since we handle errors in processDelivery
    // But if it does, mark the delivery as failed
    try {
      await this.webhookService.handleDeliveryFailure(
        job.data.deliveryId,
        null,
        `Job processing error: ${error.message}`,
      );
    } catch (handlingError) {
      this.logger.error(
        `Failed to handle job failure for delivery ${job.data.deliveryId}`,
        handlingError,
      );
    }
  }
}
