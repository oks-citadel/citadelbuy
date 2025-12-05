import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Res,
  Logger,
  HttpStatus,
  RawBodyRequest,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { WebhookIdempotencyService } from '@/modules/webhooks/webhook-idempotency.service';
import { UnifiedWebhookService } from './services/unified-webhook.service';
import { PaymentProviderType } from './interfaces';

/**
 * Payments Webhook Controller
 *
 * Handles incoming payment webhooks from various payment providers with:
 * - Idempotency guarantees (events processed exactly once)
 * - Signature verification for security
 * - Timeout protection (5-minute processing window)
 * - Proper error handling and status codes
 * - Detailed logging for debugging
 *
 * Supported providers:
 * - Stripe
 * - PayPal
 * - Flutterwave
 * - Paystack
 *
 * Flow:
 * 1. Verify webhook signature
 * 2. Check idempotency (has event been processed?)
 * 3. Lock event for processing
 * 4. Process webhook event
 * 5. Mark event as completed/failed
 * 6. Return appropriate status code
 */
@ApiTags('Payment Webhooks')
@Controller('webhooks/payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);
  private stripe: Stripe;

  // Webhook processing timeout (5 minutes in milliseconds)
  private readonly WEBHOOK_TIMEOUT_MS = 5 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly idempotencyService: WebhookIdempotencyService,
    private readonly webhookService: UnifiedWebhookService,
  ) {
    // Initialize Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-11-20.acacia',
      });
    }
  }

  /**
   * Stripe Payment Webhook
   *
   * Handles Stripe webhook events with signature verification and idempotency
   */
  @Post('stripe')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      // Validate signature header
      if (!signature) {
        this.logger.warn('Missing Stripe signature header');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing stripe-signature header',
        });
      }

      // Get raw body
      const rawBody = req.rawBody || req.body;
      if (!rawBody) {
        this.logger.warn('Missing request body');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing request body',
        });
      }

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        const webhookSecret = this.configService.get<string>(
          'STRIPE_WEBHOOK_SECRET',
        );
        if (!webhookSecret) {
          this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: 'Webhook secret not configured',
          });
        }

        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
      } catch (err: any) {
        this.logger.error(`Stripe signature verification failed: ${err.message}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: `Webhook signature verification failed: ${err.message}`,
        });
      }

      this.logger.log(
        `Stripe webhook received: ${event.type} (${event.id})`,
      );

      // Check idempotency - has this event been processed?
      const canProcess = await this.idempotencyService.checkAndLockEvent(
        event.id,
        PaymentProviderType.STRIPE,
        event.type,
        {
          livemode: event.livemode,
          api_version: event.api_version,
        },
      );

      if (!canProcess) {
        this.logger.debug(
          `Stripe event ${event.id} already processed, returning 200`,
        );
        return res.status(HttpStatus.OK).json({
          received: true,
          message: 'Event already processed',
        });
      }

      // Process webhook with timeout protection
      const processingPromise = this.processStripeWebhook(event);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Webhook processing timeout')),
          this.WEBHOOK_TIMEOUT_MS,
        ),
      );

      let processingResult: any;
      try {
        processingResult = await Promise.race([
          processingPromise,
          timeoutPromise,
        ]);
      } catch (error: any) {
        this.logger.error(
          `Stripe webhook processing error: ${error.message}`,
          error.stack,
        );

        // Mark event as failed
        await this.idempotencyService.markEventFailed(
          event.id,
          PaymentProviderType.STRIPE,
          error.message,
          { eventType: event.type },
        );

        // Return 500 to trigger retry
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Webhook processing failed',
          message: error.message,
        });
      }

      // Mark event as completed
      await this.idempotencyService.markEventCompleted(
        event.id,
        PaymentProviderType.STRIPE,
        {
          eventType: event.type,
          processingTime: Date.now() - startTime,
        },
      );

      this.logger.log(
        `Stripe event ${event.id} processed successfully in ${Date.now() - startTime}ms`,
      );

      return res.status(HttpStatus.OK).json({
        received: true,
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error: any) {
      this.logger.error(
        `Unexpected error in Stripe webhook handler: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * PayPal Payment Webhook
   *
   * Handles PayPal webhook events with signature verification and idempotency
   */
  @Post('paypal')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handlePayPalWebhook(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      // Extract event ID from PayPal webhook
      const eventId = body.id || body.event_id;
      const eventType = body.event_type;

      if (!eventId || !eventType) {
        this.logger.warn('Missing PayPal event ID or type');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing event ID or type',
        });
      }

      this.logger.log(
        `PayPal webhook received: ${eventType} (${eventId})`,
      );

      // Check idempotency
      const canProcess = await this.idempotencyService.checkAndLockEvent(
        eventId,
        PaymentProviderType.PAYPAL,
        eventType,
        {
          resource_type: body.resource_type,
        },
      );

      if (!canProcess) {
        this.logger.debug(
          `PayPal event ${eventId} already processed, returning 200`,
        );
        return res.status(HttpStatus.OK).json({
          received: true,
          message: 'Event already processed',
        });
      }

      // Process webhook through unified service
      const result = await this.webhookService.processWebhook(
        PaymentProviderType.PAYPAL,
        JSON.stringify(body),
        headers['paypal-transmission-sig'] || '',
        headers,
      );

      if (!result.success) {
        // Mark as failed
        await this.idempotencyService.markEventFailed(
          eventId,
          PaymentProviderType.PAYPAL,
          result.error,
          { eventType },
        );

        this.logger.warn(`PayPal webhook failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: result.error,
        });
      }

      // Mark as completed
      await this.idempotencyService.markEventCompleted(
        eventId,
        PaymentProviderType.PAYPAL,
        {
          eventType,
          processingTime: Date.now() - startTime,
        },
      );

      this.logger.log(
        `PayPal event ${eventId} processed successfully in ${Date.now() - startTime}ms`,
      );

      return res.status(HttpStatus.OK).json({
        received: true,
        eventId,
        eventType,
      });
    } catch (error: any) {
      this.logger.error(
        `Unexpected error in PayPal webhook handler: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Flutterwave Payment Webhook
   */
  @Post('flutterwave')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      const eventId = body.id || body.txRef;
      const eventType = body.event || 'charge.completed';

      if (!eventId) {
        this.logger.warn('Missing Flutterwave event ID');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing event ID',
        });
      }

      this.logger.log(
        `Flutterwave webhook received: ${eventType} (${eventId})`,
      );

      // Check idempotency
      const canProcess = await this.idempotencyService.checkAndLockEvent(
        eventId,
        PaymentProviderType.FLUTTERWAVE,
        eventType,
      );

      if (!canProcess) {
        this.logger.debug(
          `Flutterwave event ${eventId} already processed, returning 200`,
        );
        return res.status(HttpStatus.OK).json({
          status: 'success',
          message: 'Event already processed',
        });
      }

      // Process webhook
      const result = await this.webhookService.processWebhook(
        PaymentProviderType.FLUTTERWAVE,
        JSON.stringify(body),
        signature,
      );

      if (!result.success) {
        await this.idempotencyService.markEventFailed(
          eventId,
          PaymentProviderType.FLUTTERWAVE,
          result.error,
          { eventType },
        );

        this.logger.warn(`Flutterwave webhook failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: result.error,
        });
      }

      await this.idempotencyService.markEventCompleted(
        eventId,
        PaymentProviderType.FLUTTERWAVE,
        {
          eventType,
          processingTime: Date.now() - startTime,
        },
      );

      this.logger.log(
        `Flutterwave event ${eventId} processed successfully in ${Date.now() - startTime}ms`,
      );

      return res.status(HttpStatus.OK).json({
        status: 'success',
        eventId,
      });
    } catch (error: any) {
      this.logger.error(
        `Unexpected error in Flutterwave webhook handler: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Paystack Payment Webhook
   */
  @Post('paystack')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      const eventId = body.id || body.data?.id;
      const eventType = body.event;

      if (!eventId || !eventType) {
        this.logger.warn('Missing Paystack event ID or type');
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing event ID or type',
        });
      }

      this.logger.log(
        `Paystack webhook received: ${eventType} (${eventId})`,
      );

      // Check idempotency
      const canProcess = await this.idempotencyService.checkAndLockEvent(
        eventId,
        PaymentProviderType.PAYSTACK,
        eventType,
      );

      if (!canProcess) {
        this.logger.debug(
          `Paystack event ${eventId} already processed, returning 200`,
        );
        return res.status(HttpStatus.OK).send();
      }

      // Process webhook
      const rawBody = (req as any).rawBody || JSON.stringify(body);
      const result = await this.webhookService.processWebhook(
        PaymentProviderType.PAYSTACK,
        rawBody,
        signature,
      );

      if (!result.success) {
        await this.idempotencyService.markEventFailed(
          eventId,
          PaymentProviderType.PAYSTACK,
          result.error,
          { eventType },
        );

        this.logger.warn(`Paystack webhook failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: result.error,
        });
      }

      await this.idempotencyService.markEventCompleted(
        eventId,
        PaymentProviderType.PAYSTACK,
        {
          eventType,
          processingTime: Date.now() - startTime,
        },
      );

      this.logger.log(
        `Paystack event ${eventId} processed successfully in ${Date.now() - startTime}ms`,
      );

      return res.status(HttpStatus.OK).send();
    } catch (error: any) {
      this.logger.error(
        `Unexpected error in Paystack webhook handler: ${error.message}`,
        error.stack,
      );
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Health check endpoint for payment webhooks
   */
  @Post('health')
  @ApiOperation({ summary: 'Payment webhook health check' })
  async healthCheck(@Res() res: Response) {
    const stats = await this.idempotencyService.getStatistics();
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      statistics: stats,
    });
  }

  // ==================== Private Helper Methods ====================

  /**
   * Process Stripe webhook event
   */
  private async processStripeWebhook(event: Stripe.Event): Promise<void> {
    // Delegate to unified webhook service
    const result = await this.webhookService.processWebhook(
      PaymentProviderType.STRIPE,
      JSON.stringify(event),
      '', // Signature already verified
    );

    if (!result.success) {
      throw new InternalServerErrorException(result.error);
    }
  }
}
