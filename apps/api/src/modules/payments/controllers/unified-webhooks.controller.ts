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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { PaymentProviderType } from '../interfaces';
import { UnifiedWebhookService } from '../services/unified-webhook.service';

/**
 * Unified Webhooks Controller
 *
 * Handles webhooks from all payment providers:
 * - Stripe
 * - PayPal
 * - Flutterwave
 * - Paystack
 * - Apple App Store
 * - Google Play
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class UnifiedWebhooksController {
  private readonly logger = new Logger(UnifiedWebhooksController.name);

  constructor(private readonly webhookService: UnifiedWebhookService) {}

  /**
   * Stripe Webhook
   */
  @Post('stripe')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      const rawBody = req.rawBody || req.body;

      const result = await this.webhookService.processWebhook(
        PaymentProviderType.STRIPE,
        rawBody,
        signature,
      );

      if (!result.success) {
        this.logger.warn(`Stripe webhook processing failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger.error(`Stripe webhook error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * PayPal Webhook
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
    try {
      const result = await this.webhookService.processWebhook(
        PaymentProviderType.PAYPAL,
        JSON.stringify(body),
        headers['paypal-transmission-sig'] || '',
        headers,
      );

      if (!result.success) {
        this.logger.warn(`PayPal webhook processing failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger.error(`PayPal webhook error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Flutterwave Webhook
   */
  @Post('flutterwave')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.webhookService.processWebhook(
        PaymentProviderType.FLUTTERWAVE,
        JSON.stringify(body),
        signature,
      );

      if (!result.success) {
        this.logger.warn(`Flutterwave webhook processing failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).json({ status: 'success' });
    } catch (error: any) {
      this.logger.error(`Flutterwave webhook error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Paystack Webhook
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
    try {
      // Paystack requires raw body for signature verification
      const rawBody = (req as any).rawBody || JSON.stringify(body);

      const result = await this.webhookService.processWebhook(
        PaymentProviderType.PAYSTACK,
        rawBody,
        signature,
      );

      if (!result.success) {
        this.logger.warn(`Paystack webhook processing failed: ${result.error}`);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).send();
    } catch (error: any) {
      this.logger.error(`Paystack webhook error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Apple App Store Server Notifications
   */
  @Post('apple')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleAppleWebhook(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.webhookService.processIAPNotification(
        'ios',
        body,
      );

      if (!result.success) {
        this.logger.warn(`Apple webhook processing failed: ${result.error}`);
        // Apple expects 200 even on failure to prevent retries for invalid notifications
        return res.status(HttpStatus.OK).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger.error(`Apple webhook error: ${error.message}`);
      return res.status(HttpStatus.OK).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Google Play Real-Time Developer Notifications (RTDN)
   */
  @Post('google')
  @SkipCsrf()
  @ApiExcludeEndpoint()
  async handleGoogleWebhook(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.webhookService.processIAPNotification(
        'android',
        body,
      );

      if (!result.success) {
        this.logger.warn(`Google webhook processing failed: ${result.error}`);
        // Return 200 to acknowledge receipt
        return res.status(HttpStatus.OK).json({ error: result.error });
      }

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger.error(`Google webhook error: ${error.message}`);
      return res.status(HttpStatus.OK).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Health check for webhooks
   */
  @Post('health')
  @ApiOperation({ summary: 'Webhook health check' })
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
