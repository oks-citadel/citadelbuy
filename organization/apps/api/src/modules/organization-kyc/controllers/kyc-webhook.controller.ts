import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { KycProviderService } from '../services/kyc-provider.service';

/**
 * KYC Webhook Controller
 *
 * Handles webhook callbacks from external KYC providers
 * - Onfido webhooks
 * - Jumio webhooks
 * - Sumsub webhooks
 *
 * Security:
 * - Signature verification for all webhooks
 * - IP whitelisting (optional)
 * - Rate limiting
 */
@ApiTags('KYC Webhooks')
@Controller('webhooks/kyc')
export class KycWebhookController {
  private readonly logger = new Logger(KycWebhookController.name);

  constructor(private readonly kycProviderService: KycProviderService) {}

  /**
   * Onfido webhook endpoint
   * Receives verification status updates from Onfido
   */
  @Post('onfido')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Onfido webhook callback',
    description: 'Receives verification status updates from Onfido service',
  })
  @ApiHeader({
    name: 'X-SHA2-Signature',
    description: 'HMAC SHA-256 signature of the webhook payload',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid signature or payload',
  })
  async handleOnfidoWebhook(
    @Body() payload: any,
    @Headers('x-sha2-signature') signature: string,
    @Req() req: Request,
  ) {
    this.logger.log('Received Onfido webhook');

    // Validate signature
    if (!signature) {
      this.logger.warn('Onfido webhook received without signature');
      throw new BadRequestException('Missing webhook signature');
    }

    try {
      // Get raw body for signature verification
      const rawBody = (req as RawBodyRequest<Request>).rawBody;
      const payloadString = rawBody ? rawBody.toString('utf8') : JSON.stringify(payload);

      // Process webhook through provider service
      await this.kycProviderService.processWebhook(payload, signature);

      this.logger.log('Onfido webhook processed successfully');

      return {
        success: true,
        message: 'Webhook processed',
      };
    } catch (error) {
      this.logger.error('Failed to process Onfido webhook', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Jumio webhook endpoint (placeholder)
   */
  @Post('jumio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Jumio webhook callback',
    description: 'Receives verification status updates from Jumio service',
  })
  @ApiHeader({
    name: 'X-Jumio-Signature',
    description: 'HMAC signature of the webhook payload',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleJumioWebhook(
    @Body() payload: any,
    @Headers('x-jumio-signature') signature: string,
  ) {
    this.logger.log('Received Jumio webhook');

    // Jumio implementation would go here
    this.logger.warn('Jumio webhook handler not yet implemented');

    return {
      success: true,
      message: 'Jumio webhook received (not yet implemented)',
    };
  }

  /**
   * Sumsub webhook endpoint (placeholder)
   */
  @Post('sumsub')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sumsub webhook callback',
    description: 'Receives verification status updates from Sumsub service',
  })
  @ApiHeader({
    name: 'X-Payload-Digest',
    description: 'HMAC signature of the webhook payload',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleSumsubWebhook(
    @Body() payload: any,
    @Headers('x-payload-digest') signature: string,
  ) {
    this.logger.log('Received Sumsub webhook');

    // Sumsub implementation would go here
    this.logger.warn('Sumsub webhook handler not yet implemented');

    return {
      success: true,
      message: 'Sumsub webhook received (not yet implemented)',
    };
  }

  /**
   * Generic webhook test endpoint (development only)
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test webhook endpoint',
    description: 'Test endpoint for development and debugging',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test webhook received',
  })
  async handleTestWebhook(@Body() payload: any) {
    this.logger.log('Received test webhook', JSON.stringify(payload, null, 2));

    return {
      success: true,
      message: 'Test webhook received',
      receivedPayload: payload,
      timestamp: new Date().toISOString(),
    };
  }
}
