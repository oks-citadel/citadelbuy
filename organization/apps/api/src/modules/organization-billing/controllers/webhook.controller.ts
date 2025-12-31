import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from '../services/stripe.service';
import { InvoiceService } from '../services/invoice.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import Stripe from 'stripe';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle Stripe webhook events
   * This endpoint receives webhook events from Stripe for subscription and invoice updates
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger as this is for Stripe only
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature',
  })
  async handleStripeWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature and construct event
      event = this.stripeService.constructWebhookEvent(
        request.body as Buffer,
        signature,
      );
    } catch (error: any) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      // Handle different event types
      switch (event.type) {
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleSubscriptionTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook event ${event.type}`, error);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle invoice.paid event
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Processing invoice.paid event: ${invoice.id}`);

    const customerId = invoice.customer as string;

    // Find billing record by Stripe customer ID
    const billing = await this.prisma.organizationBilling.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!billing) {
      this.logger.warn(`No billing record found for customer: ${customerId}`);
      return;
    }

    // Find or create invoice record
    const invoiceRecord = await this.prisma.organizationInvoice.findFirst({
      where: { stripeInvoiceId: invoice.id },
    });

    if (invoiceRecord) {
      // Mark existing invoice as paid
      await this.invoiceService.markInvoicePaid(invoiceRecord.id);
    } else {
      // Create new invoice record
      const invoiceNumber = `INV-${Date.now()}`;
      await this.prisma.organizationInvoice.create({
        data: {
          billingId: billing.id,
          stripeInvoiceId: invoice.id,
          number: invoiceNumber,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'paid',
          paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
          pdfUrl: invoice.invoice_pdf || undefined,
          description: invoice.description || 'Subscription payment',
        },
      });
    }

    this.logger.log(`Invoice marked as paid: ${invoice.id}`);
  }

  /**
   * Handle invoice.payment_failed event
   * CRITICAL: This now revokes access to prevent free usage after payment failure
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Processing invoice.payment_failed event: ${invoice.id}`);

    const customerId = invoice.customer as string;

    // Find billing record with organization
    const billing = await this.prisma.organizationBilling.findFirst({
      where: { stripeCustomerId: customerId },
      include: { organization: true },
    });

    if (!billing) {
      this.logger.warn(`No billing record found for customer: ${customerId}`);
      return;
    }

    // Update billing status to past_due
    await this.prisma.organizationBilling.update({
      where: { id: billing.id },
      data: {
        status: 'past_due',
        // Set access revocation timestamp for grace period tracking
        accessRevokedAt: new Date(),
      },
    });

    // CRITICAL: Revoke premium feature access
    // Disable API keys for the organization
    await this.prisma.apiKey.updateMany({
      where: {
        organizationId: billing.organizationId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Payment failed - subscription past due',
      },
    });

    // Update organization to restrict access
    await this.prisma.organization.update({
      where: { id: billing.organizationId },
      data: {
        // Downgrade to free tier limits
        planTier: 'FREE',
        featuresEnabled: [],
      },
    });

    this.logger.warn(
      `ACCESS REVOKED: Organization ${billing.organizationId} downgraded due to payment failure. ` +
      `Customer: ${customerId}, Invoice: ${invoice.id}`
    );
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing subscription.created event: ${subscription.id}`);

    const customerId = subscription.customer as string;

    // Update billing record with subscription info
    await this.prisma.organizationBilling.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    this.logger.log(`Subscription created: ${subscription.id}`);
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing subscription.updated event: ${subscription.id}`);

    // Update billing record
    await this.prisma.organizationBilling.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    this.logger.log(`Subscription updated: ${subscription.id}`);
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing subscription.deleted event: ${subscription.id}`);

    // Update billing record
    await this.prisma.organizationBilling.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'cancelled',
      },
    });

    this.logger.log(`Subscription cancelled: ${subscription.id}`);
  }

  /**
   * Handle customer.subscription.trial_will_end event
   */
  private async handleSubscriptionTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Processing subscription.trial_will_end event: ${subscription.id}`);

    // You can implement notification logic here
    // For example, send an email to the organization about the trial ending

    this.logger.log(`Trial ending soon for subscription: ${subscription.id}`);
  }

  /**
   * Handle payment_method.attached event
   */
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    this.logger.log(`Processing payment_method.attached event: ${paymentMethod.id}`);

    if (!paymentMethod.customer) {
      return;
    }

    const customerId = paymentMethod.customer as string;

    // Update billing record with payment method
    await this.prisma.organizationBilling.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        paymentMethodId: paymentMethod.id,
      },
    });

    this.logger.log(`Payment method attached: ${paymentMethod.id}`);
  }

  /**
   * Handle payment_method.detached event
   */
  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    this.logger.log(`Processing payment_method.detached event: ${paymentMethod.id}`);

    // Clear payment method from billing records
    await this.prisma.organizationBilling.updateMany({
      where: { paymentMethodId: paymentMethod.id },
      data: {
        paymentMethodId: null,
      },
    });

    this.logger.log(`Payment method detached: ${paymentMethod.id}`);
  }
}
