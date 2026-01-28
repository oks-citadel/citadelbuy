import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IdempotentPayment } from '@/common/idempotency';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ServerTrackingService } from '../tracking/server-tracking.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
    private serverTrackingService: ServerTrackingService,
  ) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @IdempotentPayment('payment-intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'Request with this idempotency key is being processed' })
  async createPaymentIntent(
    @Request() req: any,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    const { amount, currency = 'usd', orderId } = createPaymentIntentDto;

    // Create metadata for the payment intent
    const metadata: Record<string, string> = {
      userId: req.user.id,
    };

    if (orderId) {
      metadata.orderId = orderId;
    }

    return this.paymentsService.createPaymentIntent(amount, currency, metadata);
  }

  @Post('webhook')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      this.logger.warn('Webhook signature missing');
      return { received: false };
    }

    try {
      const event = this.paymentsService.constructWebhookEvent(
        request.rawBody as Buffer,
        signature,
      );

      this.logger.log(`Webhook received: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'payment_intent.canceled':
          this.logger.log(`Payment intent canceled: ${event.data.object.id}`);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error', error);
      return { received: false };
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata?.orderId;
    const userId = paymentIntent.metadata?.userId;

    if (orderId) {
      try {
        // Update order status to PROCESSING and store payment details
        await this.ordersService.updateOrderPayment(
          orderId,
          paymentIntent.id,
          paymentIntent.payment_method_types?.[0] || 'card',
        );

        this.logger.log(
          `Order ${orderId} updated to PROCESSING with payment ${paymentIntent.id}`,
        );

        // Track purchase event (async, don't block order processing)
        if (userId && this.serverTrackingService.isEnabled()) {
          this.trackPurchase(orderId, userId, paymentIntent).catch((error) => {
            this.logger.error('Failed to track purchase:', error);
            // Don't throw error - tracking failure shouldn't block order processing
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to update order ${orderId} after payment success`,
          error,
        );
      }
    } else {
      this.logger.warn(
        `Payment ${paymentIntent.id} succeeded but no orderId in metadata`,
      );
    }
  }

  private async trackPurchase(orderId: string, userId: string, paymentIntent: any) {
    try {
      // Fetch order details
      const order = await this.ordersService.findById(orderId);
      if (!order) {
        this.logger.warn(`Order ${orderId} not found for purchase tracking`);
        return;
      }

      // Prepare items for tracking
      const items = (order.items || []).map((item: any) => ({
        id: item.productId || item.product?.id,
        name: item.product?.name,
        quantity: item.quantity,
        price: parseFloat(item.price?.toString() || '0'),
      }));

      // Track the purchase
      // Note: User details and IP/UA from webhook aren't accurate
      // In a production system, consider storing this data during checkout
      await this.serverTrackingService.trackPurchase({
        userId,
        orderId,
        value: order.total,
        currency: 'USD', // Using default currency
        items,
        numItems: items.length,
      });

      this.logger.log(`Purchase tracked for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Error tracking purchase for order ${orderId}:`, error);
      throw error;
    }
  }

  private async handlePaymentFailure(paymentIntent: any) {
    this.logger.error(`Payment failed: ${paymentIntent.id}`);

    const orderId = paymentIntent.metadata?.orderId;

    if (orderId) {
      try {
        // Log payment failure but don't change order status yet
        // In a real app, you might want to create a PAYMENT_FAILED status
        this.logger.log(
          `Payment failed for order ${orderId}: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
        );

        // Optionally, you could store the failure reason in the order
        // For now, we just log it
      } catch (error) {
        this.logger.error(
          `Failed to process payment failure for order ${orderId}`,
          error,
        );
      }
    }
  }

  @Post('paypal/webhook')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PayPal webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handlePayPalWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ) {
    try {
      // Verify webhook signature
      const isValid = await this.paymentsService.verifyPayPalWebhook(headers, body);
      if (!isValid) {
        this.logger.warn('PayPal webhook signature verification failed');
        return { received: false, error: 'Invalid signature' };
      }

      this.logger.log(`PayPal webhook received: ${body.event_type}`);

      // Handle different event types
      switch (body.event_type) {
        case 'CHECKOUT.ORDER.APPROVED':
          await this.handlePayPalOrderApproved(body.resource);
          break;

        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePayPalCaptureCompleted(body.resource);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePayPalCaptureDenied(body.resource);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePayPalRefunded(body.resource);
          break;

        case 'CHECKOUT.ORDER.COMPLETED':
          await this.handlePayPalOrderCompleted(body.resource);
          break;

        case 'PAYMENT.CAPTURE.REVERSED':
          await this.handlePayPalReversed(body.resource);
          break;

        default:
          this.logger.log(`Unhandled PayPal event type: ${body.event_type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('PayPal webhook error', error);
      return { received: false };
    }
  }

  private async handlePayPalOrderApproved(resource: any) {
    this.logger.log(`PayPal order approved: ${resource.id}`);
    // Order is approved but not yet captured
    // This is the point where the customer has approved the payment
    // The actual capture should be triggered from the frontend
  }

  private async handlePayPalCaptureCompleted(resource: any) {
    this.logger.log(`PayPal capture completed: ${resource.id}`);

    // Get the order ID from custom_id or invoice_id
    const orderId = resource.custom_id || resource.invoice_id;

    if (orderId) {
      try {
        // Update order status to PROCESSING
        await this.ordersService.updateOrderPayment(
          orderId,
          resource.id,
          'paypal',
        );

        this.logger.log(
          `Order ${orderId} updated to PROCESSING with PayPal capture ${resource.id}`,
        );

        // Get supplementary data for tracking
        const supplementaryData = resource.supplementary_data?.related_ids;
        const payerId = supplementaryData?.payer_id || resource.payer?.payer_id;

        if (payerId) {
          // Track purchase (async)
          const order = await this.ordersService.findById(orderId);
          if (order && order.userId && this.serverTrackingService.isEnabled()) {
            const items = (order.items || []).map((item: any) => ({
              id: item.productId || item.product?.id,
              name: item.product?.name,
              quantity: item.quantity,
              price: parseFloat(item.price?.toString() || '0'),
            }));

            this.serverTrackingService.trackPurchase({
              userId: order.userId,
              orderId,
              value: order.total,
              currency: resource.amount?.currency_code || 'USD',
              items,
              numItems: items.length,
            }).catch(e => this.logger.error('Failed to track PayPal purchase', e));
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to update order ${orderId} after PayPal capture`,
          error,
        );
      }
    } else {
      this.logger.warn(
        `PayPal capture ${resource.id} completed but no orderId found`,
      );
    }
  }

  private async handlePayPalCaptureDenied(resource: any) {
    this.logger.error(`PayPal capture denied: ${resource.id}`);
    const orderId = resource.custom_id || resource.invoice_id;

    if (orderId) {
      this.logger.error(
        `PayPal capture denied for order ${orderId}: ${resource.status_details?.reason || 'Unknown reason'}`,
      );
    }
  }

  private async handlePayPalRefunded(resource: any) {
    this.logger.log(`PayPal refund processed: ${resource.id}`);
    // Handle refund - update order status or create refund record
    const orderId = resource.custom_id || resource.invoice_id;

    if (orderId) {
      try {
        this.logger.log(`Refund processed for order ${orderId}: ${resource.amount?.value} ${resource.amount?.currency_code}`);
        // You could update the order status or create a refund record here
      } catch (error) {
        this.logger.error(`Failed to process refund for order ${orderId}`, error);
      }
    }
  }

  private async handlePayPalOrderCompleted(resource: any) {
    this.logger.log(`PayPal order completed: ${resource.id}`);
    // This fires when the entire order flow is complete
    // Similar handling to capture completed
  }

  private async handlePayPalReversed(resource: any) {
    this.logger.error(`PayPal payment reversed (chargeback): ${resource.id}`);
    const orderId = resource.custom_id || resource.invoice_id;

    if (orderId) {
      // This is a chargeback situation - may need to flag the order
      this.logger.error(`Chargeback/reversal for order ${orderId}`);
    }
  }
}
