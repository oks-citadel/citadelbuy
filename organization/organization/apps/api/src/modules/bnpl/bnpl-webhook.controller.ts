/**
 * BNPL Webhook Controller
 *
 * Handles webhook events from BNPL providers (Klarna, Affirm, Afterpay).
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BnplProvider } from '@prisma/client';
import { BnplProviderEnhancedService } from './services/bnpl-provider-enhanced.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WebhookResponseDto } from './dto/webhook.dto';

@ApiTags('bnpl-webhooks')
@Controller('webhooks/bnpl')
export class BnplWebhookController {
  private readonly logger = new Logger(BnplWebhookController.name);

  constructor(
    private readonly bnplProviderService: BnplProviderEnhancedService,
    private readonly prisma: PrismaService,
  ) {}

  // =============================================================================
  // KLARNA WEBHOOKS
  // =============================================================================

  @Post('klarna')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Klarna webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleKlarnaWebhook(
    @Body() payload: any,
    @Headers() headers: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Klarna webhook');

    try {
      const event = await this.bnplProviderService.handleWebhook(
        BnplProvider.KLARNA,
        payload,
        headers,
      );

      // Process the webhook event
      await this.processWebhookEvent(event.provider, event.providerOrderId, event.status, event);

      return {
        success: true,
        message: 'Webhook processed successfully',
        eventType: event.eventType,
        providerOrderId: event.providerOrderId,
      };
    } catch (error: any) {
      this.logger.error('Failed to process Klarna webhook', error);
      throw new HttpException(
        `Webhook processing failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================================================
  // AFFIRM WEBHOOKS
  // =============================================================================

  @Post('affirm')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Affirm webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleAffirmWebhook(
    @Body() payload: any,
    @Headers() headers: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Affirm webhook');

    try {
      const event = await this.bnplProviderService.handleWebhook(
        BnplProvider.AFFIRM,
        payload,
        headers,
      );

      // Process the webhook event
      await this.processWebhookEvent(event.provider, event.providerOrderId, event.status, event);

      return {
        success: true,
        message: 'Webhook processed successfully',
        eventType: event.eventType,
        providerOrderId: event.providerOrderId,
      };
    } catch (error: any) {
      this.logger.error('Failed to process Affirm webhook', error);
      throw new HttpException(
        `Webhook processing failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================================================
  // AFTERPAY WEBHOOKS
  // =============================================================================

  @Post('afterpay')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Afterpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleAfterpayWebhook(
    @Body() payload: any,
    @Headers() headers: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Afterpay webhook');

    try {
      const event = await this.bnplProviderService.handleWebhook(
        BnplProvider.AFTERPAY,
        payload,
        headers,
      );

      // Process the webhook event
      await this.processWebhookEvent(event.provider, event.providerOrderId, event.status, event);

      return {
        success: true,
        message: 'Webhook processed successfully',
        eventType: event.eventType,
        providerOrderId: event.providerOrderId,
      };
    } catch (error: any) {
      this.logger.error('Failed to process Afterpay webhook', error);
      throw new HttpException(
        `Webhook processing failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================================================
  // WEBHOOK PROCESSING
  // =============================================================================

  /**
   * Process webhook event and update payment plan status
   */
  private async processWebhookEvent(
    provider: BnplProvider,
    providerOrderId: string,
    status: string | undefined,
    event: any,
  ): Promise<void> {
    this.logger.log(
      `Processing webhook event: ${event.eventType} for provider ${provider}, order ${providerOrderId}`,
    );

    // Find the payment plan by provider order ID
    const paymentPlan = await this.prisma.bnplPaymentPlan.findFirst({
      where: {
        provider,
        providerPlanId: providerOrderId,
      },
    });

    if (!paymentPlan) {
      this.logger.warn(`Payment plan not found for provider order ID: ${providerOrderId}`);
      return;
    }

    // Update payment plan status based on webhook event
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map event types to payment plan status updates
    switch (event.eventType?.toLowerCase()) {
      case 'authorized':
      case 'auth_approved':
      case 'fraud_risk_accepted':
        updateData.status = 'ACTIVE';
        break;

      case 'captured':
      case 'complete':
        // Don't change status on capture - let installment payments handle this
        break;

      case 'cancelled':
      case 'voided':
      case 'expired':
        updateData.status = 'CANCELLED';
        break;

      case 'refunded':
        updateData.status = 'REFUNDED';
        break;

      case 'fraud_risk_rejected':
        updateData.status = 'DEFAULTED';
        break;

      default:
        this.logger.debug(`Unhandled webhook event type: ${event.eventType}`);
    }

    // Update the payment plan if there are changes
    if (Object.keys(updateData).length > 1) {
      // More than just updatedAt
      await this.prisma.bnplPaymentPlan.update({
        where: { id: paymentPlan.id },
        data: updateData,
      });

      this.logger.log(
        `Updated payment plan ${paymentPlan.id} with status: ${updateData.status || 'no change'}`,
      );
    }

    // Log the webhook event for audit trail
    await this.logWebhookEvent(paymentPlan.id, provider, event);
  }

  /**
   * Log webhook event for audit trail
   */
  private async logWebhookEvent(
    paymentPlanId: string,
    provider: BnplProvider,
    event: any,
  ): Promise<void> {
    try {
      // You could create a WebhookLog table to store these events
      this.logger.debug(
        `Webhook event logged: ${event.eventType} for payment plan ${paymentPlanId}`,
      );
    } catch (error) {
      this.logger.error('Failed to log webhook event', error);
      // Don't throw - webhook logging failure shouldn't fail the webhook processing
    }
  }
}
